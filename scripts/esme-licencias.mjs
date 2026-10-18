#!/usr/bin/env node
// Las licencias de Esme, del lado del creador (docs/superpowers/specs/2026-10-17-planes-y-licencias.md).
//   node scripts/esme-licencias.mjs claves                         crea tu par de claves (una sola vez)
//   node scripts/esme-licencias.mjs invitar --para "Ana" [--plan colaborador|pro|equipo] [--dias 365 | --siempre]
// La clave privada vive en ~/.config/esme-licencias/privada.pem (solo tú puedes leerla). Nunca va al repo ni al vault.
// El formato tiene que ser el mismo que lee la app (app/src/main/licencia/licencia.ts).
import { createPrivateKey, generateKeyPairSync, randomBytes, sign } from 'node:crypto'
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = join(homedir(), '.config', 'esme-licencias')
const PRIVADA = join(DIR, 'privada.pem')
const PUBLICA_TS = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'src', 'main', 'licencia', 'clave-publica.ts')
const [orden, ...args] = process.argv.slice(2)
const opcion = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined }
const salir = (m) => { console.error(m); process.exit(1) }

if (orden === 'claves') {
  if (existsSync(PRIVADA) && !args.includes('--forzar')) salir(`Ya tienes claves en ${PRIVADA}. Si de verdad quieres otras (los códigos viejos dejarán de valer), añade --forzar.`)
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  mkdirSync(DIR, { recursive: true, mode: 0o700 }); chmodSync(DIR, 0o700)
  writeFileSync(PRIVADA, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 })
  const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString().trim()
  writeFileSync(PUBLICA_TS, `// La clave PÚBLICA de las licencias de Esme: sirve para comprobar códigos, no para fabricarlos.\n// La creó scripts/esme-licencias.mjs; la privada está solo en el equipo del creador.\nexport const CLAVE_PUBLICA = \`${pem}\`\n`)
  console.log(`Listo. Clave privada: ${PRIVADA} (permisos 600). Clave pública escrita en la app: ${PUBLICA_TS}`)
} else if (orden === 'invitar') {
  const para = opcion('para'); if (!para) salir('Falta --para "Nombre".')
  const plan = opcion('plan') ?? 'colaborador'
  if (!['colaborador', 'pro', 'equipo'].includes(plan)) salir('El plan tiene que ser colaborador, pro o equipo.')
  if (!existsSync(PRIVADA)) salir('Aún no tienes claves: ejecuta primero «node scripts/esme-licencias.mjs claves».')
  const desde = Date.now(), dias = Number(opcion('dias') ?? 365)
  const datos = { id: randomBytes(6).toString('base64url'), para, plan, desde, ...(args.includes('--siempre') ? {} : { hasta: desde + dias * 864e5 }) }
  const cuerpo = Buffer.from(JSON.stringify(datos))
  const firma = sign(null, cuerpo, createPrivateKey(readFileSync(PRIVADA)))
  // el registro guarda a quién invitaste y hasta cuándo, no el código (el código es como una llave: solo lo tiene esa persona)
  appendFileSync(join(DIR, 'emitidas.csv'), `${new Date(desde).toISOString()},${datos.id},${JSON.stringify(para)},${plan},${datos.hasta ? new Date(datos.hasta).toISOString() : 'siempre'}\n`)
  console.log(`ESME-${cuerpo.toString('base64url')}.${firma.toString('base64url')}`)
} else {
  console.log('Uso:\n  node scripts/esme-licencias.mjs claves\n  node scripts/esme-licencias.mjs invitar --para "Nombre" [--plan colaborador|pro|equipo] [--dias 365 | --siempre]')
}
