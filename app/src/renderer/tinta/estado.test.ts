import { describe, expect, it } from 'vitest'
import { estadoDeEsme, sonidoPara } from './estado'
import { validarPiel } from './piel'

const base = { escuchando: false, hablando: false, pensando: false, trabajando: 0, esperando: 0 }

describe('en qué estado está Esme (lo que muestra su presencia)', () => {
  it('lo que haces tú manda: si te escucha, escucha; si habla, habla', () => {
    expect(estadoDeEsme({ ...base, escuchando: true, trabajando: 3 })).toBe('escuchando')
    expect(estadoDeEsme({ ...base, hablando: true, pensando: true })).toBe('hablando')
  })
  it('luego pensar, luego lo que te espera, luego lo que trabaja; si no, en reposo', () => {
    expect(estadoDeEsme({ ...base, pensando: true, esperando: 1 })).toBe('pensando')
    expect(estadoDeEsme({ ...base, esperando: 1, trabajando: 2 })).toBe('te-necesita')
    expect(estadoDeEsme({ ...base, trabajando: 2 })).toBe('trabajando')
    expect(estadoDeEsme(base)).toBe('reposo')
  })
})

describe('el sonido de Esme (una pieza más)', () => {
  it('«nada» calla siempre; «avisos» solo suena lo importante; «completo» también al pulsar', () => {
    expect(sonidoPara('pulsar', 'nada')).toBeNull()
    expect(sonidoPara('pulsar', 'avisos')).toBeNull()
    expect(sonidoPara('respuesta', 'avisos')).toBe('notificationPop')
    expect(sonidoPara('pulsar', 'completo')).toBe('clickSoft')
    expect(sonidoPara('error', 'completo')).toBe('errorBuzz')
    expect(sonidoPara('listo', 'avisos')).toBe('successChime')
  })
})

describe('las presencias nuevas', () => {
  it('orbe de voz y cara son válidas', () => {
    expect(validarPiel({ presencia: 'orbe-voz' }).ok).toBe(true)
    expect(validarPiel({ presencia: 'cara' }).ok).toBe(true)
  })
})
