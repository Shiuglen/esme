// Vista previa de una copia: un servidor estático mínimo, solo en 127.0.0.1 y en un puerto al azar, que sirve la carpeta
// de la copia (nunca fuera de ella) e inyecta en el HTML un inspector: al pasar el ratón resalta elementos y al hacer clic
// le cuenta a Esme cuál es (etiqueta, id, texto, selector), para pedirle al motor un cambio justo ahí.
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { readFile, realpath, stat } from 'node:fs/promises'
import { extname, isAbsolute, join, relative } from 'node:path'

export type Servidor = { url: string; raiz: string; cerrar(): void }

const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg',
  '.wasm': 'application/wasm', '.xml': 'application/xml; charset=utf-8',
}

// Se ejecuta dentro de la página previsualizada. Habla con Esme solo por postMessage; lo que envía es dato, no orden.
export const INSPECTOR = `(() => {
  let activo = false, marco = null, nota = null
  const quitar = () => { marco?.remove(); nota?.remove(); marco = nota = null }
  const pintar = (el) => {
    const r = el.getBoundingClientRect()
    marco ??= document.documentElement.appendChild(Object.assign(document.createElement('div'), { style: 'position:fixed;pointer-events:none;z-index:2147483647;border:1.5px solid #8b6cff;background:rgba(139,108,255,.10);border-radius:4px;transition:all .07s ease-out' }))
    nota ??= document.documentElement.appendChild(Object.assign(document.createElement('div'), { style: 'position:fixed;pointer-events:none;z-index:2147483647;font:500 11px/1 ui-monospace,monospace;color:#fff;background:#8b6cff;padding:3px 6px;border-radius:4px;white-space:nowrap' }))
    Object.assign(marco.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' })
    nota.textContent = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + [...el.classList].slice(0, 2).map((c) => '.' + c).join('')
    Object.assign(nota.style, { left: Math.max(4, r.left) + 'px', top: Math.max(4, r.top - 22) + 'px' })
  }
  const selector = (el) => {
    const partes = []
    while (el && el.nodeType === 1 && partes.length < 5) {
      if (el.id) { partes.unshift('#' + CSS.escape(el.id)); break }
      let p = el.tagName.toLowerCase() + [...el.classList].slice(0, 2).map((c) => '.' + CSS.escape(c)).join('')
      const hermanos = el.parentElement ? [...el.parentElement.children].filter((x) => x.tagName === el.tagName) : []
      if (hermanos.length > 1) p += ':nth-of-type(' + (hermanos.indexOf(el) + 1) + ')'
      partes.unshift(p); el = el.parentElement
    }
    return partes.join(' > ')
  }
  addEventListener('message', (e) => {
    if (e.source !== parent || !e.data || e.data.esme !== 'inspeccionar') return
    activo = !!e.data.activo; document.documentElement.style.cursor = activo ? 'crosshair' : ''; if (!activo) quitar()
  })
  addEventListener('mousemove', (e) => { if (activo && e.target instanceof Element) pintar(e.target) }, true)
  addEventListener('click', (e) => {
    if (!activo || !(e.target instanceof Element)) return
    e.preventDefault(); e.stopPropagation()
    const el = e.target
    parent.postMessage({ esme: 'elegido', etiqueta: el.tagName.toLowerCase(), id: el.id || '', clases: [...el.classList].slice(0, 6),
      texto: (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 140), selector: selector(el), html: el.outerHTML.slice(0, 600) }, '*')
  }, true)
  parent.postMessage({ esme: 'listo', titulo: document.title }, '*')
})()`

const inyectar = (html: string) => {
  const etiqueta = '<script src="/__esme/inspector.js"></script>'
  const i = html.toLowerCase().lastIndexOf('</body>')
  return i >= 0 ? html.slice(0, i) + etiqueta + html.slice(i) : html + etiqueta
}

export async function servirCopia(carpeta: string): Promise<Servidor> {
  const raiz = await realpath(carpeta)
  const srv = createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return }
    let ruta: string
    try { ruta = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname) } catch { res.writeHead(400).end(); return }
    if (ruta === '/__esme/inspector.js') {
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' }).end(INSPECTOR)
      return
    }
    try {
      let f = join(raiz, ruta)
      if ((await stat(f).catch(() => null))?.isDirectory()) f = join(f, 'index.html')
      const real = await realpath(f)                       // falla si no existe; resuelve enlaces
      const rel = relative(raiz, real)
      if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('fuera de la copia')
      if (rel.split(/[\\/]/).some((parte) => parte.startsWith('.'))) throw new Error('oculto')   // .git, .env…: nunca
      const tipo = TIPOS[extname(real).toLowerCase()] ?? 'application/octet-stream'
      const datos = await readFile(real)
      const cuerpo = tipo.startsWith('text/html') ? inyectar(datos.toString('utf8')) : datos
      res.writeHead(200, { 'content-type': tipo, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
      res.end(req.method === 'HEAD' ? undefined : cuerpo)
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('No existe en la copia.')
    }
  })
  await new Promise<void>((ok, mal) => { srv.once('error', mal); srv.listen(0, '127.0.0.1', () => ok()) })
  const { port } = srv.address() as AddressInfo
  return { url: `http://127.0.0.1:${port}/`, raiz, cerrar: () => { srv.closeAllConnections(); srv.close() } }
}
