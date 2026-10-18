import { describe, expect, it } from 'vitest'
import { ESCENAS, ESCENA_IDS, propsDeEscena } from './escenas'
import { PIEL_BASE, validarPiel } from './piel'

const paleta = { acento: '#7c5cff', texto: '#efeaff', fondo: '#120f1d', superficie: '#1a1628' }

describe('las escenas: fondos vivos que son parte de la piel', () => {
  it('hay muchas, cada una con su nombre en español y su forma de cargarse', () => {
    expect(ESCENA_IDS.length).toBeGreaterThanOrEqual(20)
    for (const id of ESCENA_IDS) { expect(ESCENAS[id].nombre).toMatch(/^[A-ZÁÉÍÓÚÑ]/); expect(typeof ESCENAS[id].cargar).toBe('function') }
  })
  it('todas se tiñen con tu piel: el acento llega a cada escena', () => {
    for (const id of ESCENA_IDS) expect(JSON.stringify(propsDeEscena(id, paleta)).toLowerCase(), id).toContain('7c5cff')
  })
  it('una piel puede llevar cualquier escena; lo que no existe se rechaza', () => {
    expect(PIEL_BASE.escena).toBe('velo')
    expect(validarPiel({ escena: 'seda' }).ok).toBe(true)
    expect(validarPiel({ escena: 'volcan' }).ok).toBe(false)
  })
  it('la presencia de Esme también se elige', () => {
    expect(PIEL_BASE.presencia).toBe('orbe')
    expect(validarPiel({ presencia: 'ninguna' }).ok).toBe(true)
    expect(validarPiel({ presencia: 'dragon' }).ok).toBe(false)
  })
})
