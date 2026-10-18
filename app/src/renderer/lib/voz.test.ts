import { describe, expect, it } from 'vitest'
import { paraDecir, remuestrear } from './voz'

describe('lo que Esme dice en voz alta', () => {
  it('quita el markdown: negritas, títulos, listas y enlaces (se queda con su texto)', () => {
    expect(paraDecir('## Resumen\n**Hoy** terminaste 3 tareas:\n- tests\n- [la portada](https://x.y/z)')).toBe('Resumen. Hoy terminaste 3 tareas: tests. la portada.')
  })
  it('el código no se lee: se avisa de que está en pantalla', () => {
    expect(paraDecir('Mira:\n```ts\nconst a = 1\n```\nY listo.')).toBe('Mira: (te dejo el código en pantalla). Y listo.')
  })
  it('las direcciones web no se deletrean', () => {
    expect(paraDecir('Está en https://github.com/Shiuglen/esme ahora.')).toBe('Está en un enlace ahora.')
  })
  it('una respuesta larga se corta en una frase completa (lo demás se lee en pantalla)', () => {
    const largo = Array.from({ length: 60 }, (_, i) => `Esta es la frase número ${i}.`).join(' ')
    const dicho = paraDecir(largo, 300)
    expect(dicho.length).toBeLessThanOrEqual(340)
    expect(dicho).toMatch(/\. El resto te lo dejo en pantalla\.$/)
  })
})

describe('el audio para el oído', () => {
  it('pasa de 48 kHz a 16 kHz (un tercio de muestras)', () => {
    const a = new Float32Array(48000).map((_, i) => Math.sin(i / 10))
    const b = remuestrear(a, 48000, 16000)
    expect(b.length).toBe(16000)
    expect(b[100]).toBeCloseTo(a[300], 2)
  })
})
