import { describe, it, expect } from 'vitest'
import { cuentasDe, n, puedeMirar, rutaLimpia } from './espejo-cuentas'

describe('el espejo', () => {
  it('las cuentas dicen lo que se ve y lo que no', () => {
    expect(cuentasDe({ canales: 122, funciones: 1264, desconocidos: 11548, added: 179 }))
      .toEqual(['122 canales IPC', '1.264 funciones', '11.548 cosas que no se pudo ver', '179 recuerdos en la mente'])
  })

  it('lo que no viene, no se cuenta (nunca un 0 inventado)', () => {
    expect(cuentasDe({})).toEqual([])
    expect(cuentasDe({ canales: 0 })).toEqual(['0 canales IPC'])
  })

  it('un binario se cuenta con sus cuentas, no con las de una app', () => {
    expect(cuentasDe({ clase: 'nativo', segmentos: 34, procedimientos: 134, cadenas: 132, added: 179 }))
      .toEqual(['34 segmentos', '134 procedimientos', '132 cadenas', '179 recuerdos en la mente'])
  })

  it('los números se escriben como los escribe una persona', () => {
    expect(n(1264)).toBe('1.264')
    expect(n(11548)).toBe('11.548')
    expect(n(999)).toBe('999')
    expect(n(0)).toBe('0')
  })

  it('sin programa no se mira nada', () => {
    expect(puedeMirar('', false)).toBe(false)
    expect(puedeMirar('   ', false)).toBe(false)
    expect(puedeMirar('/app/out', false)).toBe(true)
    expect(puedeMirar('/app/out', true)).toBe(false)   // ya está mirando
  })

  it('la ruta se limpia (los espacios de más no son parte del nombre)', () => {
    expect(rutaLimpia('  /app/out  ')).toBe('/app/out')
  })
})
