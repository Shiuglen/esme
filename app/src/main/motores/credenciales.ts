// El puente de llaves: los motores del registro piden credenciales; las tuyas ya viven cifradas en el llavero.
// La llave NUNCA se escribe en disco: el ajuste del motor solo nombra el env, y el Taller lo inyecta al lanzarlo.
// Los ajustes de cada motor nacen en territorio propio de Esme (userData/motores/...), sin tocar tu casa.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export type CredencialesMotor = { env: Record<string, string>; argsExtra: string[]; nota: string } | null

const BASE_URL_OPENROUTER = 'https://openrouter.ai/api/v1'
const escritos = new Set<string>()

/** Los ajustes de Qwen Code en territorio de Esme (QWEN_HOME): OpenRouter como puerta, la llave por env. */
export function ajustesQwen(carpeta: string, modelo = 'poolside/laguna-s-2.1:free'): void {
  if (escritos.has(carpeta)) return
  mkdirSync(carpeta, { recursive: true })
  const ajustes = {
    modelProviders: {
      openai: [{
        id: modelo,
        name: `Qwen3 Coder (OpenRouter · ${modelo})`,
        baseUrl: BASE_URL_OPENROUTER,
        description: 'Conectado por el Taller de Esme: tu llave del llavero corre este motor',
        envKey: 'OPENROUTER_API_KEY',
      }],
    },
    security: { auth: { selectedType: 'openai' } },
    model: { name: modelo },
  }
  writeFileSync(join(carpeta, 'settings.json'), JSON.stringify(ajustes, null, 2))
  escritos.add(carpeta)
}

type Llavero = (id: 'openrouter') => string | undefined

/** La credencial que un motor del registro necesita, tejida con tu llavero. null si le falta la llave. */
export function credencialesDe(id: string, llavero: Llavero, carpetaMotores: string): CredencialesMotor {
  const llave = llavero('openrouter')
  if (llave && id === 'qwen-code') {
    const carpeta = join(carpetaMotores, 'qwen-code')
    ajustesQwen(carpeta)
    return { env: { OPENROUTER_API_KEY: llave, QWEN_HOME: carpeta }, argsExtra: [], nota: 'conecta con tu OpenRouter' }
  }
  return null
}
