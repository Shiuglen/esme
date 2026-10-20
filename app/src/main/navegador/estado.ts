// El navegador de Esme: una web de verdad para los agentes, no sólo texto plano.
//
// Antes las manos del agente sólo sabían buscar y leer el HTML: sin JavaScript, sin formularios,
// sin paginación, sin «leer más». Con esto el agente abre la página, ve lo que hay (texto, enlaces,
// botones y campos) y actúa: hacer clic, escribir. Es el navegador como espacio de primera clase.
//
// Todo lo de aquí es puro y comprobable: el guion que se inyecta en la página y el normalizador
// que limpia lo que vuelve. La parte de Electron (la ventana) vive en `navegador.ts`.

/** Un enlace que se ve en la página. */
export type Enlace = { texto: string; url: string }
/** Un campo que se puede rellenar. */
export type Campo = { nombre: string; tipo: string; valor: string; marcador: string }

/** Lo que el agente ve de una página. */
export type EstadoPagina = {
  url: string
  titulo: string
  texto: string
  enlaces: Enlace[]
  botones: string[]
  campos: Campo[]
}

export const LIMITE_TEXTO = 12_000
const MAX_ENLACES = 60
const MAX_BOTONES = 40
const MAX_CAMPOS = 40

const texto = (x: unknown, n: number) => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, n) : '')
const lista = (x: unknown) => (Array.isArray(x) ? x : [])

/** Lo que vuelve de la página, limpio y acotado: ni una página puede desbordar el contexto. */
export function normaliza(x: unknown): EstadoPagina {
  const o = (x ?? {}) as Record<string, unknown>
  const enlaces = lista(o.enlaces).flatMap((e) => {
    const l = (e ?? {}) as Record<string, unknown>
    const url = typeof l.url === 'string' ? l.url : ''
    if (!url) return []
    return [{ url, texto: texto(l.texto, 120) }]
  }).slice(0, MAX_ENLACES)
  const botones = lista(o.botones).map((b) => texto(b, 120)).filter(Boolean).slice(0, MAX_BOTONES)
  const campos = lista(o.campos).flatMap((c) => {
    const f = (c ?? {}) as Record<string, unknown>
    const nombre = typeof f.nombre === 'string' ? f.nombre : ''
    const marcador = texto(f.marcador, 120)
    if (!nombre && !marcador) return []
    return [{ nombre, marcador, tipo: texto(f.tipo, 20) || 'texto', valor: texto(f.valor, 200) }]
  }).slice(0, MAX_CAMPOS)
  const cuerpo = texto(o.texto, LIMITE_TEXTO)
  return { url: typeof o.url === 'string' ? o.url : '', titulo: texto(o.titulo, 200), texto: cuerpo, enlaces, botones, campos }
}

/** Lo que el agente ve, resumido en palabras: lo que se le devuelve como texto. */
export function resumen(e: EstadoPagina): string {
  const l: string[] = []
  l.push(`Página: ${e.titulo || '(sin título)'}`)
  l.push(`URL: ${e.url}`)
  if (e.texto) l.push('', e.texto)
  if (e.botones.length) l.push('', `Botones: ${e.botones.join(' · ')}`)
  if (e.campos.length) l.push(`Campos: ${e.campos.map((c) => c.marcador || c.nombre).join(' · ')}`)
  if (e.enlaces.length) l.push(`Enlaces: ${e.enlaces.slice(0, 25).map((x) => `${x.texto || x.url} → ${x.url}`).join(' · ')}`)
  return l.join('\n')
}

/** El espacio de acciones: lo que se puede hacer ahora mismo en esta página.
 *
 *  Es la idea del norte técnico (el navegador como espacio de primera clase): el agente no
 *  improvisa comandos, elige de una lista de acciones posibles — y un modelo pequeño puede
 *  decidir cuál sin gastar un modelo grande. */
export function accionesDe(e: EstadoPagina): string[] {
  const a: string[] = []
  for (const b of e.botones) a.push(`clic en «${b}»`)
  for (const c of e.campos) a.push(`escribir en «${c.marcador || c.nombre}»`)
  for (const x of e.enlaces.slice(0, 20)) a.push(`abrir ${x.url}`)
  return a.slice(0, 80)
}

/** El guion que se inyecta en la página para leerla. Se define una vez y se reutiliza. */
export const GUION_ESTADO = `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 };
  const txt = (e) => ((e.innerText || e.textContent || e.value || '') + '').trim().replace(/\\s+/g, ' ').slice(0, 200);
  const etiq = (e) => {
    const l = (e.labels && e.labels[0] && e.labels[0].innerText) || e.getAttribute('aria-label') || e.placeholder || e.name || e.id || '';
    return (l + '').trim().replace(/\\s+/g, ' ').slice(0, 120);
  };
  const enlaces = Array.from(document.querySelectorAll('a[href]')).filter(vis).slice(0, 60)
    .map((a) => ({ texto: txt(a), url: a.href })).filter((x) => x.url);
  const botones = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"], a.button, .btn, .button')).filter(vis)
    .map(txt).filter((t) => t && t.length < 120).slice(0, 40);
  const campos = Array.from(document.querySelectorAll('input, textarea, select')).filter(vis).slice(0, 40)
    .map((e) => ({ nombre: e.name || e.id || '', tipo: e.type || e.tagName.toLowerCase(),
      valor: (e.type === 'password' ? '' : (e.value || '')), marcador: etiq(e) }));
  return { url: location.href, titulo: document.title, texto: document.body ? document.body.innerText : '',
    enlaces, botones, campos };
})()`

/** El guion para hacer clic: busca un botón o enlace cuyo texto contenga lo pedido y lo pulsa. */
export const GUION_CLIC = (objetivo: string) => `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 };
  const norm = (s) => ((s || '') + '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/\\s+/g, ' ').trim();
  const objetivo = norm(${JSON.stringify(objetivo)});
  const cands = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="submit"]')).filter(vis);
  const e = cands.find((x) => norm(x.innerText || x.value || x.textContent).includes(objetivo));
  if (!e) return { ok: false, donde: '' };
  const donde = ((e.innerText || e.value || '') + '').trim().slice(0, 120);
  e.scrollIntoView({ block: 'center' });
  e.click();
  return { ok: true, donde };
})()`

/** El guion para escribir en un campo: lo busca por nombre, marcador o etiqueta y lo rellena.
 *  Se usa el setter nativo de HTMLInputElement para que las páginas que controlan el valor desde
 *  JavaScript (React y compañía) se enteren del cambio. */
export const GUION_ESCRIBIR = (objetivo: string, valor: string) => `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 };
  const norm = (s) => ((s || '') + '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/\\s+/g, ' ').trim();
  const objetivo = norm(${JSON.stringify(objetivo)});
  const campos = Array.from(document.querySelectorAll('input, textarea, select')).filter(vis);
  const e = campos.find((x) => norm([x.name, x.id, x.placeholder, x.getAttribute('aria-label'),
    x.labels && x.labels[0] && x.labels[0].innerText].join(' ')).includes(objetivo));
  if (!e) return { ok: false, donde: '' };
  const donde = ((e.name || e.id || e.placeholder || '') + '').trim().slice(0, 120);
  e.focus();
  if (e.tagName === 'SELECT') {
    const v = (e.options ? Array.from(e.options) : []).find((o) => norm(o.text).includes(norm(${JSON.stringify(valor)})));
    if (v) e.value = v.value;
  } else {
    const proto = e instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value');
    if (setter && setter.set) setter.set.call(e, ${JSON.stringify(valor)}); else e.value = ${JSON.stringify(valor)};
  }
  e.dispatchEvent(new Event('input', { bubbles: true }));
  e.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true, donde };
})()`

/** Una dirección de la web: sólo http y https. Nada de ficheros locales ni de javascript:. */
export function urlValida(u: string): string | null {
  const s = (u ?? '').trim()
  if (!/^https?:\/\//i.test(s)) return null
  try { const p = new URL(s); return p.protocol === 'http:' || p.protocol === 'https:' ? p.href : null } catch { return null }
}
