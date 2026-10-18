// Iniciar sesión en una herramienta remota (Figma, Notion, Linear, Hugging Face…) con OAuth: Esme abre la página del
// servicio en tu navegador, tú entras con tu cuenta y el servicio devuelve un código a una dirección local
// (127.0.0.1) que solo existe mientras dura el inicio de sesión. El token queda cifrado en el llavero.
// En medio de una conversación nunca se abre el navegador: se avisa de que falta la sesión.
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import type { OAuthClientProvider } from '@ai-sdk/mcp'

type Almacen = { get(k: string): string | undefined; set(k: string, v: string): void; remove(k: string): void }
type Guardado = { cliente?: unknown; tokens?: unknown }
type Tokens = Awaited<ReturnType<OAuthClientProvider['tokens']>>
type Cliente = Awaited<ReturnType<OAuthClientProvider['clientInformation']>>

export const PUERTO_OAUTH = 33418
export class SinSesion extends Error { constructor(servicio: string) { super(`${servicio} pide iniciar sesión: hazlo en Tienda › Herramientas.`) } }

export class ProveedorOAuth implements OAuthClientProvider {
  private verificador = ''
  private estado: string | undefined
  constructor(private readonly slug: string, private readonly almacen: Almacen, private readonly o: { interactivo: boolean; abrir(url: string): void; puerto: number }) {}

  private get clave() { return `mcp:${this.slug}:__oauth` }
  private leer(): Guardado { try { return JSON.parse(this.almacen.get(this.clave) ?? '{}') as Guardado } catch { return {} } }
  private escribir(g: Guardado) { if (g.cliente || g.tokens) this.almacen.set(this.clave, JSON.stringify(g)); else this.almacen.remove(this.clave) }

  get redirectUrl() { return `http://127.0.0.1:${this.o.puerto}/callback` }
  get clientMetadata() {
    return { client_name: 'Esme', client_uri: 'https://github.com/Shiuglen/esme', redirect_uris: [this.redirectUrl], grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none' }
  }
  clientInformation() { return this.leer().cliente as Cliente }
  saveClientInformation(c: unknown) { this.escribir({ ...this.leer(), cliente: c }) }
  tokens() { return this.leer().tokens as Tokens }
  saveTokens(t: unknown) { this.escribir({ ...this.leer(), tokens: t }) }
  saveCodeVerifier(v: string) { this.verificador = v }
  codeVerifier() { return this.verificador }
  state() { return randomBytes(16).toString('hex') }
  saveState(s: string) { this.estado = s }
  storedState() { return this.estado }
  async redirectToAuthorization(url: URL) {
    if (!this.o.interactivo) throw new SinSesion(this.slug)
    this.o.abrir(url.toString())
  }
  invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier') {
    const g = this.leer()
    if (scope === 'all' || scope === 'tokens') delete g.tokens
    if (scope === 'all' || scope === 'client') delete g.cliente
    if (scope === 'all' || scope === 'verifier') this.verificador = ''
    this.escribir(g)
  }
}

const PAGINA = (titulo: string, texto: string) => `<!doctype html><meta charset="utf-8"><title>Esme</title><body style="font:16px system-ui;background:#0b0c10;color:#e8e8ee;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h1 style="font-weight:400">${titulo}</h1><p style="color:#9aa">${texto}</p></div>`

/** Espera a que el navegador vuelva con el código (solo en 127.0.0.1, una sola vez, con tiempo límite). */
export function esperarCodigo(puerto: number, ms = 5 * 60_000): Promise<{ code: string; state?: string }> {
  return new Promise((ok, no) => {
    const fin = (f: () => void) => { clearTimeout(reloj); servidor.close(); f() }
    const servidor = createServer((req, res) => {
      const u = new URL(req.url ?? '/', `http://127.0.0.1:${puerto}`)
      if (u.pathname !== '/callback') { res.writeHead(404).end(); return }
      const error = u.searchParams.get('error'), code = u.searchParams.get('code')
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      if (error || !code) {
        res.end(PAGINA('No se pudo iniciar sesión', 'Vuelve a Esme e inténtalo otra vez.'))
        fin(() => no(new Error(`El servicio no dio acceso: ${error ?? 'sin código'}`)))
        return
      }
      res.end(PAGINA('Listo', 'Ya puedes volver a Esme.'))
      fin(() => ok({ code, ...(u.searchParams.get('state') ? { state: u.searchParams.get('state')! } : {}) }))
    })
    const reloj = setTimeout(() => fin(() => no(new Error('Se acabó el tiempo para iniciar sesión.'))), ms)
    servidor.on('error', (e) => fin(() => no(e)))
    servidor.listen(puerto, '127.0.0.1')
  })
}
