import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { servirNavegador } from './servidor'
import { Navegador, type Ventana } from './navegador'

/** El Python del cerebro: si no está (o no es este equipo), la prueba se salta. */
const PY = process.env.ESME_PYTHON ?? '/home/sakai/Daimon/.venv/bin/python'
const RAIZ = fileURLToPath(new URL('../../../../', import.meta.url))
const correr = (args: string[], env: NodeJS.ProcessEnv) => new Promise<string>((ok, mal) => {
  execFile(PY, args, { env, encoding: 'utf8' }, (e, salida) => (e ? mal(e) : ok(salida)))
})

describe('el circuito entero: la mente habla con el navegador de la app', () => {
  it.skipIf(!existsSync(PY))('el cliente del cerebro abre la puerta de la app y lee la página', async () => {
    const v: Ventana = {
      loadURL: async () => {},
      executeJavaScript: async () => ({ url: 'https://x.com', titulo: 'X', texto: 'hola mundo', botones: ['Ir'] }),
      isDestroyed: () => false,
      close: () => {},
      url: () => 'https://x.com/',
    }
    const nav = new Navegador(() => v)
    const puerta = await servirNavegador(nav, 'tok')
    try {
      const salida = await correr(['-c', `
import sys
sys.path.insert(0, ${JSON.stringify(RAIZ)})
from daimon.navegador import ClienteNavegador, en_palabras
print(en_palabras(ClienteNavegador().abrir("https://x.com")))
`], { ...process.env, ESME_NAVEGADOR_URL: puerta.url, ESME_NAVEGADOR_TOKEN: 'tok' })
      expect(salida).toContain('Página: X')
      expect(salida).toContain('hola mundo')
      expect(salida).toContain('clic en «Ir»')
    } finally { puerta.cerrar() }
  })
})
