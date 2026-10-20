// Preflight: antes de abrir Esme, comprueba que TODO lo que hace falta está en su sitio — y si algo no lo está,
// dice qué hacer para arreglarlo. Es un checklist ejecutable: «dale a este comando y vuelve».
//
//   node scripts/preflight.mjs
//
// No arregla nada por su cuenta (no toca tus claves ni tu mente): solo mira, y lo dice claro.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { build } from 'esbuild'

// Las rutas REALES de la app (no una copia: si la app las cambia, esto cambia con ella).
const rutasDe = async () => {
  const r = await build({ entryPoints: [resolve(import.meta.dirname, '../src/main/rutas.ts')], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' })
  const mod = await import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString('base64')}`)
  return mod.rutasDe({ empaquetada: false, plataforma: platform(), home: homedir(), userData: join(homedir(), '.config', 'esme'), resources: '', env: process.env })
}
const R = await rutasDe()
const python = R.python
const mente = R.mente
const RAIZ = resolve(R.cwdTerminal)

const verde = (s) => `\x1b[32m${s}\x1b[0m`
const rojo = (s) => `\x1b[31m${s}\x1b[0m`
const gris = (s) => `\x1b[90m${s}\x1b[0m`
const ok = (t, d = '') => console.log(`${verde('✔')} ${t}${d ? gris(`  ${d}`) : ''}`)
const mal = (t, como) => console.log(`${rojo('✘')} ${t}\n  ${gris(como)}`)
const info = (t) => console.log(gris(`  ${t}`))

console.log('\nEsme · comprobación de partida\n')

// 1) el Python del cerebro
if (!existsSync(python)) {
  mal('No está el Python del cerebro.', `cd ${RAIZ} && python3 -m venv .venv && .venv/bin/pip install -r cerebro-requisitos.txt`)
  process.exit(1)
}
const deps = await new Promise((r) => {
  const p = spawn(python, ['-c', 'import starlette, mcp, numpy; print("ok")'], { stdio: ['ignore', 'pipe', 'pipe'] })
  let out = ''
  p.stdout.on('data', (d) => { out += d })
  p.on('exit', (code) => r(code === 0 ? 'ok' : 'faltan'))
})
if (deps !== 'ok') {
  mal('El Python del cerebro no tiene todo lo que necesita.', `cd ${RAIZ} && .venv/bin/pip install -r cerebro-requisitos.txt`)
} else {
  ok('El Python del cerebro está con sus dependencias.')
}

// 2) la carpeta de la mente
try {
  mkdirSync(mente, { recursive: true })
  const dentro = existsSync(join(mente, 'mem.db'))
  ok('La mente tiene su sitio.', dentro ? join(mente, 'mem.db') : `${mente} (aún sin recuerdos)`)
} catch (e) {
  mal('No puedo usar la carpeta de la mente.', `${mente}: ${e.message}`)
}

// 3) el cerebro arranca y responde
const envoltorio = 'import os, sys; os.closerange(3, 65536); from daimon.cli import main; a = sys.argv[1:]; main(["serve", "--home", a[0]] + (["--port", a[1]] if len(a) > 1 else []))'
const cerebro = await new Promise((r) => {
  const p = spawn(python, ['-c', envoltorio, mente, '0'], { stdio: ['ignore', 'pipe', 'pipe'] })
  let err = ''
  p.stderr.on('data', (d) => { err += d })
  const rl = createInterface({ input: p.stdout })
  const t = setTimeout(() => r({ error: err || 'tardó demasiado' }), 90_000)
  rl.once('line', (l) => {
    try { const { port, token } = JSON.parse(l); clearTimeout(t); r({ p, port, token }) } catch { /* no es el anuncio */ }
  })
  p.on('exit', (code) => { if (code) { clearTimeout(t); r({ error: err }) } })
})
if (cerebro?.error) {
  // si la mente ya está tomada, no es un fallo: hay un cerebro usando esta mente (el de Esme, si está abierto)
  if (/ya hay un cerebro/i.test(cerebro.error)) {
    ok('Hay un cerebro usando esta mente.', 'si Esme está abierto, es el suyo: no hay nada que hacer')
  } else {
    mal('El cerebro no arranca (o tarda mucho).', cerebro.error.split('\n')[0] || 'Mira el terminal: `daimon serve` a mano dice qué falla.')
  }
} else {
  const base = `http://127.0.0.1:${cerebro.port}`
  const pedir = async (ruta) => {
    const res = await fetch(`${base}${ruta}`, { headers: { Authorization: `Bearer ${cerebro.token}` }, signal: AbortSignal.timeout(10_000) })
    return res.json()
  }
  try {
    const salud = await pedir('/health')
    ok('El cerebro responde.', `${salud.memories} recuerdos en la mente`)
    const rumbo = await pedir('/rumbo')
    const pilares = rumbo.pilares?.length ?? 0, objetivos = rumbo.objetivos?.length ?? 0
    ok('El rumbo está a mano.', pilares || objetivos ? `${pilares} pilares · ${objetivos} objetivos` : 'todavía no has puesto ninguno (el Mando te lo pide)')
    const marca = await pedir('/memories?fuente=x:bookmarks&limit=5')
    ok('Lo que guardaste se lee.', `${marca.length} muestra de tus marcadores`)
  } catch (e) {
    mal('El cerebro arrancó pero no contesta.', e.message)
  } finally {
    cerebro.p.kill('SIGTERM')
  }
}

// 4) los motores: sin motor no hay conversación
const llavero = process.platform === 'darwin' ? join(homedir(), 'Library', 'Keychains') : join(homedir(), '.local', 'share', 'keyrings')
info(`Llavero del sistema: ${existsSync(llavero) ? 'parece estar' : 'no lo veo (las claves de API pueden fallar)'}`)

// 5) la tienda firmada (la red)
try {
  const res = await fetch('https://raw.githubusercontent.com/Shiuglen/esme-tienda/main/catalogo.json', { signal: AbortSignal.timeout(8000) })
  if (res.ok) {
    const cat = await res.json()
    ok('La tienda firmada está publicada.', `${cat.productos.length} productos en el catálogo`)
  } else {
    info(`La tienda firmada no responde (${res.status}): la Tienda enseñará lo de casa.`)
  }
} catch {
  info('Sin red: la Tienda enseñará lo de casa y el catálogo guardado.')
}

console.log(gris('\nSi todo está ✔, abre Esme: npm run dev\n'))
