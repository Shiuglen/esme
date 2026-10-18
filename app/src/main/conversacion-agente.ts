// La conversación a través de tus agentes (OpenCode, Qwen Code, Claude Agent…): cuando no hay clave de API o se acabó
// lo gratis, Esme habla con el motor de tu suscripción o tu sesión. El agente recibe tu memoria (el MCP del cerebro) y
// tus herramientas conectadas; sus pasos se ven como los de Esme y sus permisos salen en la misma tarjeta.
import type { McpServer } from '@agentclientprotocol/sdk'
import type { ModelMessage } from 'ai'
import { mkdirSync } from 'node:fs'
import { abrirSesionACP, type EventoMotor } from './motores/sesion-acp'
import type { Paso, Respuesta } from './herramientas/propias'
import type { MotorElegido } from './taller/taller'

const texto = (c: unknown) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((p) => (p as { text?: string }).text ?? '').join('') : JSON.stringify(c))

export function promptDeConversacion(sistema: string, mensajes: Pick<ModelMessage, 'role' | 'content'>[]): string {
  const ultimo = mensajes.at(-1)
  const antes = mensajes.slice(0, -1).filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => `${m.role === 'user' ? 'Usuario' : 'Esme'}: ${texto(m.content)}`).join('\n\n')
  return `${sistema}

Estás respondiendo en la conversación de Esme (no es una tarea de programación): contesta al usuario directamente. Tienes su memoria en las herramientas «esme» (recall/remember). No escribas ni cambies ficheros salvo que te lo pida.
${antes ? `\nLo hablado hasta ahora:\n${antes}\n` : ''}
Mensaje del usuario:
${texto(ultimo?.content ?? '')}`
}

export function pasoDeEvento(e: EventoMotor): Paso | null {
  if (e.tipo !== 'herramienta') return null
  const nombre = e.titulo ? `agente__${e.titulo}` : 'agente'
  if (e.estado === 'completed') return { fase: 'resultado', id: e.id, nombre, resumen: '' }
  if (e.estado === 'failed') return { fase: 'error', id: e.id, nombre, error: 'falló' }
  return { fase: 'llama', id: e.id, nombre, args: {} }
}

export function opcionDePermiso(r: Respuesta, opciones: { id: string; tipo: string }[]): string | 'cancelar' {
  const de = (t: string) => opciones.find((o) => o.tipo === t)?.id
  if (r === 'no') return de('reject_once') ?? de('reject_always') ?? 'cancelar'
  if (r === 'siempre') return de('allow_always') ?? de('allow_once') ?? 'cancelar'
  return de('allow_once') ?? de('allow_always') ?? 'cancelar'
}

/** Una respuesta de Esme a través de un agente ACP. Devuelve el error si lo hubo (el flujo ya se envió por «enviar»). */
export async function conversarConAgente(o: {
  motor: MotorElegido; cwd: string; sistema: string; mensajes: ModelMessage[]; mcp?: { nombre: string; url: string; token: string }; masMcp?: McpServer[]
  config?: Record<string, string>; senal: AbortSignal
  enviar(canal: 'chunk' | 'pensamiento' | 'paso', x: unknown): void
  permiso(titulo: string, opciones: { id: string; nombre: string; tipo: string }[]): Promise<Respuesta>
}): Promise<{ error?: string; uso?: { entrada: number; salida: number } }> {
  mkdirSync(o.cwd, { recursive: true })
  let uso: { entrada: number; salida: number } | undefined, fallo: string | undefined
  const s = await abrirSesionACP({ comando: o.motor.comando, args: o.motor.args, cwd: o.cwd, env: o.motor.env, ...(o.mcp ? { mcp: o.mcp } : {}), masMcp: o.masMcp ?? [], ...(o.config ? { config: o.config } : {}),
    alEvento: (e) => {
      if (e.tipo === 'texto' && e.texto) o.enviar('chunk', e.texto)
      else if (e.tipo === 'pensamiento' && e.texto) o.enviar('pensamiento', e.texto)
      else if (e.tipo === 'uso') uso = { entrada: e.entrada, salida: e.salida }
      else if (e.tipo === 'fallo') fallo = e.mensaje
      else { const p = pasoDeEvento(e); if (p) o.enviar('paso', p) }
    },
    alPedirPermiso: async (p) => opcionDePermiso(await o.permiso(p.titulo, p.opciones), p.opciones),
  })
  const cancelar = () => void s.cancelar().catch(() => {})
  o.senal.addEventListener('abort', cancelar, { once: true })
  try { await s.preguntar(promptDeConversacion(o.sistema, o.mensajes)); return { ...(fallo ? { error: fallo } : {}), ...(uso ? { uso } : {}) } }
  catch (e) { return { error: e instanceof Error ? e.message : String(e) } }
  finally { o.senal.removeEventListener('abort', cancelar); s.cerrar() }
}
