// Lo que guardaste es una lista de deseos: lo que guardaste en X (o en cualquier sitio) son cosas que querías. Aquí se
// convierten en peticiones concretas: quién lo guardó, qué dice, y qué herramienta es —para poder buscarla en el
// registro y conectarla de verdad.
//
// Es lógica pura a propósito: el texto de un recuerdo es un dato, no una API. Lo que viene del post es:
//   «Autor | @user | · | 12 oct.: el texto del post (https://x.com/.../status/123)»
// y dentro del texto suele estar el enlace de verdad: la herramienta, la web o el repo.
export type Deseo = {
  autor: string
  texto: string
  post: string          // el enlace al post
  destino: string       // el enlace de verdad (la herramienta o la web)
  dominio: string       // su dominio (github.com, huggingface.co…)
  herramienta: string   // el nombre corto de la herramienta (heliosgen, akou…)
}

const URL = /https?:\/\/[^\s()<>]+/gi

/**
 * El harvest trocea el texto del post: una URL puede llegar partida en varias líneas («https://\ngithub.com/…»).
 * Con los trozos pegados el enlace vuelve a funcionar; sin esto, un recuerdo con una URL rota no lleva a ningún sitio.
 */
export function reparaUrls(texto: string): string {
  let previo: string
  do {
    previo = texto
    texto = texto.replace(/(https?:\/\/[^\s]*)\n([^\s]+)/g, (todo, url: string, trozo: string) => {
      const camino = url.replace(/^https?:\/\//, '')
      if (!camino) return url + trozo                       // aún no hay host: el trozo es su continuación
      if (!camino.includes('/') && !trozo.startsWith('/')) return todo   // el host ya está entero: el trozo es prosa
      return url + trozo
    })
  } while (previo !== texto)
  return texto
}
const deX = /(?:^|\/\/)(?:www\.)?(?:x|twitter)\.com\//i
const sinProtocolo = (u: string) => u.replace(/^https?:\/\//i, '').replace(/\/+$/, '')

/** El nombre corto de una herramienta: la última parte del camino (github.com/segfault42/heliosgen → heliosgen). */
export function nombreDeHerramienta(destino: string): string {
  const camino = sinProtocolo(destino).split('/').filter(Boolean)
  const ultimo = camino.at(-1) ?? ''
  return ultimo.replace(/\.(git|html?|md)$/i, '').replace(/[?#].*$/, '').toLowerCase()
}

export function dominioDe(url: string): string {
  const s = sinProtocolo(url).split('/')[0].toLowerCase()
  return s.replace(/^www\./, '')
}

/** Los urls de un texto, sin los del propio post de X. */
function urlsReales(texto: string): string[] {
  const todos = [...texto.matchAll(URL)].map((m) => m[0].replace(/[.,;:]+$/, ''))
  return todos.filter((u) => !deX.test(u))
}

/** Convierte los recuerdos guardados en deseos: uno por post, con su herramienta si la se puede adivinar. */
export function deseosDe(textos: string[]): Deseo[] {
  const out: Deseo[] = []
  const vistos = new Set<string>()
  for (const bruto of textos) {
    const texto = reparaUrls(bruto ?? '').replace(/\s+/g, ' ').trim()
    if (!texto) continue
    const corte = texto.indexOf(': ')
    const autor = corte > 0 ? texto.slice(0, corte).split('|')[0].trim() : ''
    const cuerpo = corte > 0 ? texto.slice(corte + 2) : texto
    const post = cuerpo.match(/\((https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[^)]+)\)/i)?.[1] ?? ''
    const real = urlsReales(cuerpo)[0] ?? ''
    const destino = real || post
    if (!destino) continue
    const clave = destino.toLowerCase()
    if (vistos.has(clave)) continue
    vistos.add(clave)
    out.push({
      autor,
      texto: cuerpo.replace(/\((https?:\/\/[^)]+)\)/i, '').trim().slice(0, 400),
      post,
      destino,
      dominio: dominioDe(destino),
      herramienta: real ? nombreDeHerramienta(destino) : '',
    })
  }
  return out
}
