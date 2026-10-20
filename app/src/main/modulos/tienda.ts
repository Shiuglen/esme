// Los módulos que publica la Tienda: el índice firmado, verificado con la raíz
// congelada. Si la firma no vale, no hay catálogo: la app no enseña nada que
// no pueda probar, y no instala nada que no pueda probar.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { confiaIndexChain } from 'esme-platform/tienda/rotacion'
import { CLAVE_RAIZ_TIENDA } from '../claves'
import { URL_TIENDA } from './runtime'

export type ModuloPublicado = {
  id: string
  version: string
  artefacto?: string
  bytes?: number
}

export type ResultadoDisponibles =
  | { ok: true; modulos: ModuloPublicado[]; via: 'directa' | 'cadena' }
  | { ok: false; error: string }

const carpeta = (): string => {
  const dir = join(app.getPath('userData'), 'tienda')
  mkdirSync(dir, { recursive: true })
  return dir
}

export const disponibles = async (): Promise<ResultadoDisponibles> => {
  try {
    const indiceTexto = await fetch(`${URL_TIENDA}/index.json`, {
      signal: AbortSignal.timeout(8000),
    }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`el índice respondió ${r.status}`))))
    // el libro de la estirpe: sin él, la raíz sólo avala al firmante directo
    const ledger = await fetch(`${URL_TIENDA}/rotaciones.json`, {
      signal: AbortSignal.timeout(8000),
    })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '')
    const indice = JSON.parse(indiceTexto) as {
      modulos?: Array<{ id: string; version?: string; artefacto?: { tar?: string; bytes?: number } }>
    }
    const rutaLedger = join(carpeta(), 'rotaciones.json')
    writeFileSync(rutaLedger, ledger)
    const confianza = confiaIndexChain(
      indice as Record<string, unknown>,
      CLAVE_RAIZ_TIENDA,
      rutaLedger,
    )
    if (!confianza.ok) {
      return { ok: false, error: 'el índice de la Tienda no viene de la raíz: no hay catálogo que enseñar' }
    }
    return {
      ok: true,
      via: confianza.via === 'cadena' ? 'cadena' : 'directa',
      modulos: (indice.modulos ?? []).map((m) => ({
        id: m.id,
        version: m.version ?? '',
        artefacto: m.artefacto?.tar,
        bytes: m.artefacto?.bytes,
      })),
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'no pude leer la Tienda' }
  }
}
