// Cliente del cerebro de Daimon (API local en 127.0.0.1 con token). Lo usa la interfaz; las claves de IA nunca pasan por aquí.

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
  constructor(readonly url: string, private readonly token: string, private readonly f: typeof fetch = fetch.bind(globalThis)) {}

  private async call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const res = await this.f(`${this.url}${path}`, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new BrainError((data as { error?: string }).error ?? `cerebro: HTTP ${res.status}`)
    return data as T
  }

  health() { return this.call<{ ok: boolean; memories: number }>('/health') }
  recall(query: string, budget = 1500, who = 'chat') { return this.call<Recall>('/recall', { body: { query, budget, who } }) }
  remember(text: string, kind = 'note') { return this.call<{ id: string }>('/remember', { body: { text, kind } }) }
  feedback(ids: string[], useful: boolean, query: string) { return this.call<{ result: string }>('/feedback', { body: { ids, useful, query } }) }
  search(q: string, limit = 20) { return this.call<Memory[]>(`/memories?q=${encodeURIComponent(q)}&limit=${limit}`) }
  memory(id: string) { return this.call<Memory>(`/memory/${encodeURIComponent(id)}`) }
  forget(id: string) { return this.call<Certificate>('/forget', { body: { id } }) }
  ingest(paths: string[]) { return this.call<{ added: number; memories: number }>('/ingest', { body: { paths } }) }
  atlas() { return this.call<Atlas>('/atlas') }

  eventsUrl() { return `${this.url}/events?token=${encodeURIComponent(this.token)}` }

  /** Suscripción a lo que hace la mente (quién recordó qué), para el Atlas en vivo. Devuelve la función para cerrar. */
  events(onEvent: (e: MindEvent) => void): () => void {
    const es = new EventSource(this.eventsUrl())
    es.onmessage = (m) => { try { onEvent(JSON.parse(m.data)) } catch { /* latido o dato inválido */ } }
    return () => es.close()
  }
}
