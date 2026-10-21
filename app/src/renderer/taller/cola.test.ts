import { describe, expect, it } from 'vitest'
import { Cola, type Entrada, type Programador } from './cola'

/** Un navegador de mentira: los fotogramas no llegan solos (la ventana puede estar oculta). */
function programa() {
  const fotogramas = new Map<number, () => void>()
  const relojes = new Map<number, { ms: number; tarea: () => void }>()
  let n = 0
  const p: Programador = {
    fotograma: (tarea) => { const id = ++n; fotogramas.set(id, tarea); return id },
    reloj: (tarea, ms) => { const id = ++n; relojes.set(id, { ms, tarea }); return id },
    cancelarFotograma: (id) => { fotogramas.delete(id) },
    cancelarReloj: (id) => { relojes.delete(id) },
  }
  return {
    p,
    /** Pasa el fotograma: el navegador avisa. */
    pintar: () => { const t = [...fotogramas.values()].pop(); t?.() },
    /** Pasa el tiempo: el reloj se dispara solo. */
    esperar: () => { const r = [...relojes.values()].pop(); r?.tarea() },
    pendientes: () => fotogramas.size + relojes.size,
  }
}

describe('la cola de eventos del Taller', () => {
  it('suelta lo que juntó en un lote', () => {
    const m = programa()
    const lotes: Entrada<string>[][] = []
    const c = new Cola<string>(m.p, (l) => lotes.push(l))
    c.meter('a', 'uno'); c.meter('a', 'dos'); c.meter('b', 'tres')
    expect(lotes).toHaveLength(0)          // aún no ha pasado nada
    m.pintar()
    expect(lotes).toHaveLength(1)
    expect(lotes[0].map((x) => x.e)).toEqual(['uno', 'dos', 'tres'])
    expect(c.largo).toBe(0)
  })

  it('la suelta aunque no llegue ningún fotograma (ventana oculta)', () => {
    const m = programa()
    const lotes: Entrada<string>[][] = []
    const c = new Cola<string>(m.p, (l) => lotes.push(l))
    c.meter('a', 'uno')
    expect(lotes).toHaveLength(0)
    m.esperar()                            // el reloj: el tiempo pasa aunque no haya fotogramas
    expect(lotes).toHaveLength(1)
    expect(lotes[0][0].e).toBe('uno')
  })

  it('no crece sin límite: pasado el tope, suelta', () => {
    const m = programa()
    const lotes: Entrada<string>[][] = []
    const c = new Cola<string>(m.p, (l) => lotes.push(l), 10)
    for (let i = 0; i < 25; i++) c.meter('a', `e${i}`)
    expect(lotes).toHaveLength(2)          // soltó al llegar a 10 y al llegar a 20
    expect(lotes[0]).toHaveLength(10)
    expect(lotes[1]).toHaveLength(10)
    expect(c.largo).toBe(5)                 // lo que quedó después del último tope
  })

  it('no deja relojes ni fotogramas colgados al soltar', () => {
    const m = programa()
    const c = new Cola<string>(m.p, () => {})
    c.meter('a', 'uno')
    m.pintar()
    expect(m.pendientes()).toBe(0)
  })

  it('suelta vacío sin hacer nada (nadie espera un lote en blanco)', () => {
    const m = programa()
    const lotes: Entrada<string>[][] = []
    const c = new Cola<string>(m.p, (l) => lotes.push(l))
    c.soltar()
    expect(lotes).toHaveLength(0)
  })
})
