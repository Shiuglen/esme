// La puerta de los módulos, montada en la app.
//
// El kit trae el motor (la cápsula, la puerta, el juez); la app trae lo que el
// motor no puede saber: dónde viven los módulos, dónde está el libro de los
// permisos y cuál es la raíz de confianza congelada. A partir de ahí, la app y
// la terminal usan la MISMA puerta: no hay dos caminos.
import { app } from 'electron'
import { join } from 'node:path'
import { creaRuntimeTienda } from 'esme-platform/tienda/modulos'
import type { RuntimeModulos } from 'esme-platform/core/modulos/api'
import type { MenteViva } from 'esme-platform/core/ipc/mind-schema-types'
import { CLAVE_RAIZ_TIENDA } from '../claves'
import type { ClienteCerebro } from '../mente/cliente'
import { menteViva } from '../mente/viva'

/** La Tienda pública (los módulos se firman y se firman aquí). */
export const URL_TIENDA = 'https://raw.githubusercontent.com/Shiuglen/esme-tienda/main'

const datos = () => app.getPath('userData')

/** Dónde viven los módulos instalados (la app no los mete en el repo). */
export const dirModulos = () => join(datos(), 'modulos')

/** El libro de los permisos: lo que la persona ha concedido, módulo a módulo. */
export const rutaPermisos = () => join(datos(), 'modulos', 'consentimientos.json')

let cliente: ClienteCerebro | null = null

/** El Tálamo de ahora mismo (o ninguno, si la mente está apagada). */
export const ponCerebro = (c: ClienteCerebro | null): void => { cliente = c }

/**
 * La mente que ve el módulo. Si la mente está apagada, lo dice: un módulo sin
 * a quién preguntar recibe un error claro, no un recuerdo inventado.
 */
const mentePuente: MenteViva = {
  recall: async (q, b) => {
    if (!cliente) throw new Error('tu mente está apagada: no hay a quién preguntar')
    return menteViva(cliente).recall(q, b)
  },
  remember: async (t, k) => {
    if (!cliente) throw new Error('tu mente está apagada: no hay a quién preguntar')
    return menteViva(cliente).remember!(t, k)
  },
  rumbo: async () => {
    if (!cliente) throw new Error('tu mente está apagada: no hay a quién preguntar')
    return menteViva(cliente).rumbo!()
  },
}

let runtime: RuntimeModulos | null = null

/** La puerta, abierta una sola vez (los workers son caros). */
export const runtimeModulos = (): RuntimeModulos => {
  if (!runtime) {
    runtime = creaRuntimeTienda({
      dirModulos: dirModulos(),
      rutaPermisos: rutaPermisos(),
      pubRaiz: CLAVE_RAIZ_TIENDA,
      baseUrl: URL_TIENDA,
      mente: mentePuente,
    })
  }
  return runtime
}

/** Cierra los workers vivos (al salir de la app). */
export const cierraModulos = async (): Promise<void> => {
  if (!runtime) return
  await runtime.cierra()
  runtime = null
}
