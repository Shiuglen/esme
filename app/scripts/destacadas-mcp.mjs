#!/usr/bin/env node
// Prepara las herramientas destacadas que viajan dentro de Esme (se ven al instante y sin conexión): las oficiales de
// cada empresa, traducidas a fichas con la misma lógica que la app. Uso: node scripts/destacadas-mcp.mjs
import { writeFileSync } from 'node:fs'
import { buscarEnRegistro, DESTACADAS } from '../src/main/herramientas/registro-mcp.ts'

/** Por qué buscar cada una: primero el identificador exacto (el registro lo acepta), luego el nombre
 *  corto y por último la empresa. Con sólo la empresa, REA (io.github.morluto/rea) se perdía: su
 *  «empresa» es github, y ahí no está. */
const terminos = (id) => {
  const [dominio = '', nombre = ''] = id.split('/')
  const empresa = dominio.split('.').find((p) => !['com', 'ai', 'app', 'co', 'mcp', 'io', 'dev', 'org', 'net', 'sh'].includes(p))
  return [...new Set([id, nombre, empresa].filter(Boolean))]
}

const encontradas = new Map()
for (const id of DESTACADAS) {
  for (const t of terminos(id)) {
    if (encontradas.has(id)) break
    // El registro responde a veces con un 500 o se calla: se reintenta el mismo término antes de
    // pasar al siguiente (una búsqueda puede fallar sin que la herramienta no exista).
    for (let intento = 0; intento < 3 && !encontradas.has(id); intento++) {
      try {
        for (const f of await buscarEnRegistro(t)) if (DESTACADAS.includes(f.id)) encontradas.set(f.id, f)
      } catch { await new Promise((r) => setTimeout(r, 2000 * (intento + 1))) }
    }
  }
  console.log(encontradas.has(id) ? '✓' : '✗', id)
}
const fichas = DESTACADAS.map((id) => encontradas.get(id)).filter(Boolean)
writeFileSync(new URL('../src/main/herramientas/destacadas.json', import.meta.url), JSON.stringify(fichas, null, 1) + '\n')
console.log(`${fichas.length}/${DESTACADAS.length} destacadas guardadas`)
