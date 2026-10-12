import { describe, expect, it } from 'vitest'
import { cicloLuz, mezclar } from './luz'

describe('mezclar', () => {
  it('mezcla dos colores hex en rgb', () => {
    expect(mezclar('#000000', '#ffffff', 0.5)).toBe('rgb(128 128 128)')
    expect(mezclar('#5ef0d4', '#6cc6ff', 0)).toBe('rgb(94 240 212)')
    expect(mezclar('#5ef0d4', '#6cc6ff', 1)).toBe('rgb(108 198 255)')
  })
})

describe('cicloLuz', () => {
  const tonos: [string, string, string] = ['#000000', '#808080', '#ffffff']
  it('recorre los tres tonos de luz en un ciclo y vuelve al principio', () => {
    expect(cicloLuz(tonos, 0)).toBe('rgb(0 0 0)')
    expect(cicloLuz(tonos, 1 / 4)).toBe('rgb(128 128 128)')
    expect(cicloLuz(tonos, 1 / 2)).toBe('rgb(255 255 255)')
    expect(cicloLuz(tonos, 3 / 4)).toBe('rgb(128 128 128)')
    expect(cicloLuz(tonos, 1)).toBe('rgb(0 0 0)')
  })
})
