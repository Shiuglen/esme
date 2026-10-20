import { describe, it, expect } from 'vitest'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AGENTES, conEsme, conectar, desconectar, estaConectado, sinEsme } from './compartir'

const U = 'http://127.0.0.1:47321/mcp', T = 'tok'
const ag = (id: string) => AGENTES.find((a) => a.id === id)!

describe('tu mente en cada agente, con su propio formato', () => {
  it('Claude Code: mcpServers.esme por HTTP con su cabecera, sin tocar lo demás', () => {
    const r = conEsme({ theme: 'dark', mcpServers: { otro: { command: 'x' } } }, ag('claude-code'), U, T)
    expect(r).toEqual({ theme: 'dark', mcpServers: { otro: { command: 'x' }, esme: { type: 'http', url: U, headers: { Authorization: 'Bearer tok' } } } })
  })
  it('Gemini y Qwen: httpUrl', () => {
    expect(conEsme({}, ag('gemini'), U, T)).toEqual({ mcpServers: { esme: { httpUrl: U, headers: { Authorization: 'Bearer tok' } } } })
    expect(conEsme({}, ag('qwen'), U, T)).toEqual({ mcpServers: { esme: { httpUrl: U, headers: { Authorization: 'Bearer tok' } } } })
  })
  it('Cursor: url', () => {
    expect(conEsme({}, ag('cursor'), U, T)).toEqual({ mcpServers: { esme: { url: U, headers: { Authorization: 'Bearer tok' } } } })
  })
  it('OpenCode: mcp.servers.esme remoto (la forma plana estaba en desuso)', () => {
    expect(conEsme({ $schema: 's' }, ag('opencode'), U, T)).toEqual({ $schema: 's', mcp: { servers: { esme: { type: 'remote', url: U, headers: { Authorization: 'Bearer tok' }, enabled: true } } } })
  })
  it('OpenCode: conectar retira la forma plana que quedó de antes y no toca el resto', () => {
    const antes = { $schema: 's', mcp: { esme: { type: 'remote', url: 'http://viejo' }, timeout: { startup: 1000 }, servers: { otro: { type: 'remote', url: 'http://otro' } } } }
    const r = conEsme(antes, ag('opencode'), U, T)
    expect((r.mcp as any).esme).toBeUndefined()
    expect((r.mcp as any).timeout).toEqual({ startup: 1000 })
    expect((r.mcp as any).servers.otro).toEqual({ type: 'remote', url: 'http://otro' })
    expect((r.mcp as any).servers.esme.url).toBe(U)
  })
  it('OpenCode: quitar deja el fichero como estaba', () => {
    const antes = { $schema: 's', mcp: { servers: { otro: { type: 'remote', url: 'http://otro' } } } }
    expect(sinEsme(conEsme(antes, ag('opencode'), U, T), ag('opencode'))).toEqual(antes)
    expect(sinEsme({ mcp: { servers: { esme: {} } } }, ag('opencode'))).toEqual({})
  })
  it('quitarla deja el fichero como estaba', () => {
    const antes = { mcpServers: { otro: { command: 'x' } } }
    expect(sinEsme(conEsme(antes, ag('cursor'), U, T), ag('cursor'))).toEqual(antes)
    expect(estaConectado(conEsme({}, ag('opencode'), U, T), ag('opencode'))).toBe(true)
    expect(estaConectado({}, ag('opencode'))).toBe(false)
  })
})

describe('en disco', () => {
  it('conectar crea el fichero si hace falta, guarda una copia del anterior y desconectar lo devuelve', () => {
    const home = mkdtempSync(join(tmpdir(), 'mente-'))
    const a = ag('cursor'), f = join(home, a.fichero)
    conectar(a, home, U, T)
    expect(JSON.parse(readFileSync(f, 'utf8')).mcpServers.esme.url).toBe(U)
    writeFileSync(f, JSON.stringify({ mcpServers: { mio: { url: 'x' } } }))
    conectar(a, home, U, T)
    expect(existsSync(`${f}.antes-de-esme`)).toBe(true)
    desconectar(a, home)
    expect(JSON.parse(readFileSync(f, 'utf8'))).toEqual({ mcpServers: { mio: { url: 'x' } } })
  })
  it('un fichero que no es JSON no se toca', () => {
    const home = mkdtempSync(join(tmpdir(), 'mente-'))
    const a = ag('cursor'), f = join(home, a.fichero)
    conectar(a, home, U, T); writeFileSync(f, '{roto')
    expect(() => conectar(a, home, U, T)).toThrow(/no es JSON/)
    expect(readFileSync(f, 'utf8')).toBe('{roto')
  })
})
