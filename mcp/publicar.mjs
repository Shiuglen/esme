#!/usr/bin/env node
// Valida (y, si se lo pides, publica) la entrada de Esme en el Registro oficial de MCP.
//   node mcp/publicar.mjs              → valida contra el registro y explica qué falta
//   node mcp/publicar.mjs --publicar   → publica (necesita REGISTRY_TOKEN, que da el registro tras
//                                         iniciar sesión con GitHub)
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const REGISTRO = 'https://registry.modelcontextprotocol.io'
// Hay dos entradas y son cosas distintas: el conector (paquete) y la mente en marcha (remoto).
// Se pueden validar y publicar por separado: `node mcp/publicar.mjs remoto --publicar`.
const cual = process.argv[2] === 'remoto' ? 'server-remoto.json' : 'server.json'
const fichero = new URL(`./${cual}`, import.meta.url)
const entrada = JSON.parse(readFileSync(fichero, 'utf8'))
const publicar = process.argv.includes('--publicar')
const token = process.env.REGISTRY_TOKEN

const post = async (ruta, cuerpo, cabeceras = {}) => {
  const r = await fetch(`${REGISTRO}${ruta}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...cabeceras }, body: JSON.stringify(cuerpo) })
  const texto = await r.text()
  let json = null
  try { json = JSON.parse(texto) } catch { /* el registro a veces contesta con texto */ }
  return { ok: r.ok, status: r.status, json, texto }
}

console.log(`Entrada: ${cual} (${entrada.name})`)
const v = await post('/v0/validate', entrada)
if (v.ok) {
  console.log('✅ la entrada es válida según el registro oficial.')
  for (const s of v.json?.warnings ?? []) console.log('   aviso:', s)
} else {
  console.log('❌ el registro no acepta la entrada todavía:')
  for (const e of v.json?.errors ?? [{ message: v.texto }]) console.log('   ·', e.message ?? e)
}

if (!publicar) {
  console.log('\nPara publicarla de verdad:')
  console.log('  1. Sube el cerebro a PyPI con el nombre del fichero (daimon-esme) y la versión de la entrada.')
  console.log('  2. Pide un token al registro (inicio de sesión con GitHub) y expónlo como REGISTRY_TOKEN.')
  console.log('  3. node mcp/publicar.mjs --publicar')
  process.exit(v.ok ? 0 : 1)
}

if (!token) {
  console.log('\nFalta REGISTRY_TOKEN: sin token el registro no deja publicar.')
  process.exit(1)
}
const p = await post('/v0/publish', entrada, { Authorization: `Bearer ${token}` })
console.log(p.ok ? `✅ publicada: ${JSON.stringify(p.json)}` : `❌ no publicada (${p.status}): ${p.texto}`)
process.exit(p.ok ? 0 : 1)
