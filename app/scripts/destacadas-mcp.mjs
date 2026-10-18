#!/usr/bin/env node
// Prepara las herramientas destacadas que viajan dentro de Esme (se ven al instante y sin conexión): las oficiales de
// cada empresa, traducidas a fichas con la misma lógica que la app. Uso: node scripts/destacadas-mcp.mjs
import { writeFileSync } from 'node:fs'
import { buscarEnRegistro, DESTACADAS } from '../src/main/herramientas/registro-mcp.ts'

const encontradas = new Map()
for (const id of DESTACADAS) {
  const empresa = id.split('/')[0].split('.').find((p) => !['com', 'ai', 'app', 'co', 'mcp', 'io'].includes(p)) ?? id
  for (let i = 0; i < 4 && !encontradas.has(id); i++) {
    try { for (const f of await buscarEnRegistro(empresa)) if (DESTACADAS.includes(f.id)) encontradas.set(f.id, f) } catch { await new Promise((r) => setTimeout(r, 1500)) }
  }
  console.log(encontradas.has(id) ? '✓' : '✗', id)
}
const fichas = DESTACADAS.map((id) => encontradas.get(id)).filter(Boolean)
writeFileSync(new URL('../src/main/herramientas/destacadas.json', import.meta.url), JSON.stringify(fichas, null, 1) + '\n')
console.log(`${fichas.length}/${DESTACADAS.length} destacadas guardadas`)
