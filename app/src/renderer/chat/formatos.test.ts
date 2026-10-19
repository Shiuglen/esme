import { describe, expect, it } from 'vitest'
import { fmtTokens, fmtUSD, pctContexto } from './formatos'

describe('fmtUSD', () => {
  it('cero es $0 y lo diminuto no se redondea a cero', () => {
    expect(fmtUSD(0)).toBe('$0')
    expect(fmtUSD(0.0004)).toBe('<$0,01')
  })
  it('en español: coma decimal y punto de millares, el símbolo delante como en Latinoamérica', () => {
    expect(fmtUSD(0.126)).toBe('$0,13')
    expect(fmtUSD(4.5)).toBe('$4,50')
    expect(fmtUSD(1234.4)).toBe('$1.234')
  })
  it('nunca NaN', () => { expect(fmtUSD(Number.NaN)).toBe('$0'); expect(fmtUSD(undefined)).toBe('$0') })
})

describe('fmtTokens', () => {
  it('compacta miles y millones', () => {
    expect(fmtTokens(950)).toBe('950')
    expect(fmtTokens(3240)).toBe('3,2 mil')
    expect(fmtTokens(1_250_000)).toBe('1,3 M')
    expect(fmtTokens(Number.NaN)).toBe('0')
  })
})

describe('pctContexto', () => {
  it('porcentaje acotado a 0..100; sin contexto conocido → null', () => {
    expect(pctContexto(50_000, 200_000)).toBe(25)
    expect(pctContexto(300_000, 200_000)).toBe(100)
    expect(pctContexto(10, 0)).toBeNull()
    expect(pctContexto(10, undefined)).toBeNull()
  })
})
