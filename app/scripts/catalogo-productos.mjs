// Genera src/main/tienda/productos.json: los productos que se publican en la Tienda, SIN firmar.
// La app NUNCA firma: quien firma es el kit (scripts/publicar-catalogo.ts en el repo del kit) con la llave de la
// Tienda. Aquí solo se traduce la colección de la app al formato de la spec abierta `estandar/catalogo-productos.spec.yaml`.
// Uso: node scripts/catalogo-productos.mjs
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const raiz = resolve(import.meta.dirname, '..')

// Las pieles viven en TypeScript (el renderer las usa). Se empaquetan aquí para no duplicar los datos a mano:
// esbuild (viene con vite) resuelve los imports sin extensión y devuelve un módulo que se puede importar tal cual.
const leer = async (entrada) => {
  const r = await build({
    entryPoints: [join(raiz, entrada)],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    logLevel: 'silent',
  })
  const codigo = r.outputFiles[0].text
  return import(`data:text/javascript;base64,${Buffer.from(codigo).toString('base64')}`)
}

const { PIELES_TIENDA } = await leer('src/renderer/tinta/pieles-tienda.ts')

const productos = PIELES_TIENDA.map((p) => ({
  id: p.id,
  tipo: 'piel',
  nombre: p.piel.nombre,
  autor: p.autor,
  descripcion: p.descripcion,
  etiquetas: p.etiquetas,
  version: 1,
  contenido: p.piel,
}))

const destino = join(raiz, 'src/main/tienda/productos.json')
mkdirSync(dirname(destino), { recursive: true })
writeFileSync(destino, `${JSON.stringify({ version: 1, productos }, null, 2)}\n`)
console.log(`${productos.length} productos → ${destino.replace(`${raiz}/`, '')}`)
