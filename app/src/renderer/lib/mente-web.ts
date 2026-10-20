// La mente desde el navegador: el mismo cliente que usa la app de escritorio.
//
// En la app de escritorio la ventana no habla con el cerebro: pide al proceso principal,
// que lo hace por la puerta y lleva el token. En el navegador no hay proceso principal:
// la página habla **directo** con el cerebro, con el mismo cliente y el mismo contrato
// (`main/mente/cliente.ts`). Por eso la web habla de verdad con la mente y no es una maqueta.
//
// El token es la palabra de la memoria: quien lo tiene puede leerla, así que se guarda
// en el navegador (localStorage) y nunca viaja en la URL ni en un log.
import { ClienteCerebro } from '../../main/mente/cliente'

/** ¿Estamos en la app de escritorio? (aquí no hay puente: hay que mirar la ventana.) */
const enEscritorio = () => typeof window !== 'undefined' && !!window.daimon

export type Conexion = { url: string; token: string }
const CLAVE = 'esme:mente:conexion'

/**
 * La configuración que da el servidor (así se instala una copia privada sin escribir nada):
 * el servidor la pone en la página (`<script>window.__ESME_MENTE__ = {url, token}</script>`).
 *
 * **El token nunca se compila en el bundle**: un token dentro del JavaScript que se sirve es
 * un token publicado. Por eso aquí sólo hay dos caminos: lo que escribió el creador (con su
 * palabra) y lo que da el servidor (su página).
 */
declare global { interface Window { __ESME_MENTE__?: { url: string; token: string } } }

/** La conexión guardada en este navegador (si la hay). */
export function conexionGuardada(): Conexion | null {
  if (enEscritorio()) return null
  const guardada = leerGuardada()
  if (guardada) return guardada
  const delServidor = typeof window !== 'undefined' ? window.__ESME_MENTE__ : undefined
  if (delServidor && typeof delServidor.url === 'string' && typeof delServidor.token === 'string' && delServidor.url && delServidor.token) {
    return { url: delServidor.url.replace(/\/+$/, ''), token: delServidor.token }
  }
  return null
}

/** Lo que escribió el creador en este navegador. */
function leerGuardada(): Conexion | null {
  try {
    const bruto = localStorage.getItem(CLAVE)
    if (!bruto) return null
    const c = JSON.parse(bruto) as Partial<Conexion>
    if (typeof c.url !== 'string' || typeof c.token !== 'string' || !c.url || !c.token) return null
    return { url: c.url.replace(/\/+$/, ''), token: c.token }
  } catch { return null }
}

/** Guarda (o cambia) la conexión. Sólo en el navegador: en la app la mente ya está en casa. */
export function guardarConexion(c: Conexion): void {
  if (enEscritorio()) return
  localStorage.setItem(CLAVE, JSON.stringify({ url: c.url.replace(/\/+$/, ''), token: c.token }))
  // la ventana se entera: la mente acaba de despertar y hay que preguntar de nuevo
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('esme:mente'))
}

/** Olvida la conexión (el token se borra del navegador). */
export function olvidarConexion(): void {
  if (enEscritorio()) return
  try { localStorage.removeItem(CLAVE) } catch { /* sin almacenamiento: tampoco hay nada que borrar */ }
}

let cliente: ClienteCerebro | null = null
let clienteDe: string = ''

/** El cliente web de la mente, si hay conexión. */
export function clienteMente(): ClienteCerebro | null {
  const c = conexionGuardada()
  if (!c) { cliente = null; clienteDe = ''; return null }
  const firma = `${c.url}|${c.token}`
  if (!cliente || clienteDe !== firma) { cliente = new ClienteCerebro({ url: c.url, token: c.token }); clienteDe = firma }
  return cliente
}

/** La misma forma de respuesta que la app: o el dato, o el motivo. */
export async function datoWeb<T>(f: (c: ClienteCerebro) => Promise<T>): Promise<{ ok: true; dato: T } | { ok: false; error: string }> {
  const c = clienteMente()
  if (!c) return { ok: false, error: 'No hay conexión con la mente.' }
  try { return { ok: true, dato: await f(c) } }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) } }
}

/** ¿Está la mente viva? La pregunta va por su propia puerta (sin token, responde 401). */
export async function menteViva(): Promise<{ ok: boolean; memories: number }> {
  const c = clienteMente()
  if (!c) return { ok: false, memories: 0 }
  return c.salud()
}

// ---- Los eventos en vivo (SSE): lo que va haciendo la mente ----
let parar: AbortController | null = null

export function eventosWeb(onEvento: (e: unknown) => void): () => void {
  parar?.abort()
  const ac = new AbortController()
  parar = ac
  const c = clienteMente()
  if (c) void c.eventos(onEvento, ac.signal).catch(() => { /* la mente se apagó: el atlas se queda quieto */ })
  return () => { ac.abort(); if (parar === ac) parar = null }
}

export function pararEventosWeb(): void {
  parar?.abort()
  parar = null
}
