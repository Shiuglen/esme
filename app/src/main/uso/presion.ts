// La presión de recursos: cuánto está comiendo cada proceso, ahora mismo.
//
// La app se cerró una vez por un OOM (13 GB de pico, anotado en el vault del 20-oct) y otra vez
// por el swap lleno. Ninguna de las dos se vio venir: **no había ningún medidor**. MonoCode lo
// tiene desde el 0.15.0 («un indicador de presión de recursos en el pie abre una vista de proceso
// con CPU y memoria»), y su regla es la que conviene: *la memoria que se suelta bajo presión es
// la de las transcripciones, no la del historial*.
//
// Esto es el medidor: un snapshot de los procesos de la casa (la app, el renderer, el GPU, el
// cerebro y los agentes del Taller) con su memoria y su CPU, y el total. Sin él, el consumo es una
// sorpresa; con él, es un número.

import { readFileSync, readdirSync } from 'node:fs'

export type Proceso = {
  pid: number
  rol: string
  rssMB: number
  cpu: number      // porcentaje de un núcleo, medido entre dos muestras
}

export type Presion = {
  ts: number
  procesos: Proceso[]
  totalMB: number
  libresMB: number     // la memoria que el sistema dice que queda
  swapUsadaMB: number
  swapLibreMB: number
}

/** Los roles que se distinguen por la línea de órdenes (a pelo, como hace `medir_reposo.py`). */
export function rolDe(cmd: string): string | null {
  if (!cmd) return null
  if (/--type=renderer/.test(cmd)) return 'renderer'
  if (/--type=gpu-process/.test(cmd)) return 'gpu'
  if (/--type=utility/.test(cmd)) return 'utilidad'
  if (/--type=zygote/.test(cmd)) return 'zygote'
  if (/--ozone-platform|node_modules\/electron\/dist\/electron/.test(cmd) && !/--type=/.test(cmd)) return 'principal'
  if (/daimon\.cli|daimon\/cli/.test(cmd)) return 'cerebro'
  if (/opencode|claude-code|codex|qwen/i.test(cmd)) return 'agente'
  if (/--remote-debugging-port/.test(cmd)) return 'chrome'
  return null
}

/** El consumo de CPU de un proceso (en ticks de reloj); se comparan dos muestras. */
function ticks(pid: number): number {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8')
    // el nombre del proceso va entre paréntesis y puede tener espacios: se parte por el último ')'
    const campos = stat.slice(stat.lastIndexOf(')') + 2).split(' ')
    return Number(campos[11]) + Number(campos[12])   // utime + stime
  } catch { return 0 }
}

function rss(pid: number): number {
  try {
    const s = readFileSync(`/proc/${pid}/status`, 'utf8')
    const m = /VmRSS:\s+(\d+) kB/.exec(s)
    return m ? Number(m[1]) / 1024 : 0
  } catch { return 0 }
}

function cmdline(pid: number): string {
  try { return readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ') } catch { return '' }
}

export type Fuente = {
  pids: () => number[]
  cmdline: (pid: number) => string
  rss: (pid: number) => number
  ticks: (pid: number) => number
  ahora: () => number
  meminfo: () => { libresMB: number; swapUsadaMB: number; swapLibreMB: number }
}

const porDefecto: Fuente = {
  pids: () => readdirSync('/proc').filter((d) => /^\d+$/.test(d)).map(Number),
  cmdline, rss, ticks,
  ahora: () => Date.now(),
  meminfo: () => {
    try {
      const s = readFileSync('/proc/meminfo', 'utf8')
      const n = (k: string) => Number(new RegExp(`^${k}:\\s+(\\d+)`, 'm').exec(s)?.[1] ?? 0) / 1024
      return { libresMB: n('MemAvailable'), swapUsadaMB: n('SwapTotal') - n('SwapFree'), swapLibreMB: n('SwapFree') }
    } catch { return { libresMB: 0, swapUsadaMB: 0, swapLibreMB: 0 } }
  },
}

/**
 * Un snapshot de la presión.
 *
 * La CPU se mide comparando dos muestras de reloj (separadas por `esperaMs`): con una sola
 * muestra no hay porcentaje, y un porcentaje inventado es peor que ninguno.
 */
export function medirPresion(fuente: Fuente = porDefecto, esperaMs = 300): Presion {
  const pids = fuente.pids()
  const antes = new Map<number, number>()
  for (const pid of pids) antes.set(pid, fuente.ticks(pid))
  const t0 = Date.now()
  // la espera se hace aquí (síncrona, pero son milisegundos y es una medida)
  const fin = Date.now() + esperaMs
  while (Date.now() < fin) { /* esperar */ }
  const transcurrido = (Date.now() - t0) / 1000
  const procesos: Proceso[] = []
  for (const pid of pids) {
    const cmd = fuente.cmdline(pid)
    const rol = rolDe(cmd)
    if (!rol) continue
    const a = antes.get(pid) ?? 0
    const b = fuente.ticks(pid)
    const cpu = transcurrido > 0 ? ((b - a) / 100) / transcurrido : 0   // 100 ticks = 1 s
    procesos.push({ pid, rol, rssMB: Math.round(fuente.rss(pid)), cpu: Math.round(cpu * 10) / 10 })
  }
  procesos.sort((a, b) => b.rssMB - a.rssMB)
  const m = fuente.meminfo()
  return {
    ts: fuente.ahora(),
    procesos,
    totalMB: procesos.reduce((s, p) => s + p.rssMB, 0),
    libresMB: Math.round(m.libresMB),
    swapUsadaMB: Math.round(m.swapUsadaMB),
    swapLibreMB: Math.round(m.swapLibreMB),
  }
}

/** La presión, en palabras: lo que un agente (o el creador) necesita para decidir. */
export function explicar(p: Presion): string {
  const L: string[] = []
  L.push(`Presión ahora: ${p.totalMB} MB en los procesos de la casa · memoria libre ${p.libresMB} MB · swap ${p.swapUsadaMB} MB usados de los que quedan ${p.swapLibreMB} MB.`)
  const top = p.procesos.slice(0, 6)
  if (top.length) {
    L.push('Los que más pesan:')
    for (const x of top) L.push(`· ${x.rol} (pid ${x.pid}): ${x.rssMB} MB · ${x.cpu} % de CPU`)
  }
  if (p.swapLibreMB < 512) L.push('⚠ El swap está casi lleno: la máquina va a ir trompiconeando. Lo que se puede soltar es la memoria de las transcripciones, no el historial.')
  return L.join('\n')
}
