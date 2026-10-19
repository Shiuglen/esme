// Alertas antes de instalar una skill, calculadas en tu equipo sobre lo que se va a instalar (docs/investigacion/
// 2026-10-19-skills.md §4 y §5.3: la lista de Anthropic y las técnicas que documentó Snyk). No son un veredicto: te dicen
// qué mirar. Nada se instala sin que lo veas y lo permitas.
import { cabeceraDe } from './skill-md'

export type NivelAlerta = 'alto' | 'medio' | 'aviso'
export type Alerta = { nivel: NivelAlerta; motivo: string; ruta?: string }
export type FicheroSkill = { ruta: string; contenido: string; ejecutable?: boolean }

const EJECUTABLE = /\.(py|sh|bash|zsh|js|mjs|cjs|ts|ps1|bat|cmd|exe|rb|pl|php)$/i
// en un script, cualquier llamada a la red es alta; en una guía (Markdown), un ejemplo de código con fetch no lo es:
// lo peligroso es pedir que se ejecute lo descargado (alto) o que se instale algo de fuera (medio)
const RED = /\b(curl|wget|Invoke-WebRequest|requests\.(get|post)|urllib|fetch\(|npx\s|pip3? install|uvx\s|nc\s+-|socket\.)/i
const EJECUTAR_DESCARGADO = /\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(ba|z)?sh\b|\biex\s*\(|Invoke-Expression/i
const INSTALAR_DE_FUERA = /\b(npx\s+-?y?\s*\S|pip3? install|uvx\s|npm i(nstall)?\s+-g|curl\s+-\S*\s*https?:|wget\s+https?:)/i
const BASE64 = /[A-Za-z0-9+/]{200,}={0,2}/
const INVISIBLES = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]|[\u{E0000}-\u{E007F}]/u
const OCULTO = /display\s*:\s*none|<!--[\s\S]{200,}?-->/i
const EJECUCION = /\b(eval|exec)\s*\(/
const MANIPULACION = /ignore\s+(all\s+)?(the\s+)?(previous|prior|above)\s+instructions|do\s+not\s+(tell|inform|mention\s+(this\s+)?to)\s+the\s+user|without\s+(asking|telling)\s+the\s+user|ignora\s+(todas\s+)?(las\s+)?instrucciones\s+(anteriores|previas)|no\s+(se\s+lo\s+|le\s+)?(digas|cuentes)\s+al\s+usuario/i
const SENSIBLE = /~\/\.ssh|\bid_(rsa|ed25519)\b|(^|[\s/"'])\.env\b|\.aws\/credentials|\bkeychain\b|\bwallet\.dat\b/i
const SECRETO = /\b(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|xox[bp]-[A-Za-z0-9-]{20,})\b/

export function alertasDe(ficheros: FicheroSkill[]): Alerta[] {
  const out: Alerta[] = []
  const una = (nivel: NivelAlerta, motivo: string, ruta?: string) => { if (!out.some((a) => a.motivo === motivo && a.ruta === ruta)) out.push({ nivel, motivo, ...(ruta ? { ruta } : {}) }) }
  let total = 0
  for (const f of ficheros) {
    total += f.contenido.length
    const esScript = f.ejecutable || EJECUTABLE.test(f.ruta) || f.ruta.startsWith('scripts/')
    if (esScript) una('alto', 'Trae código que se puede ejecutar', f.ruta)
    if (f.ruta === 'SKILL.md') {
      const cab = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/.exec(f.contenido)
      const campos = cab ? cabeceraDe(cab[1]) : {}
      if (campos['allowed-tools']) una('alto', `Preaprueba herramientas sin preguntarte: ${campos['allowed-tools']}`, f.ruta)
      if ('hooks' in campos || /^hooks:/m.test(cab?.[1] ?? '')) una('alto', 'Declara hooks (órdenes que se ejecutan solas)', f.ruta)
      if (campos.context === 'fork') una('alto', 'Pide ejecutarse en un contexto aparte (context: fork)', f.ruta)
      if (/!`[^`]+`/.test(f.contenido)) una('alto', 'Incrusta órdenes que se ejecutan al cargarla (!`…`)', f.ruta)
      if (f.contenido.split('\n').length > 500) una('aviso', 'SKILL.md muy largo (más de 500 líneas)', f.ruta)
    }
    if (esScript && RED.test(f.contenido)) una('alto', 'Descarga cosas o llama a la red', f.ruta)
    if (EJECUTAR_DESCARGADO.test(f.contenido)) una('alto', 'Pide ejecutar algo descargado de internet', f.ruta)
    else if (!esScript && INSTALAR_DE_FUERA.test(f.contenido)) una('medio', 'Pide instalar o descargar algo de fuera', f.ruta)
    if (BASE64.test(f.contenido)) una('alto', 'Contiene un bloque base64 largo (posible contenido ofuscado)', f.ruta)
    if (INVISIBLES.test(f.contenido)) una('alto', 'Contiene caracteres invisibles (pueden esconder instrucciones)', f.ruta)
    if (OCULTO.test(f.contenido)) una('alto', 'Contiene texto oculto (HTML invisible o comentarios largos)', f.ruta)
    if (esScript && EJECUCION.test(f.contenido)) una('alto', 'Ejecuta código construido al vuelo (eval/exec)', f.ruta)
    if (MANIPULACION.test(f.contenido)) una('alto', 'Frases de manipulación (ignorar instrucciones, ocultar cosas al usuario)', f.ruta)
    if (SECRETO.test(f.contenido)) una('alto', 'Lleva un secreto escrito (clave o token)', f.ruta)
    if (SENSIBLE.test(f.contenido)) una('medio', 'Menciona rutas o datos sensibles (~/.ssh, .env, credenciales)', f.ruta)
  }
  if (total > 1024 * 1024) una('aviso', 'Pesa más de 1 MiB')
  return out
}

const ORDEN: Record<NivelAlerta, number> = { alto: 3, medio: 2, aviso: 1 }
export const nivelMaximo = (a: Alerta[]): NivelAlerta | null =>
  a.reduce<NivelAlerta | null>((m, x) => (!m || ORDEN[x.nivel] > ORDEN[m] ? x.nivel : m), null)
