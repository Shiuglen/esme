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

/** Un elemento que SE PUEDE TOCAR, con su número: el mapa de la página. Los números son el orden
 *  del documento entre los seleccionables — el mismo en el mapa, en el clic y al escribir — así
 *  una página con tres botones «Más» deja de ser una adivinanza: pulsas «n7» y punto. */
export type ElementoWeb = {
  n: number
  rol: 'enlace' | 'boton' | 'campo'
  etiqueta: string
  url?: string          // los enlaces
  tipo?: string         // los campos (text, checkbox, select…)
  marcador?: string     // el name/id del campo, por si la etiqueta miente
  marcado?: boolean     // los checkbox y radio
  opciones?: string[]   // los select, hasta 12
}

/** Lo que el agente ve de una página. */
export type EstadoPagina = {
  url: string
  titulo: string
  texto: string
  enlaces: Enlace[]
  botones: string[]
  campos: Campo[]
  elementos: ElementoWeb[]
  vista?: { y: number; alto: number; v: number }   // dónde está el ojo: y de cuánto; abajo/scroll
}

export const LIMITE_TEXTO = 12_000
const MAX_ENLACES = 60
const MAX_BOTONES = 40
const MAX_CAMPOS = 40
const MAX_ELEMENTOS = 120

const texto = (x: unknown, n: number) => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, n) : '')
const lista = (x: unknown) => (Array.isArray(x) ? x : [])
const EL_ROL = (v: unknown): 'enlace' | 'boton' | 'campo' => (v === 'enlace' || v === 'boton' || v === 'campo' ? v : 'campo')

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
  const elementos = lista(o.elementos).flatMap((x, i) => {
    const el = (x ?? {}) as Record<string, unknown>
    const etiqueta = texto(el.etiqueta, 160)
    const marcador = texto(el.marcador, 120)
    const url = typeof el.url === 'string' ? el.url : ''
    const rol = EL_ROL(el.rol)
    if (rol === 'enlace' && !url && !etiqueta) return []
    const opciones = lista(el.opciones).map((v) => texto(v, 80)).filter(Boolean).slice(0, 12)
    const salida: ElementoWeb = { n: Math.max(1, Math.trunc(Number(el.n) || i + 1)), rol, etiqueta, ...(typeof el.tipo === 'string' ? { tipo: texto(el.tipo, 20) } : {}), ...(marcador ? { marcador } : {}), ...(url ? { url } : {}), ...(typeof el.marcado === 'boolean' ? { marcado: el.marcado } : {}), ...(opciones.length ? { opciones } : {}) }
    return [salida]
  }).slice(0, MAX_ELEMENTOS)
  const vista = (() => {
    const v = (o.vista ?? {}) as Record<string, unknown>
    const y = Number(v.y), alto = Number(v.alto), v2 = Number(v.v)
    if (![y, alto, v2].every((x) => Number.isFinite(x)) || alto <= 0) return undefined
    return { y: Math.max(0, y), alto, v: Math.max(0, v2) }
  })()
  return { url: typeof o.url === 'string' ? o.url : '', titulo: texto(o.titulo, 200), texto: cuerpo, enlaces, botones, campos, elementos, ...(vista ? { vista } : {}) }
}

/** Lo que el agente ve, resumido en palabras: lo que se le devuelve como texto. */
export function resumen(e: EstadoPagina): string {
  const l: string[] = []
  l.push(`Página: ${e.titulo || '(sin título)'}`)
  l.push(`URL: ${e.url}`)
  if (e.texto) l.push('', e.texto)
  if (e.vista && e.vista.alto > e.vista.v) l.push('', `Vista: ${(100 * (e.vista.y + e.vista.v) / e.vista.alto).toFixed(0)} % de la página (${e.vista.y} de ${e.vista.alto}); pide bajar la mirada si falta.»`.replace('»', ''))
  if (e.elementos?.length) {
    l.push('', `Lo que se puede tocar, por números (pulsa «n7», escribe «n9» o dale al texto):`)
    for (const x of e.elementos) {
      const nombre = x.rol === 'enlace' ? (x.etiqueta || x.url || '') : (x.etiqueta || x.marcador || '(sin etiqueta)')
      const extra: string[] = []
      if (x.url && !x.etiqueta) extra.push(x.url)
      if (x.tipo) extra.push(x.tipo)
      if (typeof x.marcado === 'boolean') extra.push(x.marcado ? 'marcado' : 'sin marcar')
      if (x.opciones?.length) extra.push(x.opciones.slice(0, 6).join(' / '))
      l.push(`n${x.n} [${x.rol === 'enlace' ? 'enlace' : x.rol === 'boton' ? 'botón' : 'campo'}] ${nombre}${extra.length ? ` (${extra.join(' · ')})` : ''}`)
    }
  }
  return l.join('\n')
}

/** El espacio de acciones: lo que se puede hacer ahora mismo en esta página — CON NÚMEROS.
 *
 *  La idea del norte técnico sigue ahí (el navegador como espacio de primera clase) y sube un
 *  nivel: cada acción lleva su número, el mismo que el mapa del estado y el que entienden los
 *  guiones de clic y de escritura. Así un modelo pequeño decide sin gastar uno grande, y una
 *  página con tres botones «Más» deja de ser una adivinanza. */
export function accionesDe(e: EstadoPagina): string[] {
  const a: string[] = []
  for (const x of e.elementos ?? []) {
    const nombre = x.rol === 'enlace' ? (x.etiqueta || x.url || '') : (x.etiqueta || x.marcador || '(sin etiqueta)')
    const extra: string[] = []
    if (x.url && !x.etiqueta) extra.push(x.url)
    if (x.tipo) extra.push(x.tipo)
    if (typeof x.marcado === 'boolean') extra.push(x.marcado ? 'marcado' : 'sin marcar')
    if (x.opciones?.length) extra.push(x.opciones.slice(0, 6).join(' / '))
    a.push(`n${x.n} [${x.rol === 'enlace' ? 'enlace' : x.rol === 'boton' ? 'botón' : 'campo'}] ${nombre}${extra.length ? ` (${extra.join(' · ')})` : ''}`)
  }
  return a.slice(0, 80)
}

/** La pieza común de todos los guiones: los seleccionables de la página, en orden, vivos y sin
 *  dobles. LA MISMA LISTA en el mapa, en el clic y al escribir — esa es la garantía de los números. */
const POZO = `
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 };
  const txt = (e) => ((e.innerText || e.textContent || e.value || '') + '').trim().replace(/\\s+/g, ' ').slice(0, 200);
  const etiq = (e) => {
    const l = (e.labels && e.labels[0] && e.labels[0].innerText) || e.getAttribute('aria-label') || e.placeholder || e.name || e.id || '';
    return (l + '').trim().replace(/\\s+/g, ' ').slice(0, 120);
  };
  const VIVOS = Array.from(document.querySelectorAll('a[href], button, [role="button"], input, textarea, select')).filter(vis);
  const numeroDe = (o) => { const m = /^(?:n|N)\\s*(\\d+)$/.exec(((o ?? '') + '').trim()); return m ? Number(m[1]) : null };
  const norm = (s) => ((s || '') + '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/\\s+/g, ' ').trim();
`

/** El guion que se inyecta en la página para leerla. Se define una vez y se reutiliza. */
export const GUION_ESTADO = `(() => {
${POZO}
  const enlaces = [], botones = [], campos = [], elementos = [];
  for (const e of VIVOS) {
    const tag = e.tagName.toLowerCase();
    const esBoton = tag === 'button' || e.getAttribute('role') === 'button' || e.type === 'submit';
    const esCampo = (tag === 'input' && e.type !== 'submit') || tag === 'textarea' || tag === 'select';
    const n = elementos.length + 1;
    if (tag === 'a') { enlaces.push({ texto: txt(e), url: e.href }); }
    else if (esBoton) { botones.push(txt(e)); }
    else { campos.push({ nombre: e.name || e.id || '', tipo: e.type || e.tagName.toLowerCase(),
      valor: (e.type === 'password' ? '' : (e.value || '')), marcador: etiq(e) }); }
    const x = { n, rol: tag === 'a' ? 'enlace' : (esBoton ? 'boton' : 'campo'),
      etiqueta: (tag === 'a' || esBoton) ? txt(e) : etiq(e),
      url: tag === 'a' ? e.href : undefined,
      tipo: esCampo ? (e.type || e.tagName.toLowerCase()) : undefined,
      marcador: esCampo ? (e.name || e.id || '') : undefined };
    if (tag === 'select') x.opciones = Array.from(e.options || []).slice(0, 12)
      .map((o) => (o.text || '').replace(/\\s+/g, ' ').trim().slice(0, 80)).filter(Boolean);
    if (tag === 'input' && (e.type === 'checkbox' || e.type === 'radio')) x.marcado = e.checked;
    elementos.push(x);
  }
  return { url: location.href, titulo: document.title, texto: document.body ? document.body.innerText : '',
    enlaces, botones, campos, elementos,
    vista: { y: window.scrollY, alto: document.documentElement.scrollHeight, v: window.innerHeight } };
})()`

/** El guion para hacer clic: por número («n7») o por texto. El número va a la MANSA lista de
 *  arriba — el mismo orden, la misma garantía; el texto queda para quien ya venía así. */
export const GUION_CLIC = (objetivo: string) => `(() => {
${POZO}
  let objetivo = ${JSON.stringify(objetivo)};
  const porNumero = numeroDe(objetivo);
  let e = null;
  if (porNumero) e = VIVOS[porNumero - 1] || null;
  if (!e) e = VIVOS.find((x) => norm(x.innerText || x.value || x.textContent).includes(norm(objetivo))) || null;
  if (!e) return { ok: false, donde: '' };
  const donde = ((e.innerText || e.value || '') + '').trim().slice(0, 120);
  e.scrollIntoView({ block: 'center' });
  e.click();
  return { ok: true, donde };
})()`

/** El guion para escribir en un campo: por número («n9») o por nombre/marcador/etiqueta. Para los
 *  checkbox y radio, valor «marcado»/«sí» enciende (a radio cualquier valor lo enciende) y «no»/
 *  «sin marcar» apaga; y se usa el setter nativo para que las páginas que controlan el valor desde
 *  JavaScript (React y compañía) se enteren del cambio. */
export const GUION_ESCRIBIR = (objetivo: string, valor: string) => `(() => {
${POZO}
  const clave = ${JSON.stringify(objetivo)};
  const valor = ${JSON.stringify(valor)};
  const porNumero = numeroDe(clave);
  let e = null;
  if (porNumero) {
    const fila = VIVOS[porNumero - 1] || null;
    if (fila && ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(fila.tagName) >= 0) e = fila;
  }
  if (!e) e = VIVOS.filter((x) => ['input', 'textarea', 'select'].includes(x.tagName.toLowerCase()))
    .find((x) => norm([x.name, x.id, x.placeholder, x.getAttribute('aria-label'),
      x.labels && x.labels[0] && x.labels[0].innerText].join(' ')).includes(norm(clave))) || null;
  if (!e) return { ok: false, donde: '' };
  const donde = ((e.name || e.id || e.placeholder || '') + '').trim().slice(0, 120);
  e.focus();
  if (e.tagName === 'SELECT') {
    const v = (e.options ? Array.from(e.options) : []).find((o) => norm(o.text).includes(norm(valor)));
    if (v) e.value = v.value;
  } else if (e.type === 'checkbox' || e.type === 'radio') {
    if (e.type === 'radio') e.checked = true;
    else e.checked = /^(marcado|sí|si|true|on)$/i.test(valor.trim()) ? true : !/^(no|sin marcar|desmarcado|false|off)$/i.test(valor.trim()) ? e.checked : false;
  } else {
    const proto = e instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value');
    if (setter && setter.set) setter.set.call(e, valor); else e.value = valor;
  }
  e.dispatchEvent(new Event('input', { bubbles: true }));
  e.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true, donde };
})()`

/** El guion de la mirada: baja o sube la página casi una pantalla entera; el estado que se lee
 *  justo después dice dónde quedó el ojo (la vista) y qué números hay en lo nuevo. */
export const GUION_SCROLL = (abajo: boolean) => `(() => {
  window.scrollBy({ top: Math.round(window.innerHeight * 0.85) * (${abajo ? '1' : '-1'}), left: 0 });
  return { ok: true, donde: '',
    vista: { y: window.scrollY, alto: document.documentElement.scrollHeight, v: window.innerHeight } };
})()`

/** Una dirección de la web: sólo http y https. Nada de ficheros locales ni de javascript:. */
export function urlValida(u: string): string | null {
  const s = (u ?? '').trim()
  if (!/^https?:\/\//i.test(s)) return null
  try { const p = new URL(s); return p.protocol === 'http:' || p.protocol === 'https:' ? p.href : null } catch { return null }
}
