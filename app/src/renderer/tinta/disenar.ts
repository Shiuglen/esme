// Esme diseña pieles (P2 de docs/superpowers/specs/2026-10-17-pieles.md): «ponla como Linear», «más cálida», «estilo terminal
// retro». Se lo pide a la IA con la receta exacta de una piel y la piel de ahora (para entender peticiones relativas), lee el
// JSON aunque venga envuelto en prosa, lo valida y comprueba que se lea; si algo falla, se lo devuelve a la IA una vez con lo
// que hay que corregir. Lo que llega aquí nunca se aplica sin pasar por validarPiel: una piel es solo datos.
import { bridge, type ChatMsg } from '../lib/bridge'
import { explicarFallo, ordenMotores } from '../panels/motor'
import { LETRAS, revisarContraste, validarPiel, variablesDePiel, type Piel } from './piel'

export function mensajesDisenador(peticion: string, actual: Piel): ChatMsg[] {
  const letras = Object.keys(LETRAS).join(', ')
  return [{ role: 'user', content: `Eres el diseñador de pieles de Esme, una app de escritorio de IA. Una piel es SOLO un JSON con esta forma exacta:
{"nombre": "nombre corto en español",
 "color": {"tipo": "libre", "noche": {"fondo": "#rrggbb", "superficie": "#rrggbb", "texto": "#rrggbb", "acento": "#rrggbb"},
                            "dia": {"fondo": "#rrggbb", "superficie": "#rrggbb", "texto": "#rrggbb", "acento": "#rrggbb"}},
 "letra": {"titulos": LETRA, "texto": LETRA, "escala": número entre 0.85 y 1.2},
 "forma": {"radio": número entre 0 y 2.5 (1 es normal, 0 esquinas cuadradas, 2 muy redondas), "sombra": "plana" | "suave" | "honda"},
 "densidad": "compacta" | "comoda" | "amplia", "movimiento": "nada" | "sutil" | "vivo", "fondo": "liso" | "aurora" | "papel"}
LETRA es una de: ${letras}.
Reglas: colores solo en hex #rrggbb. Contraste WCAG AA obligatorio en día y en noche: texto sobre fondo y sobre superficie al menos 4.5;
el acento sobre el fondo al menos 3. De noche la superficie es un poco más clara que el fondo; de día, blanca o casi blanca.
Responde SOLO con el JSON, sin explicación.

La piel que lleva ahora: ${JSON.stringify(actual)}
Lo que pide: ${peticion}` }]
}

/** El primer objeto JSON de la respuesta, aunque venga entre texto o en un bloque de código; null si no hay ninguno. */
export function leerPielDeRespuesta(texto: string): Record<string, unknown> | null {
  const t = texto.replace(/```(?:json)?/gi, '')
  const candidatos: string[] = []
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== '{') continue
    let prof = 0, enCadena = false, escape = false
    for (let j = i; j < t.length; j++) {
      const c = t[j]
      if (enCadena) { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === '"') enCadena = false; continue }
      if (c === '"') enCadena = true
      else if (c === '{') prof++
      else if (c === '}' && --prof === 0) { candidatos.push(t.slice(i, j + 1)); break }
    }
  }
  for (const c of candidatos.sort((a, b) => b.length - a.length)) {
    try { const o = JSON.parse(c); if (o && typeof o === 'object' && !Array.isArray(o)) return o } catch { /* el siguiente */ }
  }
  return null
}

const problemas = (p: Piel) => (p.color.tipo === 'estilo' ? [] : [...revisarContraste(variablesDePiel(p, 'noche')).map((x) => `de noche, ${x}`), ...revisarContraste(variablesDePiel(p, 'dia')).map((x) => `de día, ${x}`)])

// Los modelos gratis que obedecen el formato a la primera (probados por el puente el 16-17 oct)
const PREFERIDOS = ['cohere/north-mini-code:free', 'google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free', 'poolside/laguna-s-2.1:free']
const NO_SIRVE = /embed|reasoning|safety|guard|omni|[-/]vl\b/i

/** Con qué modelos diseñar, en orden (tres como mucho). Nunca uno de pago que no hayas elegido tú: primero el que elegiste en
 *  la conversación, luego el de por defecto del motor, luego gratis que obedecen; un motor local usa el suyo. */
export function modelosParaDisenar(ms: string[], porDefecto: string | undefined, recordado: string | null, local = false): string[] {
  const hay = new Set(ms)
  const gratis = ms.filter((m) => m.endsWith(':free') && !NO_SIRVE.test(m))
  const lista = [recordado, porDefecto, ...PREFERIDOS, ...gratis].filter((m): m is string => !!m && hay.has(m))
  if (!lista.length && local) lista.push(...ms.filter((m) => !NO_SIRVE.test(m)).slice(0, 1))
  return [...new Set(lista)].slice(0, 3)
}

/** El motor con el que diseñar: el último que usaste en la conversación si responde; si no, el primero que responda. */
async function motor(): Promise<{ id: string; nombre: string; modelos: string[] } | null> {
  const ps = await bridge.providers()
  const leer = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
  for (const p of ordenMotores(ps, leer('esme:proveedor'))) {
    try {
      const modelos = modelosParaDisenar(await bridge.models(p.id), p.defaultModel, leer(`esme:modelo:${p.id}`), p.local)
      if (modelos.length) return { id: p.id, nombre: p.label, modelos }
    } catch { /* no responde: el siguiente */ }
  }
  return null
}

// Algunos modelos «que piensan» dejan la respuesta en su razonamiento y el texto vacío: si pasa, se lee de ahí.
const preguntar = (id: string, modelo: string, mensajes: ChatMsg[]) => new Promise<string>((ok, mal) => {
  let texto = '', pensado = ''
  const s = bridge.chat(id, modelo, mensajes, null)
  s.onChunk((d) => { texto += d }); s.onPensamiento?.((d) => { pensado += d })
  s.onDone(() => ok(texto.trim() ? texto : pensado)); s.onError((m) => mal(new Error(m)))
})

export type Diseno = { ok: true; piel: Piel; motor: string } | { ok: false; error: string }
export async function disenarPiel(peticion: string, actual: Piel, alAvanzar?: (fase: string) => void): Promise<Diseno> {
  const m = await motor()
  if (!m) return { ok: false, error: 'Ningún motor responde ahora con un modelo gratis o elegido por ti. Conecta uno en Ajustes › Motores o elige un modelo en la conversación.' }
  let ultimoError = ''
  for (const modelo of m.modelos) {   // si un modelo calla o no obedece, el siguiente
    const corto = modelo.split('/').pop()?.replace(/:free$/, '') ?? modelo
    let mensajes = mensajesDisenador(peticion, actual)
    for (let intento = 1; intento <= 2; intento++) {
      alAvanzar?.(intento === 1 ? `Diseñando con ${m.nombre} · ${corto}…` : `Corrigiendo lo que no se leía bien (${corto})…`)
      let respuesta: string
      try { respuesta = await preguntar(m.id, modelo, mensajes) } catch (e) { ultimoError = explicarFallo(String((e as Error).message), m.nombre); break }
      const crudo = respuesta.trim() ? leerPielDeRespuesta(respuesta) : null
      if (!crudo) { ultimoError = `${corto} no devolvió una piel.`; break }
      const v = validarPiel(crudo)
      const fallos = v.ok ? problemas(v.piel) : v.errores
      if (v.ok && !fallos.length) return { ok: true, piel: v.piel, motor: `${m.nombre} · ${corto}` }
      ultimoError = 'La piel que propuso no se leía bien ni después de corregirla.'
      mensajes = [...mensajes, { role: 'assistant', content: respuesta }, { role: 'user', content: `Corrige esto y devuelve SOLO el JSON completo: ${fallos.join('; ')}` }]
    }
  }
  return { ok: false, error: `${ultimoError} Pídemela con otras palabras o elige otro modelo en la conversación.` }
}
