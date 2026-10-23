import { describe, expect, it } from 'vitest'
import { avisoDeParar, cortoMB, filasPresion, fraseCasa, textoConfirmarParado } from './presion'
import type { PresionVista } from '../lib/bridge'

const p = (vista: Partial<PresionVista> = {}): PresionVista => ({
  ts: 0,
  procesos: [
    { pid: 1, rol: 'renderer', rssMB: 500, cpu: 8, parable: false },
    { pid: 2, rol: 'agente', rssMB: 900, cpu: 0.4, parable: true },
    { pid: 3, rol: 'cerebro', rssMB: 700, cpu: 1, parable: false },
  ],
  totalMB: 2100,
  libresMB: 3500,
  swapUsadaMB: 120,
  swapLibreMB: 8000,
  texto: '',
  ...vista,
})

describe('la presión en el Mando', () => {
  it('el peso en palabras: sin pasarse del GB con ruido', () => {
    expect(cortoMB(75)).toBe('75 MB')
    expect(cortoMB(1024)).toBe('1 GB')
    expect(cortoMB(1638)).toBe('1,6 GB')
    expect(cortoMB(0)).toBe('0 MB')
  })

  it('la frase de la columna: lo que come, lo que queda y cuántos agentes', () => {
    expect(fraseCasa(p())).toBe('2,1 GB · libres 3,4 GB · 1 agente')
    expect(fraseCasa(p({ totalMB: 640, procesos: [], libresMB: 0 }))).toBe('640 MB')
  })

  it('las filas van los más gordos arriba y conservan la marca de parable', () => {
    const x = filasPresion(p())
    expect(x.map((f) => f.rol)).toEqual(['agente', 'cerebro', 'renderer'])
    expect(x[0]).toMatchObject({ pid: 2, parable: true })
    expect(x[1]).toMatchObject({ pid: 3, parable: false })
  })

  it('lo que se avisa al parar: los agentes, el navegador, y nunca la casa', () => {
    expect(avisoDeParar('agente')).toContain('tarea se verá interrumpida')
    expect(avisoDeParar('chrome')).toContain('navegador')
    expect(avisoDeParar('cerebro')).toContain('no está permitido')
    expect(textoConfirmarParado('agente', true)).toContain('Parado')
    expect(textoConfirmarParado('cerebro', true)).toContain('no está permitido')
  })
})
