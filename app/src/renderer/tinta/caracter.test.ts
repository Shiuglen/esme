import { describe, expect, it } from 'vitest'
import { curvaDe, muelleCon, type Muelle } from './caracter'
import { PIEL_BASE, validarPiel } from './piel'

// La física de un muelle: ζ < 1 rebota (cuanto más bajo, más), ζ ≥ 1 llega sin pasarse; ω es lo rápido que responde.
const zeta = (m: Muelle) => m.damping / (2 * Math.sqrt(m.stiffness * m.mass))
const omega = (m: Muelle) => Math.sqrt(m.stiffness / m.mass)
const BASE: Muelle = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }

describe('el movimiento tiene carácter (es de la piel)', () => {
  it('«preciso» es el movimiento de siempre: no cambia nada', () => {
    expect(muelleCon('preciso', 'sutil', BASE)).toEqual(BASE)
  })
  it('«pesado» responde despacio y nunca rebota, como algo que pesa', () => {
    const m = muelleCon('pesado', 'sutil', BASE) as Muelle
    expect(zeta(m)).toBeGreaterThanOrEqual(1)
    expect(omega(m)).toBeLessThan(omega(BASE) * 0.7)
  })
  it('«elástico» rebota de verdad', () => {
    expect(zeta(muelleCon('elastico', 'sutil', BASE) as Muelle)).toBeLessThan(0.4)
  })
  it('«magnético» llega antes que el de siempre y se asienta con un pellizco', () => {
    const m = muelleCon('magnetico', 'sutil', BASE) as Muelle
    expect(omega(m)).toBeGreaterThan(omega(BASE) * 1.2)
    expect(zeta(m)).toBeGreaterThan(0.6); expect(zeta(m)).toBeLessThan(0.9)
  })
  it('«lanzado» sale rápido y se pasa un poco por la inercia', () => {
    const m = muelleCon('lanzado', 'sutil', BASE) as Muelle
    expect(omega(m)).toBeGreaterThan(omega(BASE))
    expect(zeta(m)).toBeLessThan(0.65)
  })
  it('con el movimiento en «nada» no se mueve nada, tampoco lo que anima JavaScript', () => {
    expect(muelleCon('elastico', 'nada', BASE)).toEqual({ duration: 0 })
  })
  it('las transiciones de CSS siguen al carácter: el elástico se pasa, el pesado tarda más', () => {
    const pasa = (c: string) => c.match(/[\d.]+/g)!.map(Number).some((n) => n > 1)
    expect(pasa(curvaDe('elastico').curva)).toBe(true)
    expect(pasa(curvaDe('preciso').curva)).toBe(false)
    expect(curvaDe('pesado').factor).toBeGreaterThan(1)
    expect(curvaDe('preciso')).toEqual({ curva: 'cubic-bezier(.16,1,.3,1)', factor: 1 })
  })
})

describe('el carácter es un dato de la piel', () => {
  it('«magnetico» por defecto (nivel dios); lo que no existe se rechaza', () => {
    expect(PIEL_BASE.caracter).toBe('magnetico')
    const r = validarPiel({ caracter: 'pesado' })
    expect(r.ok && r.piel.caracter).toBe('pesado')
    expect(validarPiel({ caracter: 'gelatina' }).ok).toBe(false)
  })
})
