// LA PUERTA: la única forma de hablar con el cerebro (que es Python). Aquí vive todo lo que se sabe del contrato:
// rutas, token, tiempos y errores. Si otro fichero necesita al cerebro, pasa por aquí; si no, no lo necesita.
//
// El contrato es una spec abierta (`estandar/cerebro-frontera.spec.yaml`, en el kit): el cerebro es Python y la app es
// TypeScript, y entre dos lenguas solo sobrevive lo que está escrito. Cambiar el contrato es cambiar la spec, no el
// código: por eso aquí las rutas están escritas enteras y en ningún otro sitio.
import type { BrainInfo } from '../brain-process'

/** Un recuerdo tal y como lo devuelve el cerebro. */
export type Recuerdo = { text: string; source: string; score?: number; id?: string; [k: string]: unknown }

/** Lo que el Tálamo compone: el contexto con presupuesto y los ids que ha usado. */
export type Recuerdos = { context: string; tokens: number; ids: string[]; abstained: boolean }

/** El certificado de olvido: lo que el cerebro certifica que olvidó. */
export type Olvido = { forgotten: string[]; [k: string]: unknown }

/** El rumbo de la mente: las estrellas fijas y lo que va cambiando. */
export type Pilar = { id: string; texto: string; creado: number }
export type Objetivo = { id: string; texto: string; estado: 'activo' | 'hecho' | 'pausado'; creado: number; cerrado: number | null; pilar: string | null }
export type Rumbo = { version: 1; pilares: Pilar[]; objetivos: Objetivo[] }

/** Un fallo del cerebro, siempre con la misma forma (nunca una excepción suelta de fetch). */
export type FalloCerebro = { ok: false; error: string }

export const RUTAS = {
  salud: '/health',
  recuerdos: '/memories',
  recordar: '/recall',
  escribir: '/remember',
  feedback: '/feedback',
  olvido: '/forget',
  ingesta: '/ingest',
  sueno: '/sueño',
  orquestacion: '/orquesta',
  atlas: '/atlas',
  mcp: '/mcp',
  rumbo: '/rumbo',
  // la superficie del cerebro, TODA declarada aquí (una sola puerta: la spec
  // es estandar/cerebro-frontera.spec.yaml y el kit la comprueba contra esto)
  memoria: '/memory/{id}',
  vozOir: '/voz/oir',
  vozDecir: '/voz/decir',
  eventos: '/events',
  ingestX: '/ingest-x',
  equipo: '/equipo',
} as const

const MS = 10_000

export class ClienteCerebro {
  constructor(private readonly info: BrainInfo, private readonly http: typeof fetch = fetch) {}

  /** La llamada: siempre con el token, siempre con reloj, siempre con el mismo error. */
  private async llamar<T>(ruta: string, init: RequestInit = {}, ms = MS): Promise<T> {
    let r: Response
    try {
      r = await this.http(`${this.info.url}${ruta}`, {
        ...init,
        headers: { Authorization: `Bearer ${this.info.token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(ms),
      })
    } catch (e) {
      throw new Error(e instanceof Error && e.name === 'TimeoutError' ? `el cerebro no respondió a tiempo (${ruta})` : `el cerebro no está disponible (${ruta})`)
    }
    if (!r.ok) {
      const detalle = await r.text().catch(() => '')
      throw new Error(`el cerebro respondió ${r.status}${detalle ? `: ${detalle.slice(0, 200)}` : ''} (${ruta})`)
    }
    return (await r.json()) as T
  }

  /** ¿Está la mente despierta? */
  async salud(): Promise<{ ok: boolean; memories: number }> {
    return this.llamar<{ ok: boolean; memories: number }>(RUTAS.salud)
  }

  /** Lo que la mente sabe de una palabra: recuerdos con su origen y su puntuación. */
  async recuerdos(q: string, limit = 200): Promise<Recuerdo[]> {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('limit', String(limit))
    return this.llamar<Recuerdo[]>(`${RUTAS.recuerdos}?${params.toString()}`)
  }

  /** Lo que guardaste: los recuerdos de una fuente (x:bookmarks…), sin búsqueda: es una coleta. */
  async recuerdosDeFuente(fuente: string, limite = 80): Promise<Recuerdo[]> {
    const params = new URLSearchParams({ fuente, limit: String(limite) })
    return this.llamar<Recuerdo[]>(`${RUTAS.recuerdos}?${params.toString()}`)
  }

  /** La mente absorbe tu X: una cosecha de FYP, guardados o búsquedas entra como recuerdos. */
  async ingestarX(cosecha: string | object): Promise<{ added: number; memories: number }> {
    return this.llamar<{ added: number; memories: number }>(RUTAS.ingestX, { method: 'POST', body: JSON.stringify({ cosecha }) })
  }

  /** Lo que la mente aprende del equipo: cada veredicto del creador es una lección. */
  async equipo(datos: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.llamar<Record<string, unknown>>(RUTAS.equipo, { method: 'POST', body: JSON.stringify(datos) })
  }

  /** El Tálamo compone el contexto con presupuesto: lo que entra en el prompt. */
  async recordar(query: string, o: { motor?: string; budget?: number; who?: string } = {}): Promise<Recuerdos> {
    return this.llamar<Recuerdos>(RUTAS.recordar, { method: 'POST', body: JSON.stringify({ query, ...o }) })
  }

  /** Escribir un recuerdo. */
  async escribir(texto: string, kind = 'note'): Promise<{ id: string }> {
    return this.llamar<{ id: string }>(RUTAS.escribir, { method: 'POST', body: JSON.stringify({ text: texto, kind }) })
  }

  /** Decir si lo que la mente devolvió sirvió: con eso aprende el rango. */
  async feedback(ids: string[], useful: boolean, query: string, motor?: string): Promise<{ result: unknown }> {
    return this.llamar<{ result: unknown }>(RUTAS.feedback, { method: 'POST', body: JSON.stringify({ ids, useful, query, motor }) })
  }

  /** Olvidar, con el certificado que lo dice. */
  async olvidar(id: string): Promise<Olvido> {
    return this.llamar<Olvido>(RUTAS.olvido, { method: 'POST', body: JSON.stringify({ id }) })
  }

  /** Absorber fuentes (md, jsonl, código) como recuerdos con procedencia. */
  async ingerir(paths: string[]): Promise<{ added: number; memories: number }> {
    return this.llamar<{ added: number; memories: number }>(RUTAS.ingesta, { method: 'POST', body: JSON.stringify({ paths }) })
  }

  /** La mente duerme: destila y guarda. */
  async sueno(): Promise<Record<string, unknown>> {
    return this.llamar<Record<string, unknown>>(RUTAS.sueno, { method: 'POST', body: '{}' })
  }

  /** El rumbo: para qué trabaja esta mente (pilares y objetivos). */
  async rumbo(): Promise<Rumbo> {
    return this.llamar<Rumbo>(RUTAS.rumbo)
  }

  /** Mover el rumbo: añadir un pilar, un objetivo, cerrarlo, quitarlo… */
  async moverRumbo(accion: string, datos: Record<string, unknown> = {}): Promise<Rumbo> {
    return this.llamar<Rumbo>(RUTAS.rumbo, { method: 'POST', body: JSON.stringify({ accion, ...datos }) })
  }

  /** El atlas: el mapa de lo que la mente sabe. */
  async atlas(): Promise<unknown> {
    return this.llamar<unknown>(RUTAS.atlas)
  }

  /** Un recuerdo suelto, por su id. */
  async memoria(id: string): Promise<Recuerdo> {
    return this.llamar<Recuerdo>(`${RUTAS.memoria.replace('{id}', encodeURIComponent(id))}`)
  }

  /** El oído: PCM float32 mono a 16 kHz → texto (en el equipo, sin salir a internet). */
  async oir(pcm: ArrayBuffer, idioma = 'es'): Promise<{ texto: string }> {
    const r = await this.http(`${this.info.url}${RUTAS.vozOir}?idioma=${encodeURIComponent(idioma)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.info.token}`, 'Content-Type': 'application/octet-stream' },
      body: pcm,
      signal: AbortSignal.timeout(30_000),
    })
    if (!r.ok) throw new Error(`el oído de la mente respondió ${r.status}`)
    return (await r.json()) as { texto: string }
  }

  /** La voz: texto → audio (WAV). */
  async decir(texto: string): Promise<ArrayBuffer> {
    const r = await this.http(`${this.info.url}${RUTAS.vozDecir}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.info.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!r.ok) throw new Error(`la voz de la mente respondió ${r.status}`)
    return r.arrayBuffer()
  }

  /** Los eventos de la mente (SSE): lo que va haciendo, en vivo. */
  async eventos(onEvento: (e: unknown) => void, parar: AbortSignal): Promise<void> {
    const r = await this.http(`${this.info.url}${RUTAS.eventos}?token=${encodeURIComponent(this.info.token)}`, { signal: parar })
    if (!r.ok || !r.body) throw new Error(`los eventos de la mente no vinieron (${r.status})`)
    const lector = r.body.getReader()
    const dec = new TextDecoder()
    let resto = ''
    for (;;) {
      const { done, value } = await lector.read()
      if (done) break
      resto += dec.decode(value, { stream: true })
      const lineas = resto.split('\n')
      resto = lineas.pop() ?? ''
      for (const l of lineas) {
        const t = l.trim()
        if (!t.startsWith('data:')) continue
        try { onEvento(JSON.parse(t.slice(5).trim())) } catch { /* latido o dato inválido */ }
      }
    }
  }

  /** Qué motor gana en qué: lo que la mente ha aprendido de cada IA. */
  async orquestacion(): Promise<unknown> {
    return this.llamar<unknown>(RUTAS.orquestacion)
  }
}

/** La puerta MCP: la misma mente, pero hablando el protocolo de los agentes (Claude Code, OpenCode, Cursor…). */
export const configMcp = (info: BrainInfo) => ({ url: `${info.url}${RUTAS.mcp}`, headers: { Authorization: `Bearer ${info.token}` } })

/** La puerta MCP como la espera el resto de la app (el chat, el Taller): nombre, url y token. */
export const mcpDeEsme = (info: BrainInfo | null) => (info ? { nombre: 'esme', url: `${info.url}${RUTAS.mcp}`, token: info.token } : null)

/** Un fallo del cerebro con la misma forma siempre: lo que la ventana enseña. */
export const fallo = (e: unknown): FalloCerebro => ({ ok: false, error: e instanceof Error ? e.message : 'el cerebro falló' })
