#!/usr/bin/env node
// Prepara el cerebro que viaja dentro de una versión de Esme (docs/superpowers/specs/2026-10-18-versiones.md):
//   build/cerebro-<sistema>/python    un Python 3.13 autónomo (python-build-standalone), comprobado con su SHA-256
//   build/cerebro-<sistema>/paquetes  los paquetes del cerebro para ESE sistema (uv --python-platform) + el código de daimon
// Se puede preparar el de Windows o macOS desde Linux. Uso: node scripts/preparar-cerebro.mjs [linux-x64|win-x64|mac-arm64|mac-x64]
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const RAIZ = resolve(APP, '..')
const PY = '3.13'
const SISTEMAS = {
  'linux-x64': 'x86_64-unknown-linux-gnu', 'win-x64': 'x86_64-pc-windows-msvc',
  'mac-arm64': 'aarch64-apple-darwin', 'mac-x64': 'x86_64-apple-darwin',
}
const actual = `${{ linux: 'linux', win32: 'win', darwin: 'mac' }[process.platform]}-${process.arch}`
const sistema = process.argv[2] ?? actual
const triple = SISTEMAS[sistema]
if (!triple) { console.error(`Sistema desconocido: ${sistema}. Usa uno de: ${Object.keys(SISTEMAS).join(', ')}`); process.exit(1) }

const uv = process.env.UV ?? (existsSync(join(homedir(), '.local/bin/uv')) ? join(homedir(), '.local/bin/uv') : 'uv')
const destino = join(APP, 'build', `cerebro-${sistema}`)
const cache = join(APP, 'build', 'cache')
mkdirSync(cache, { recursive: true })

async function json(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'esme-build', ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) } })
  if (!r.ok) throw new Error(`${url}: ${r.status}`)
  return r.json()
}
async function bajar(url, fichero) {
  if (existsSync(fichero)) return
  const r = await fetch(url, { headers: { 'user-agent': 'esme-build' } })
  if (!r.ok) throw new Error(`${url}: ${r.status}`)
  writeFileSync(fichero, Buffer.from(await r.arrayBuffer()))
}

// 1) el Python autónomo: la última versión 3.13 publicada para este sistema, con su huella comprobada
console.log(`[cerebro] ${sistema}: buscando Python ${PY} autónomo…`)
const rel = await json('https://api.github.com/repos/astral-sh/python-build-standalone/releases/latest')
const patron = new RegExp(`^cpython-${PY.replace('.', '\\.')}\\.\\d+\\+\\d+-${triple}-install_only_stripped\\.tar\\.gz$`)
const asset = rel.assets.find((a) => patron.test(a.name))
const sumas = rel.assets.find((a) => a.name === 'SHA256SUMS')
if (!asset || !sumas) throw new Error(`No hay Python ${PY} para ${triple} en ${rel.tag_name}`)
const tgz = join(cache, asset.name)
await bajar(asset.browser_download_url, tgz)
await bajar(sumas.browser_download_url, join(cache, `SHA256SUMS-${rel.tag_name}`))
const esperada = readFileSync(join(cache, `SHA256SUMS-${rel.tag_name}`), 'utf8').split('\n').find((l) => l.endsWith(asset.name))?.split(/\s+/)[0]
const real = createHash('sha256').update(readFileSync(tgz)).digest('hex')
if (!esperada || esperada !== real) { rmSync(tgz, { force: true }); throw new Error(`La huella de ${asset.name} no coincide: descarga corrupta o alterada.`) }
console.log(`[cerebro] ${asset.name} ✓ sha256 ${real.slice(0, 16)}…`)

rmSync(destino, { recursive: true, force: true })
mkdirSync(destino, { recursive: true })
execFileSync('tar', ['-xzf', tgz, '-C', destino], { stdio: 'inherit' })   // deja destino/python

// 2) los paquetes del cerebro para ESE sistema (solo ruedas ya compiladas: nada se compila en la máquina del usuario)
console.log('[cerebro] instalando paquetes…')
const paquetes = join(destino, 'paquetes')
execFileSync(uv, ['pip', 'install', '--quiet', '--target', paquetes, '--python-version', PY, '--python-platform', triple,
  '--only-binary', ':all:', '-r', join(RAIZ, 'cerebro-requisitos.txt')], { stdio: 'inherit' })

// 3) el código del cerebro, sin cachés ni bancos de pruebas
cpSync(join(RAIZ, 'daimon'), join(paquetes, 'daimon'), { recursive: true, filter: (p) => !/__pycache__|[\\/]bench([\\/]|$)/.test(p) })
writeFileSync(join(destino, 'VERSION.json'), JSON.stringify({ sistema, triple, python: asset.name, publicado: rel.tag_name, preparado: new Date().toISOString() }, null, 2))
console.log(`[cerebro] listo en ${destino}`)
