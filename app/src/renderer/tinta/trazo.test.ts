import { describe, expect, it } from 'vitest'
import { envejecimiento, esGrafito, NIVELES_TINTA, nivelTinta, paletaTinta, radioTrazo } from './trazo'

const paleta = paletaTinta({ fresca: '#000000', vieja: '#ffffff' })
const tintaDe = (dias: number) => paleta[nivelTinta(dias)]
const rojo = (c: string) => Number(c.match(/\d+/)![0])

describe('trazo: la edad de la tinta', () => {
  it('lo de hoy es tinta fresca; lo de hace un año o más, tinta vieja', () => {
    expect(tintaDe(0)).toBe('rgb(0 0 0)')
    expect(tintaDe(365)).toBe('rgb(255 255 255)')
    expect(tintaDe(4000)).toBe('rgb(255 255 255)')
  })
  it('envejece rápido al principio y luego se asienta, como la tinta ferrogálica', () => {
    expect(envejecimiento(7) - envejecimiento(0)).toBeGreaterThan(envejecimiento(365) - envejecimiento(182))
    expect(rojo(tintaDe(30))).toBeLessThan(rojo(tintaDe(90)))
  })
  it('pocos tonos distintos, para que el lienzo pinte los trazos por lotes', () => {
    expect(new Set(paleta).size).toBe(NIVELES_TINTA)
  })
  it('una fecha del futuro (reloj desajustado) cuenta como tinta fresca', () => {
    expect(tintaDe(-3)).toBe('rgb(0 0 0)')
  })
})

describe('trazo: la confianza', () => {
  it('lo que no está verificado es grafito', () => {
    expect(esGrafito(0.4)).toBe(true)
    expect(esGrafito(0.6)).toBe(false)
    expect(esGrafito(1)).toBe(false)
    expect(esGrafito(undefined)).toBe(false)
  })
  it('más confianza, trazo más firme', () => {
    expect(radioTrazo(1)).toBeGreaterThan(radioTrazo(0.8))
    expect(radioTrazo(0.8)).toBeGreaterThan(radioTrazo(0.4))
    expect(radioTrazo(undefined)).toBe(radioTrazo(0.8))
  })
})
