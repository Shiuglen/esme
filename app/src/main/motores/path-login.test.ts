import { describe, expect, it } from 'vitest'
import { pathDeSalida, unirPath } from './path-login'

describe('el PATH de tu shell de login (idea de MonoCode, MIT)', () => {
  it('saca el PATH de entre sus marcadores aunque tu .zshrc imprima cosas', () => {
    const salida = 'Bienvenido sakai\n\u001b[32mmise activado\u001b[0m\n__ESME_PATH__/home/u/.local/bin:/usr/bin__ESME_PATH__\nadios\n'
    expect(pathDeSalida(salida)).toBe('/home/u/.local/bin:/usr/bin')
    expect(pathDeSalida('nada útil')).toBeNull()
  })
  it('une los dos PATH sin repetir y respetando el orden (primero el de Esme)', () => {
    expect(unirPath('/usr/bin:/bin', '/home/u/.local/bin:/usr/bin:/home/u/.mise/shims')).toBe('/usr/bin:/bin:/home/u/.local/bin:/home/u/.mise/shims')
    expect(unirPath(undefined, '/a:/b')).toBe('/a:/b')
    expect(unirPath('/a::/b', '')).toBe('/a:/b')
  })
})
