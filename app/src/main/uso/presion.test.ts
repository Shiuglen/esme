import { describe, expect, it } from 'vitest'
import { explicar, medirPresion, pararProceso, rolDe, type Fuente } from './presion'

/** Una fuente de mentira: los procesos y sus medidas, sin tocar /proc. */
function fuente(mapa: Record<number, { cmd: string; rss: number; ticks: number }>): Fuente {
  return {
    pids: () => Object.keys(mapa).map(Number),
    cmdline: (pid) => mapa[pid]?.cmd ?? '',
    rss: (pid) => mapa[pid]?.rss ?? 0,
    ticks: (pid) => mapa[pid]?.ticks ?? 0,
    ahora: () => 1_700_000_000_000,
    meminfo: () => ({ libresMB: 4000, swapUsadaMB: 100, swapLibreMB: 8000 }),
  }
}

describe('la presión de recursos', () => {
  it('reconoce los roles de la casa', () => {
    expect(rolDe('electron --type=renderer --enable-crash-reporter')).toBe('renderer')
    expect(rolDe('electron --type=gpu-process')).toBe('gpu')
    expect(rolDe('/venv/bin/python3 -c from daimon.cli import main')).toBe('cerebro')
    expect(rolDe('node /home/x/.opencode/bin/opencode serve --stdio')).toBe('agente')
    expect(rolDe('sleep 100')).toBe(null)
    expect(rolDe('')).toBe(null)
  })

  it('suma la memoria de los procesos de la casa y ordena por peso', () => {
    const p = medirPresion(fuente({
      10: { cmd: 'electron --type=renderer', rss: 2800, ticks: 100 },
      11: { cmd: 'python3 daimon.cli serve', rss: 700, ticks: 50 },
      12: { cmd: 'sleep 100', rss: 5, ticks: 1 },
    }), 0)
    expect(p.procesos.map((x) => x.rol)).toEqual(['renderer', 'cerebro'])   // el sleep no cuenta
    expect(p.totalMB).toBe(3500)
  })

  it('la CPU sale de comparar dos muestras', () => {
    const f = fuente({ 10: { cmd: 'electron --type=renderer', rss: 100, ticks: 0 } })
    const p = medirPresion(f, 0)
    expect(typeof p.procesos[0].cpu).toBe('number')
    expect(p.procesos[0].cpu).toBeGreaterThanOrEqual(0)
  })

  it('avisa cuando el swap está casi lleno', () => {
    const p = { ts: 0, procesos: [], totalMB: 100, libresMB: 100, swapUsadaMB: 8000, swapLibreMB: 100 }
    expect(explicar(p)).toContain('⚠')
    const q = { ...p, swapLibreMB: 8000 }
    expect(explicar(q)).not.toContain('⚠')
  })

  it('lo dice en palabras: el total, lo libre y los que más pesan', () => {
    const p = medirPresion(fuente({
      10: { cmd: 'electron --type=renderer', rss: 2800, ticks: 0 },
      11: { cmd: 'python3 daimon.cli serve', rss: 700, ticks: 0 },
    }), 0)
    const t = explicar(p)
    expect(t).toContain('3500 MB')
    expect(t).toContain('renderer')
    expect(t).toContain('cerebro')
  })

  it('sabe quién se puede soltar: los agentes y el chrome, no la casa', () => {
    const p = medirPresion(fuente({
      10: { cmd: '/x/opencode@latest serve', rss: 800, ticks: 0 },
      11: { cmd: 'electron --type=renderer', rss: 2800, ticks: 0 },
      12: { cmd: 'python3 daimon.cli serve', rss: 700, ticks: 0 },
      13: { cmd: 'chrome --remote-debugging-port=9222', rss: 300, ticks: 0 },
    }), 0)
    const por = Object.fromEntries(p.procesos.map((x) => [x.rol, x]))
    expect(por['agente'].parable).toBe(true)
    expect(por['chrome'].parable).toBe(true)
    expect(por['renderer'].parable).toBe(false)
    expect(por['cerebro'].parable).toBe(false)
  })

  it('parar: TERM a un agente y, si se extingue, KILL no hace falta', async () => {
    const mapa: Record<number, { cmd: string; rss: number; ticks: number }> = { 77: { cmd: 'node opencode serve', rss: 900, ticks: 0 } }
    const f = fuente(mapa)
    const avisos: number[] = []
    // muere al primer aviso
    const r1 = await pararProceso(77, { fuente: f, avisar: (pid, s) => { avisos.push(s); mapa[pid].rss = 0 } })
    expect(r1).toEqual({ ok: true, rol: 'agente' })
    expect(avisos).toEqual([15])
  })

  it('parar: si aguantas, TERM y después KILL', async () => {
    const mapa: Record<number, { cmd: string; rss: number; ticks: number }> = { 77: { cmd: 'node opencode serve', rss: 900, ticks: 0 } }
    const avisos: number[] = []
    const r = await pararProceso(77, { fuente: fuente(mapa), avisar: (_pid, s) => { avisos.push(s) }, esperaFinMs: 0 })
    expect(r).toEqual({ ok: true, rol: 'agente' })
    expect(avisos).toEqual([15, 9])
  })

  it('parar se niega a tocar lo que ya no es un agente y a pids que no valen', async () => {
    const f = fuente({ 77: { cmd: 'python3 daimon.cli serve', rss: 700, ticks: 0 } })   // es la casa
    const sinNada = fuente({})
    expect((await pararProceso(77, { fuente: f, esperaFinMs: 0 })).ok).toBe(false)      // el cerebro no se para
    expect((await pararProceso(1234, { fuente: sinNada, esperaFinMs: 0 })).ok).toBe(false)   // no está
    expect((await pararProceso(-5, { fuente: f, esperaFinMs: 0 })).ok).toBe(false)
    expect((await pararProceso(1.5, { fuente: f, esperaFinMs: 0 })).ok).toBe(false)
  })
})
