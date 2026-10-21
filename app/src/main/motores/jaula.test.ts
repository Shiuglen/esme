import { describe, expect, it } from 'vitest'
import { credencialesEn, declaradas, enjaular, explicar, pareceCredencial } from './jaula'

describe('la jaula', () => {
  it('reconoce los nombres que tienen forma de credencial', () => {
    expect(pareceCredencial('ANTHROPIC_API_KEY')).toBe(true)
    expect(pareceCredencial('GH_TOKEN')).toBe(true)
    expect(pareceCredencial('AWS_SECRET_ACCESS_KEY')).toBe(true)
    expect(pareceCredencial('NPM_TOKEN')).toBe(true)
    expect(pareceCredencial('PATH')).toBe(false)
    expect(pareceCredencial('HOME')).toBe(false)
    expect(pareceCredencial('LANG')).toBe(false)
  })

  it('esconde las credenciales del entorno y deja el resto intacto', () => {
    const env = { PATH: '/usr/bin', HOME: '/home/x', LANG: 'es_ES', ANTHROPIC_API_KEY: 'sk-abc', GH_TOKEN: 'ghp_1' }
    const r = enjaular(env)
    expect(r.env).toEqual({ PATH: '/usr/bin', HOME: '/home/x', LANG: 'es_ES' })
    expect(r.ocultas).toEqual(['ANTHROPIC_API_KEY', 'GH_TOKEN'])
    expect(r.vistas).toEqual([])
  })

  it('las que la tarea declara pasan igual', () => {
    const r = enjaular({ PATH: '/bin', ANTHROPIC_API_KEY: 'k' }, ['ANTHROPIC_API_KEY'])
    expect(r.env.ANTHROPIC_API_KEY).toBe('k')
    expect(r.vistas).toEqual(['ANTHROPIC_API_KEY'])
    expect(r.ocultas).toEqual([])
  })

  it('las llaves del propio motor pasan siempre (sin ellas el motor no arranca)', () => {
    const r = enjaular({ PATH: '/bin', OPENROUTER_API_KEY: 'or-1' }, ['OPENROUTER_API_KEY'])
    expect(r.env.OPENROUTER_API_KEY).toBe('or-1')
    expect(r.ocultas).toEqual([])
  })

  it('el PATH y el HOME nunca se tocan: la jaula no puede romper al motor', () => {
    const r = enjaular({ PATH: '/usr/bin', HOME: '/home/x', AWS_SECRET_ACCESS_KEY: 's' })
    expect(r.env.PATH).toBe('/usr/bin')
    expect(r.env.HOME).toBe('/home/x')
  })

  it('la bookkeeping de las herramientas no es una credencial: la jaula no puede romper al motor', () => {
    // El caso real (21-oct): la app arrancada desde npm traía 22 variables npm_* y la jaula se las
    // tragaba todas. `npm_config_cache`, `npm_execpath` o `npm_lifecycle_event` no son llaves:
    // tragárselas rompe cualquier tarea que haga `npm install`.
    const env = {
      PATH: '/usr/bin', HOME: '/home/x',
      npm_config_cache: '/home/x/.npm', npm_config_registry: 'https://registry.npmjs.org',
      npm_execpath: '/usr/bin/npm', npm_lifecycle_event: 'install', npm_package_name: 'algo',
      npm_command: 'install',
    }
    const r = enjaular(env)
    expect(r.ocultas).toEqual([])
    expect(r.env.npm_config_registry).toBe('https://registry.npmjs.org')
    expect(r.env.npm_execpath).toBe('/usr/bin/npm')
    expect(r.env.npm_lifecycle_event).toBe('install')
  })

  it('las llaves de npm sí se esconden', () => {
    const r = enjaular({ PATH: '/bin', NPM_TOKEN: 'n', NODE_AUTH_TOKEN: 'n2', HF_TOKEN: 'h' })
    expect(r.ocultas).toEqual(['HF_TOKEN', 'NODE_AUTH_TOKEN', 'NPM_TOKEN'])
    expect(r.env.NPM_TOKEN).toBeUndefined()
  })

  it('las credenciales que ya no están no cuentan', () => {
    expect(credencialesEn({ PATH: '/bin', ANTHROPIC_API_KEY: undefined })).toEqual([])
  })

  it('lo que se le dice al usuario: qué ve y qué no', () => {
    expect(explicar([], ['GH_TOKEN'])).toContain('no ve ninguna credencial')
    expect(explicar([], ['GH_TOKEN'])).toContain('1 credencial escondida')
    expect(explicar(['OPENROUTER_API_KEY'], [])).toContain('ve 1 credencial (OPENROUTER_API_KEY)')
  })

  it('las declaradas se leen de una lista', () => {
    expect(declaradas('ANTHROPIC_API_KEY, GH_TOKEN')).toEqual(['ANTHROPIC_API_KEY', 'GH_TOKEN'])
    expect(declaradas(' ANTHROPIC_API_KEY  GH_TOKEN ')).toEqual(['ANTHROPIC_API_KEY', 'GH_TOKEN'])
    expect(declaradas(undefined)).toEqual([])
    expect(declaradas('')).toEqual([])
  })
})
