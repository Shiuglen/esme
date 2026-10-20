// Cliente de la mente para la ventana. La ventana NO habla con el cerebro (que es Python): pide al proceso
// principal, que lo hace por la puerta (src/main/mente/cliente.ts) y lleva el token. Aquí no hay ni url ni llave:
// la interfaz no necesita la llave de la memoria.
//
// Los métodos se llaman igual que antes (health, recall, remember, search, memory, forget, ingest, atlas, oir,
// decir, events), así que las pantallas no cambian: lo que cambia es que ya no hay una segunda puerta.

import { bridge } from './bridge'

export type Recall = { context: string; tokens: number; ids: string[]; abstained: boolean }
export type Memory = { id: string; text: string; source: string; kind: string; ts: string; trust: number; compartment: string; score?: number }
export type Certificate = { forgotten: string[]; sha256: string; ts: string }
export type AtlasPoint = { id: string; x: number; y: number; h: number; cluster: number; kind: string; source: string; ts?: string; trust?: number }
export type AtlasCluster = { id: number; label: string; terms?: string[]; x: number; y: number; size: number }
export type Atlas = { points: AtlasPoint[]; clusters: AtlasCluster[] }
export type MindEvent =
  | { type: 'recall'; who: string; query: string; ids: string[]; tokens: number; abstained: boolean }
  | { type: 'remember'; id: string }
  | { type: 'forget'; ids: string[] }
  | { type: 'ingest'; added: number }

export class BrainError extends Error {}

export class BrainClient {
  /** Todo lo que puede fallar se falla igual: con el mismo error, para que la ventana sepa qué enseñar. */
  private async via<T>(f: () => Promise<T>): Promise<T> {
    try { return await f() } catch (e) { throw e instanceof BrainError ? e : new BrainError(e instanceof Error ? e.message : 'la mente no respondió') }
  }

  health() { return this.via(() => bridge.mente.salud()) }
  recall(query: string, budget = 1500, who = 'chat') { return this.via(() => bridge.mente.recordar(query, { budget, who })) as Promise<Recall> }
  remember(text: string, kind = 'note') { return this.via(() => bridge.mente.escribir(text, kind)) as Promise<{ id: string }> }
  feedback(ids: string[], useful: boolean, query: string) { return this.via(() => bridge.mente.feedback(ids, useful, query)) as Promise<{ result: string }> }
  search(q: string, limit = 20) { return this.via(() => bridge.mente.recuerdos(q, limit)) as Promise<Memory[]> }
  memory(id: string) { return this.via(() => bridge.mente.memoria(id)) as Promise<Memory> }
  forget(id: string) { return this.via(() => bridge.mente.olvidar(id)) as Promise<Certificate> }
  ingest(paths: string[]) { return this.via(() => bridge.mente.ingerir(paths)) as Promise<{ added: number; memories: number }> }
  atlas() { return this.via(() => bridge.mente.atlas()) as Promise<Atlas> }

  /** El oído de Esme: PCM float32 mono a 16 kHz → texto (en el equipo, sin salir a internet). */
  async oir(pcm: Float32Array, idioma = 'es'): Promise<string> {
    const r = await this.via(() => bridge.mente.oir(pcm.slice().buffer as ArrayBuffer, idioma)) as { texto: string }
    return r.texto
  }

  /** La voz de Esme: texto → WAV. */
  async decir(texto: string): Promise<Blob> {
    const b = await this.via(() => bridge.mente.decir(texto)) as ArrayBuffer
    return new Blob([b], { type: 'audio/wav' })
  }

  /** Suscripción a lo que hace la mente (quién recordó qué), para el Atlas en vivo. Devuelve la función para cerrar. */
  events(onEvent: (e: MindEvent) => void): () => void {
    const off = bridge.mente.onEvento((e) => onEvent(e as MindEvent))
    void bridge.mente.eventos()
    return () => { off(); void bridge.mente.eventosParar() }
  }
}
