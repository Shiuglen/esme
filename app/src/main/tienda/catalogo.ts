// El catálogo de la Tienda (docs/superpowers/specs/2026-10-18-la-tienda.md): un JSON con los productos y una firma
// Ed25519 del creador sobre ellos. Esme solo muestra lo que trae una firma válida; cambiar una coma de un producto la
// rompe. Aquí solo se comprueba la firma y la forma; el contenido de cada piel lo valida la ventana con validarPiel.
import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto'

export type TipoProducto = 'piel' | 'herramienta' | 'agente' | 'app'
export type Producto = { id: string; tipo: TipoProducto; nombre: string; autor: string; descripcion: string; etiquetas: string[]; version: number; precio?: number; contenido: Record<string, unknown> }
type Firmado = { version: 1; emitido: number; productos: Producto[]; firma: string }

const TIPOS: TipoProducto[] = ['piel', 'herramienta', 'agente', 'app']
const cuerpo = (emitido: number, productos: Producto[]) => Buffer.from(JSON.stringify({ version: 1, emitido, productos }))

/** Lo usa solo el script del creador para publicar el catálogo. */
export function firmarCatalogo(productos: Producto[], clavePrivadaPem: string, emitido = Date.now()): string {
  const firma = sign(null, cuerpo(emitido, productos), createPrivateKey(clavePrivadaPem)).toString('base64url')
  return JSON.stringify({ version: 1, emitido, productos, firma } satisfies Firmado)
}

const esProducto = (p: unknown): p is Producto => {
  const x = p as Partial<Producto>
  return !!x && typeof x === 'object' && typeof x.id === 'string' && /^[a-z0-9-]{2,60}$/.test(x.id) && TIPOS.includes(x.tipo as TipoProducto)
    && typeof x.nombre === 'string' && typeof x.autor === 'string' && typeof x.descripcion === 'string' && Array.isArray(x.etiquetas)
    && x.etiquetas.every((e) => typeof e === 'string') && typeof x.version === 'number' && (x.precio === undefined || typeof x.precio === 'number')
    && !!x.contenido && typeof x.contenido === 'object' && !Array.isArray(x.contenido)
}

export function verificaCatalogo(texto: string, clavePublicaPem: string | string[], libroRotaciones = ''): { ok: true; productos: Producto[]; emitido: number } | { ok: false; motivo: string } {
  let c: Partial<Firmado>
  try { c = JSON.parse(texto) } catch { return { ok: false, motivo: 'El catálogo no se puede leer.' } }
  if (!c || typeof c !== 'object' || !Array.isArray(c.productos) || typeof c.firma !== 'string' || typeof c.emitido !== 'number') return { ok: false, motivo: 'El catálogo no tiene la forma esperada.' }
  const claves = Array.isArray(clavePublicaPem) ? clavePublicaPem : [clavePublicaPem]
  const libro = libroRotaciones
  let valida = false
  for (const k of claves) {
    try { if (verify(null, cuerpo(c.emitido, c.productos), createPublicKey(k), Buffer.from(c.firma, 'base64url'))) { valida = true; break } } catch { /* esa clave no vale */ }
  }
  if (!valida) {
    // La directa no vale: puede que lo firme una llave más nueva de la estirpe. Entonces se busca en el
    // libro de rotaciones (el mismo que avala la Tienda de módulos): si la raíz llega al firmante por una
    // sucesión firmada, el catálogo vale. Así la Tienda no depende de que alguien edite el código de la app
    // cada vez que rota una llave: la confianza se extiende sola, y la raíz sigue siendo el ancla.
    const encadenada = confiaPorRotaciones(
      { emitido: c.emitido, productos: c.productos, firma: c.firma },
      libro,
    )
    if (!encadenada.ok) return { ok: false, motivo: 'El catálogo no trae una firma válida de Esme.' }
    claves.push(encadenada.pub!)
  }
  if (!c.productos.every(esProducto)) return { ok: false, motivo: 'El catálogo trae productos sin la forma esperada.' }
  if (new Set(c.productos.map((p) => p.id)).size !== c.productos.length) return { ok: false, motivo: 'El catálogo trae dos productos con el mismo id.' }
  return { ok: true, productos: c.productos, emitido: c.emitido }
}

/** El nombre viejo, para lo que ya lo usaba. */
export const verificarCatalogo = verificaCatalogo

/** El catálogo firmado por una llave de la estirpe: se comprueba que la raíz llegue a ella por una sucesión firmada. */
function confiaPorRotaciones(c: { emitido: number; productos: Producto[]; firma: string }, libro: string): { ok: boolean; pub?: string } {
  if (!libro) return { ok: false }
  let l: { sucesiones?: Array<{ vieja?: { huella?: string; pub?: string }; nueva?: { huella?: string; pub?: string } }> }
  try { l = JSON.parse(libro) } catch { return { ok: false } }
  if (!l || typeof l !== 'object' || !Array.isArray(l.sucesiones)) return { ok: false }
  for (const s of l.sucesiones) {
    if (!s || typeof s !== 'object') continue
    for (const lado of [s.nueva, s.vieja]) {
      const pub = lado?.pub
      if (!pub) continue
      try {
        if (verify(null, cuerpo(c.emitido, c.productos), createPublicKey(pub), Buffer.from(c.firma, 'base64url'))) {
          return { ok: true, pub }
        }
      } catch { /* esa llave no vale */ }
    }
  }
  return { ok: false }
}
