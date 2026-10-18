import { describe, expect, it } from 'vitest'
import { codigoAPiel, pielACodigo } from './compartir'
import { PIEL_BASE } from './piel'
import { PIELES_CASA } from './pieles-casa'

describe('compartir pieles: tu diseño entero en un código', () => {
  it('ida y vuelta: el código devuelve exactamente la misma piel', () => {
    for (const p of PIELES_CASA) {
      const r = codigoAPiel(pielACodigo(p))
      expect(r.ok && r.piel, p.nombre).toEqual(p)
    }
  })
  it('se pega aunque venga con espacios o saltos de línea', () => {
    const c = pielACodigo(PIEL_BASE)
    expect(codigoAPiel(`  ${c.slice(0, 30)}\n${c.slice(30)}  `).ok).toBe(true)
  })
  it('un código ajeno se valida como cualquier piel: lo que no existe se rechaza con su motivo', () => {
    const malo = 'ESME-PIEL-' + Buffer.from(JSON.stringify({ ...PIEL_BASE, fondo: 'video' })).toString('base64url')
    const r = codigoAPiel(malo)
    expect(r.ok).toBe(false); expect(!r.ok && r.motivo).toMatch(/fondo/)
  })
  it('lo que no es un código, o es enorme, se rechaza sin romperse', () => {
    for (const x of ['', 'hola', 'ESME-PIEL-%%%', 'ESME-PIEL-' + 'A'.repeat(70_000)]) expect(codigoAPiel(x).ok).toBe(false)
  })
})

describe('la superficie es una pieza más (el vidrio es solo una opción)', () => {
  it('hay al menos seis superficies y el vidrio es la de por defecto', async () => {
    const { PIEZAS, PIEZAS_BASE } = await import('./piezas')
    expect(PIEZAS.superficie.variantes.map((v) => v.id)).toEqual(['vidrio', 'esmerilado', 'papel', 'neon', 'clay', 'brutal'])
    expect(PIEZAS_BASE.superficie).toBe('vidrio')
  })
})
