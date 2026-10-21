// Las herramientas propias de Esme (docs/superpowers/specs/2026-10-18-manos.md): buscar y leer en internet, recordar,
// ver al equipo, encargarle trabajo y programarlo. Todas pasan por el mismo guardián: decide si se puede, pregunta cuando
// toca y cuenta cada paso a la conversación. Si algo falla, el modelo recibe el porqué y la conversación sigue.
import { tool, type ToolSet } from 'ai'
import { z } from 'zod'
import type { Cuando, NuevoProgramado } from '../taller/agenda'
import { decidir, type Conocidas, type Politica } from './permisos'
import type { Resultado } from './web'

export type Paso =
  | { fase: 'llama'; id: string; nombre: string; args: unknown }
  | { fase: 'pide'; id: string; nombre: string; args: unknown }
  | { fase: 'resultado'; id: string; nombre: string; resumen: string; args?: unknown }
  | { fase: 'error'; id: string; nombre: string; error: string }
export type Respuesta = 'una' | 'siempre' | 'no'

export type Manos = {
  buscarMemoria(consulta: string): Promise<{ texto: string; tema?: string }[]>
  verEquipo(): { titulo: string; estado: string; agente: string }[]
  encargar(encargo: string, agente?: string): Promise<{ id: string; titulo: string; agente: string }>
  programar(p: Pick<NuevoProgramado, 'texto' | 'cuando'> & { agente?: string }): Promise<{ ok: true } | { ok: false; error: string }> | { ok: true } | { ok: false; error: string }
  forjar(necesidad: string, o: { nombre?: string; agente?: string }): Promise<{ tarea: string; herramienta: string; agente: string; siguiente: string }>
  /**
   * El espejo: REA (ingeniería inversa) mira un programa y lo que vio queda en la memoria de Esme.
   * Sólo software propio o del usuario con permiso: nunca para copiar apps de terceros.
   */
  absorberPrograma?(ruta: string, motivo?: string): Promise<{ ok: boolean; added?: number; memories?: number; informe?: string; fuente?: string; canales?: number; funciones?: number; desconocidos?: number; error?: string }>
  /** Qué cambió entre dos versiones de un programa: los canales y funciones que aparecen o se van. */
  compararProgramas?(ruta: string, contra?: string): Promise<{ ok: boolean; added?: number; informe?: string; fuente?: string; texto?: string; error?: string }>
  usarSkill?(nombre: string, fichero?: string): { instrucciones: string; ficheros: string[] }
  /** La presión de recursos de la casa ahora mismo: cuánto pesa cada proceso y cómo va el swap.
   *  Para saber si la máquina va a poder con lo que se le pide. */
  presion?(): Promise<{ texto: string; totalMB: number; swapLibreMB: number }>
  buscarWeb(consulta: string): Promise<{ fuente: string; resultados: Resultado[] }>
  leerWeb(url: string): Promise<{ titulo: string; texto: string; url: string }>
  /** El navegador: una web de verdad (con JavaScript y formularios), no sólo texto plano. */
  navegar?(url: string): Promise<{ url: string; titulo: string; texto: string; acciones: string[] }>
  clicEnPagina?(objetivo: string): Promise<{ ok: boolean; donde: string; url: string; titulo: string; texto: string; acciones: string[] }>
  escribirEnPagina?(objetivo: string, valor: string): Promise<{ ok: boolean; donde: string; url: string; titulo: string; texto: string; acciones: string[] }>
  /** El Ojo: una mirada a la pantalla de ahora (y lo que aún se recuerda de ella). */
  verPantalla?(): Promise<{ imagen: { base64: string; mime: string }; ts: number; olvida: string }>
  preguntar(nombre: string, args: unknown, id: string): Promise<Respuesta>
  politicas: Record<string, Politica>
  guardarPolitica(nombre: string, p: Politica): void
  conocidas: Conocidas
  alPaso(p: Paso): void
}

const resumen = (x: unknown) => { const s = typeof x === 'string' ? x : JSON.stringify(x); return s.length > 240 ? `${s.slice(0, 240)}…` : s }

/** Envuelve una acción con permisos y pasos visibles. Sirve igual para las propias y para las conectadas por MCP. */
export function conGuardia<A, R>(m: Pick<Manos, 'preguntar' | 'politicas' | 'guardarPolitica' | 'conocidas' | 'alPaso'>, nombre: string, hacer: (a: A) => Promise<R> | R) {
  return async (args: A, o: { toolCallId: string }): Promise<R | string> => {
    const id = o.toolCallId
    const d = decidir(nombre, m.politicas, args, m.conocidas)
    if (d === 'negar') return `El usuario tiene bloqueada la herramienta ${nombre}. No la uses; explícale qué querías hacer.`
    if (d === 'preguntar') {
      m.alPaso({ fase: 'pide', id, nombre, args })
      const r = await m.preguntar(nombre, args, id)
      if (r === 'no') { m.alPaso({ fase: 'error', id, nombre, error: 'No diste permiso.' }); return `El usuario no dio permiso para ${nombre}. No insistas; pregúntale cómo prefiere seguir.` }
      if (r === 'siempre') { m.politicas[nombre] = 'siempre'; m.guardarPolitica(nombre, 'siempre') }
    }
    m.alPaso({ fase: 'llama', id, nombre, args })
    try {
      const r = await hacer(args)
      m.alPaso({ fase: 'resultado', id, nombre, resumen: resumen(r) })
      return r
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      m.alPaso({ fase: 'error', id, nombre, error })
      return `La herramienta ${nombre} falló: ${error}`
    }
  }
}

const a = (ahora: number, dias: number, h: number, min = 0) => { const d = new Date(ahora); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias, h, min).getTime() }
const MOMENTO = z.object({
  momento: z.enum(['esta_noche', 'manana', 'cada_dia', 'en_minutos']).describe('esta_noche = a las 3:00; manana = mañana a las 9:00; cada_dia = cada día a la hora dada; en_minutos = dentro de N minutos'),
  hora: z.string().optional().describe('HH:MM, para cada_dia'),
  laborables: z.boolean().optional().describe('solo de lunes a viernes, para cada_dia'),
  minutos: z.number().int().min(1).max(10_080).optional().describe('para en_minutos'),
})
export function cuandoDeHerramienta(c: z.infer<typeof MOMENTO>, ahora: number): Cuando | null {
  if (c.momento === 'esta_noche') { const hoy = a(ahora, 0, 3); return { tipo: 'una', ms: hoy > ahora ? hoy : a(ahora, 1, 3) } }
  if (c.momento === 'manana') return { tipo: 'una', ms: a(ahora, 1, 9) }
  if (c.momento === 'en_minutos') return c.minutos ? { tipo: 'una', ms: ahora + c.minutos * 60_000 } : null
  const m = /^(\d{1,2}):(\d{2})$/.exec(c.hora ?? '')
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null
  return { tipo: 'diaria', hora: Number(m[1]), minuto: Number(m[2]), ...(c.laborables ? { dias: [1, 2, 3, 4, 5] } : {}) }
}

export function herramientasPropias(m: Manos): ToolSet {
  const g = <A, R>(n: string, f: (x: A) => Promise<R> | R) => conGuardia(m, n, f)
  return {
    buscar_en_internet: tool({
      description: 'Busca en internet. Devuelve títulos, direcciones y resúmenes. Úsala para hechos actuales o cosas que no sabes.',
      inputSchema: z.object({ consulta: z.string().min(1).max(300) }),
      execute: g('buscar_en_internet', async ({ consulta }: { consulta: string }) => {
        const r = await m.buscarWeb(consulta)
        for (const x of r.resultados) m.conocidas.anotarUrl(x.url)
        return r
      }),
    }),
    leer_web: tool({
      description: 'Lee el texto de una página web (http/https). Úsala con direcciones que te dio el usuario o que salieron en una búsqueda.',
      inputSchema: z.object({ url: z.string().url() }),
      execute: g('leer_web', ({ url }: { url: string }) => m.leerWeb(url)),
    }),
    ver_presion: tool({
      description: 'Mide la presión de recursos de la casa ahora mismo: la memoria que pesa cada proceso '
        + '(la app, el renderer, el cerebro, los agentes), la memoria libre y el swap. Úsala antes de lanzar '
        + 'algo pesado, o cuando la máquina va lenta, para saber si hay sitio. Si el swap está casi lleno, '
        + 'lo que se puede soltar es la memoria de las transcripciones, no el historial.',
      inputSchema: z.object({}),
      execute: g('ver_presion', async () => {
        if (!m.presion) return 'Ahora mismo no se puede medir la presión.'
        const p = await m.presion()
        return p.texto
      }),
    }),
    ver_la_pantalla: tool({
      description: 'Mira la pantalla del usuario ahora mismo (una foto) y te la devuelve para que veas lo que ve. '
        + 'Úsala sólo cuando la respuesta dependa de lo que hay en pantalla; no la pidas por curiosidad.',
      inputSchema: z.object({}),
      execute: g('ver_la_pantalla', async () => {
        if (!m.verPantalla) return 'El Ojo no está disponible ahora mismo.'
        const o = await m.verPantalla()
        return { type: 'image', data: o.imagen.base64, mimeType: o.imagen.mime, text: `Pantalla mirada ahora. ${o.olvida}` } as never
      }),
    }),
    navegar: tool({
      description: 'Abre una página en un navegador de verdad (con JavaScript, formularios y paginación) y te devuelve lo que hay: '
        + 'el texto, los botones, los campos y las acciones posibles. Úsala cuando una página necesita JavaScript o cuando tengas '
        + 'que rellenar un formulario o pulsar algo. Si no hay navegador, usa leer_web.',
      inputSchema: z.object({ url: z.string().url() }),
      execute: g('navegar', async ({ url }: { url: string }) => {
        if (!m.navegar) return 'No hay navegador disponible en este momento.'
        const e = await m.navegar(url)
        return e
      }),
    }),
    clic_en_la_pagina: tool({
      description: 'Pulsa un botón o enlace de la página que tienes abierta en el navegador de Esme (por su texto).',
      inputSchema: z.object({ objetivo: z.string().min(1).max(120) }),
      execute: g('clic_en_la_pagina', async ({ objetivo }: { objetivo: string }) => {
        if (!m.clicEnPagina) return 'No hay navegador disponible en este momento.'
        return m.clicEnPagina(objetivo)
      }),
    }),
    escribir_en_la_pagina: tool({
      description: 'Rellena un campo de la página que tienes abierta en el navegador de Esme (por su nombre o su marcador).',
      inputSchema: z.object({ objetivo: z.string().min(1).max(120), valor: z.string().max(2000) }),
      execute: g('escribir_en_la_pagina', async ({ objetivo, valor }: { objetivo: string; valor: string }) => {
        if (!m.escribirEnPagina) return 'No hay navegador disponible en este momento.'
        return m.escribirEnPagina(objetivo, valor)
      }),
    }),
    buscar_en_memoria: tool({
      description: 'Busca en la memoria del usuario (lo que Esme recuerda de sus proyectos, gustos y decisiones).',
      inputSchema: z.object({ consulta: z.string().min(1).max(300) }),
      execute: g('buscar_en_memoria', ({ consulta }: { consulta: string }) => m.buscarMemoria(consulta)),
    }),
    ver_equipo: tool({
      description: 'Qué están haciendo ahora los agentes del Taller del usuario (sus tareas y estados).',
      inputSchema: z.object({}),
      execute: g('ver_equipo', () => m.verEquipo()),
    }),
    encargar_al_equipo: tool({
      description: 'Encarga un trabajo de programación o de ficheros a un agente del Taller. Trabaja en una copia aislada; el usuario revisa los cambios antes de aplicarlos. Describe el encargo con detalle.',
      inputSchema: z.object({ encargo: z.string().min(10).max(20_000), agente: z.string().optional().describe('id del agente; si no, Esme elige') }),
      execute: g('encargar_al_equipo', ({ encargo, agente }: { encargo: string; agente?: string }) => m.encargar(encargo, agente)),
    }),
    forjar_herramienta: tool({
      description: 'La Forja: cuando ninguna herramienta disponible sirve para lo que el usuario necesita, encarga a un agente del Taller que fabrique una nueva (un servidor MCP en Python). El usuario la revisa e instala desde el Taller; después la podrás usar. Describe la necesidad con detalle: qué entra, qué sale y de dónde salen los datos.',
      inputSchema: z.object({ necesidad: z.string().min(15).max(4000), nombre: z.string().regex(/^[a-z][a-z0-9_]{2,19}$/).optional().describe('nombre corto en minúsculas con guiones bajos, p. ej. dias_hasta'), agente: z.string().optional() }),
      execute: g('forjar_herramienta', ({ necesidad, nombre, agente }: { necesidad: string; nombre?: string; agente?: string }) => m.forjar(necesidad, { ...(nombre ? { nombre } : {}), ...(agente ? { agente } : {}) })),
    }),
    comparar_programas: tool({
      description: 'Compara dos versiones de un programa y deja en la memoria de Esme lo que cambió: '
        + 'los canales IPC nuevos y los que se fueron, las funciones que aparecieron o desaparecieron y las medidas de cada versión. '
        + 'Úsala tras recompilar, para saber qué ha cambiado de verdad. Sin «contra», compara con la versión anterior que ya está guardada.',
      inputSchema: z.object({
        ruta: z.string().min(1).max(600).describe('la carpeta o el .asar del programa'),
        contra: z.string().min(1).max(600).optional().describe('la otra versión, si no es la anterior'),
      }),
      execute: g('comparar_programas', async ({ ruta, contra }: { ruta: string; contra?: string }) => {
        if (!m.compararProgramas) return 'El espejo no está disponible ahora mismo.'
        const r = await m.compararProgramas(ruta, contra ?? '')
        if (!r.ok) return `No se pudo comparar: ${r.error ?? 'razón desconocida'}`
        return (r.texto ?? '').slice(0, 4000) || `Comparación hecha. Informe en ${r.informe}.`
      }),
    }),
    absorber_programa: tool({
      description: 'El espejo: analiza un programa (una app de Electron o JavaScript) con REA, ingeniería inversa, y deja en la memoria de Esme '
        + 'lo que vio de él: los módulos, las funciones, la superficie (canales IPC, ventanas) y, lo más importante, lo que NO se pudo ver. '
        + 'Úsala cuando necesites entender cómo funciona un programa antes de tocarlo o de recrear una parte suya. '
        + 'Sólo software propio o del usuario con permiso: nunca para copiar apps de terceros. Tarda (un minuto o más).',
      inputSchema: z.object({
        ruta: z.string().min(1).max(600).describe('la carpeta o el .asar del programa'),
        motivo: z.string().max(400).optional().describe('por qué se mira: queda junto al conocimiento'),
      }),
      execute: g('absorber_programa', async ({ ruta, motivo }: { ruta: string; motivo?: string }) => {
        if (!m.absorberPrograma) return 'El espejo no está disponible ahora mismo.'
        const r = await m.absorberPrograma(ruta, motivo ?? '')
        if (!r.ok) return `No se pudo absorber el programa: ${r.error ?? 'razón desconocida'}`
        return `El programa ya es conocimiento de Esme: ${r.canales ?? 0} canales IPC, ${r.funciones ?? 0} funciones, `
          + `${r.desconocidos ?? 0} cosas que no se pudo ver. Informe en ${r.informe}.`
      }),
    }),
    ...(m.usarSkill ? { usar_skill: tool({
      description: 'Carga una skill instalada por el usuario (sus instrucciones completas, o un fichero suyo) cuando la tarea encaja con su descripción. Después, síguela.',
      inputSchema: z.object({ nombre: z.string().min(1).max(64), fichero: z.string().max(300).optional().describe('ruta de un fichero de la skill, p. ej. references/guia.md') }),
      execute: g('usar_skill', ({ nombre, fichero }: { nombre: string; fichero?: string }) => m.usarSkill!(nombre, fichero)),
    }) } : {}),
    programar_encargo: tool({
      description: 'Deja un encargo en la agenda del Taller para que el equipo lo haga solo más tarde o cada día.',
      inputSchema: z.object({ encargo: z.string().min(10).max(20_000), cuando: MOMENTO, agente: z.string().optional() }),
      execute: g('programar_encargo', async ({ encargo, cuando, agente }: { encargo: string; cuando: z.infer<typeof MOMENTO>; agente?: string }) => {
        const c = cuandoDeHerramienta(cuando, Date.now())
        if (!c) throw new Error('Ese momento no es válido (la hora va como HH:MM).')
        const r = await m.programar({ texto: encargo, cuando: c, ...(agente ? { agente } : {}) })
        if (!r.ok) throw new Error(r.error)
        return { programado: true, cuando: c }
      }),
    }),
  }
}
