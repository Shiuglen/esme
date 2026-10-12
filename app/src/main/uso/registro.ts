// Registro de uso (JSONL solo-añadir), coste, presupuesto con avisos y previsión de cuotas.
import { appendFileSync, readFileSync, existsSync, openSync, readSync, closeSync, statSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { ModeloCatalogo } from '../catalogo/modelsdev'

export type Consumo = { ts: number; proveedor: string; modelo: string; entrada: number; salida: number; cacheLectura?: number; cacheEscritura?: number
  ahorradosMemoria?: number; nivel?: 'alto' | 'medio' | 'bajo'; origen: 'chat' | 'taller' | 'router' | 'arena'; tarea?: string }
type Precio = Pick<ModeloCatalogo, 'coste'>

const n = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0)

export function costeDe(c: Consumo, m?: Precio): number {
  if (!m) return 0
  const k = m.coste
  const usd = (n(c.entrada) * n(k.entrada) + n(c.salida) * n(k.salida)
    + n(c.cacheLectura) * n(k.cacheLectura ?? k.entrada) + n(c.cacheEscritura) * n(k.cacheEscritura ?? k.entrada)) / 1e6
  return Number.isFinite(usd) ? usd : 0
}

const dia = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const tokensDe = (c: Consumo) => n(c.entrada) + n(c.salida) + n(c.cacheLectura) + n(c.cacheEscritura)

export class RegistroUso {
  constructor(private archivo: string) {}
  private terminaEnSalto(): boolean {
    try { const t = statSync(this.archivo).size; if (!t) return true; const fd = openSync(this.archivo, 'r'); const b = Buffer.alloc(1); readSync(fd, b, 0, 1, t - 1); closeSync(fd); return b[0] === 10 } catch { return true }
  }
  anotar(c: Consumo): void {
    mkdirSync(dirname(this.archivo), { recursive: true })
    // Si una línea previa quedó a medias (corte de luz), empieza en línea nueva para no corromper la siguiente.
    appendFileSync(this.archivo, (this.terminaEnSalto() ? '' : '\n') + JSON.stringify(c) + '\n')
  }
  leer(desde = -Infinity, hasta = Infinity): Consumo[] {
    if (!existsSync(this.archivo)) return []
    const out: Consumo[] = []
    for (const l of readFileSync(this.archivo, 'utf8').split('\n')) {
      if (!l.trim()) continue
      try { const c = JSON.parse(l) as Consumo; if (c && typeof c.ts === 'number' && c.ts >= desde && c.ts <= hasta) out.push(c) } catch { /* línea corrupta */ }
    }
    return out
  }
  resumen(o: { desde: number; hasta: number; precio: (proveedor: string, modelo: string) => Precio | undefined }) {
    let costeUSD = 0, tokens = 0, ahorradosMemoria = 0
    const pm = new Map<string, { proveedor: string; modelo: string; costeUSD: number; tokens: number; llamadas: number }>()
    const pd = new Map<string, { dia: string; costeUSD: number; tokens: number }>()
    for (const c of this.leer(o.desde, o.hasta)) {
      const u = costeDe(c, o.precio(c.proveedor, c.modelo)), t = tokensDe(c)
      costeUSD += u; tokens += t; ahorradosMemoria += n(c.ahorradosMemoria)
      const km = `${c.proveedor}\u0000${c.modelo}`
      const m = pm.get(km) ?? { proveedor: c.proveedor, modelo: c.modelo, costeUSD: 0, tokens: 0, llamadas: 0 }
      m.costeUSD += u; m.tokens += t; m.llamadas++; pm.set(km, m)
      const kd = dia(c.ts), d = pd.get(kd) ?? { dia: kd, costeUSD: 0, tokens: 0 }
      d.costeUSD += u; d.tokens += t; pd.set(kd, d)
    }
    return { costeUSD, tokens, ahorradosMemoria,
      porModelo: [...pm.values()].sort((a, b) => b.costeUSD - a.costeUSD),
      porDia: [...pd.values()].sort((a, b) => a.dia.localeCompare(b.dia)) }
  }
}

export type Presupuesto = { diarioUSD?: number; mensualUSD?: number; avisos: number[] }

export function evaluarPresupuesto(gastoHoy: number, gastoMes: number, p: Presupuesto):
  { estado: 'ok' | 'aviso' | 'limite'; umbral?: number; cual?: 'diario' | 'mensual' } {
  const umbrales = [...new Set([...p.avisos, 1])].sort((a, b) => a - b)
  let mejor: { umbral: number; cual: 'diario' | 'mensual' } | undefined
  for (const [cual, gasto, tope] of [['diario', gastoHoy, p.diarioUSD], ['mensual', gastoMes, p.mensualUSD]] as const) {
    if (!tope || tope <= 0) continue
    const frac = n(gasto) / tope
    const u = umbrales.filter(x => frac >= x).pop()
    if (u !== undefined && (!mejor || u > mejor.umbral)) mejor = { umbral: u, cual }
  }
  if (!mejor) return { estado: 'ok' }
  return { estado: mejor.umbral >= 1 ? 'limite' : 'aviso', ...mejor }
}

const HORA = 3600e3

export function preverCuota(muestras: { ts: number; restante: number }[], reinicio?: number):
  { ritmoPorHora: number; agotaEn?: number; llegaAlReinicio: boolean } {
  const ms = [...muestras].sort((a, b) => a.ts - b.ts)
  const sinRitmo = { ritmoPorHora: 0, agotaEn: undefined, llegaAlReinicio: true }
  if (ms.length < 2) return sinRitmo
  const k = ms.length, mx = ms.reduce((s, m) => s + m.ts, 0) / k, my = ms.reduce((s, m) => s + m.restante, 0) / k
  const sxx = ms.reduce((s, m) => s + (m.ts - mx) ** 2, 0), sxy = ms.reduce((s, m) => s + (m.ts - mx) * (m.restante - my), 0)
  if (sxx === 0) return sinRitmo
  const pendiente = sxy / sxx            // fracción por ms (negativa si gasta)
  const ritmoPorHora = -pendiente * HORA
  if (!(ritmoPorHora > 0)) return { ritmoPorHora, agotaEn: undefined, llegaAlReinicio: true }
  const agotaEn = Math.max(mx - my / pendiente, ms[k - 1].ts)
  return { ritmoPorHora, agotaEn, llegaAlReinicio: reinicio !== undefined && agotaEn >= reinicio }
}
