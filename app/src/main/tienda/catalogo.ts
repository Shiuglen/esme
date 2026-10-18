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

export function verificarCatalogo(texto: string, clavePublicaPem: string): { ok: true; productos: Producto[]; emitido: number } | { ok: false; motivo: string } {
  let c: Partial<Firmado>
  try { c = JSON.parse(texto) } catch { return { ok: false, motivo: 'El catálogo no se puede leer.' } }
  if (!c || typeof c !== 'object' || !Array.isArray(c.productos) || typeof c.firma !== 'string' || typeof c.emitido !== 'number') return { ok: false, motivo: 'El catálogo no tiene la forma esperada.' }
  let valida = false
  try { valida = verify(null, cuerpo(c.emitido, c.productos), createPublicKey(clavePublicaPem), Buffer.from(c.firma, 'base64url')) } catch { valida = false }
  if (!valida) return { ok: false, motivo: 'El catálogo no trae una firma válida de Esme.' }
  if (!c.productos.every(esProducto)) return { ok: false, motivo: 'El catálogo trae productos sin la forma esperada.' }
  return { ok: true, productos: c.productos, emitido: c.emitido }
}
