// La jaula: una credencial no se hereda; entra a petición.
//
// El agente se lanzaba con `{ ...process.env }`: heredaba **todas** las claves del usuario
// (ANTHROPIC_API_KEY, AWS_*, GH_*, NPM_TOKEN, las de la nube…), y una tarea que astrayara
// llevaría la cartera entera.
//
// La práctica es la contraria, y viene de tres sitios:
//   · **Deska 1.37**: una cuenta por instancia con su propio HOME; una segunda cuenta «arranca
//     desconectada, aunque tu shell tenga llaves de proveedor».
//   · **SPACE** (Perplexity, Apache 2.0): las credenciales y el egreso **nunca viven dentro** del
//     sandbox; se imponen desde fuera.
//   · **@Arindam_1729**: «el HOME, las claves SSH, el llavero y las credenciales de la nube se
//     quedan fuera por defecto. Le pasas una credencial explícitamente o no está».
//
// Aquí la jaula es de **variables**, no de procesos: el agente no ve las variables con forma de
// credencial, salvo las que el propio motor necesita (las llaves que Esme guarda en el llavero)
// y las que **la tarea declara**. El resto del entorno (PATH, HOME, el idioma, las herramientas)
// pasa intacto: la jaula no debe romper al motor.

/** Nombres que tienen forma de credencial. */
const CREDENCIAL: RegExp[] = [
  /_API_?KEY$/i, /_TOKEN$/i, /_SECRET$/i, /_PASSWORD$/i, /_PASSWD$/i, /_CREDENTIALS?$/i,
  /_ACCESS_?KEY/i, /_PRIVATE_?KEY$/i, /_SESSION_?TOKEN$/i, /_AUTH$/i, /_BEARER$/i,
  /^AWS_/, /^AZURE_/, /^GOOGLE_/, /^GCP_/, /^GH_/, /^GITHUB_/, /^NPM_/, /^OPENAI_/,
  /^ANTHROPIC_/, /^XAI_/, /^MISTRAL_/, /^GEMINI_/, /^GOOGLE_/, /^COHERE_/, /^GROQ_/,
  /^KIMI_/, /^DEEPSEEK_/, /^HF_/, /^HUGGINGFACE/,
]

/** ¿Este nombre parece el de una credencial? */
export function pareceCredencial(nombre: string): boolean {
  const n = nombre.toUpperCase()
  return CREDENCIAL.some((r) => r.test(n))
}

/** Las credenciales que hay en un entorno. */
export function credencialesEn(env: Record<string, string | undefined>): string[] {
  return Object.keys(env).filter((n) => env[n] !== undefined && pareceCredencial(n)).sort()
}

export type Enjaulado = {
  env: Record<string, string>          // el entorno que ve el agente
  vistas: string[]                     // las credenciales que sí ve
  ocultas: string[]                    // las que no ve
}

/**
 * Enjaula un entorno.
 *
 * `permitidas` son los nombres que pasan **aunque parezcan credencial**: las llaves del propio
 * motor (que Esme guarda en el llavero y el motor necesita) y las que la tarea declara.
 */
export function enjaular(env: Record<string, string | undefined>, permitidas: string[] = []): Enjaulado {
  const dentro = new Set(permitidas.map((n) => n.toUpperCase()))
  const saliente: Record<string, string> = {}
  const vistas: string[] = []
  const ocultas: string[] = []
  for (const [nombre, valor] of Object.entries(env)) {
    if (valor === undefined) continue
    if (pareceCredencial(nombre) && !dentro.has(nombre.toUpperCase())) ocultas.push(nombre)
    else { saliente[nombre] = valor; if (pareceCredencial(nombre)) vistas.push(nombre) }
  }
  return { env: saliente, vistas: vistas.sort(), ocultas: ocultas.sort() }
}

/** Lo que se le dice al usuario: qué credenciales ve su agente y cuáles no. */
export function explicar(vistas: string[], ocultas: string[]): string {
  const p = (n: number, uno: string, muchos: string) => (n === 1 ? `1 ${uno}` : `${n} ${muchos}`)
  const v = vistas.length ? `ve ${p(vistas.length, 'credencial', 'credenciales')} (${vistas.join(', ')})` : 'no ve ninguna credencial'
  const o = ocultas.length ? ` · ${p(ocultas.length, 'credencial escondida', 'credenciales escondidas')} (${ocultas.join(', ')})` : ''
  return `La jaula: ${v}${o}.`
}

/** Los nombres que la tarea declara (opción «credenciales»: «A, B»). */
export function declaradas(texto: string | undefined): string[] {
  return (texto ?? '').split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
}
