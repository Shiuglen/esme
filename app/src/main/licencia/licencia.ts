// Licencias de Esme (docs/superpowers/specs/2026-10-17-planes-y-licencias.md): un código «ESME-<datos>.<firma>» con los
// datos en JSON y una firma Ed25519 del creador. La app solo tiene la clave pública: comprueba, nunca fabrica. Cambiar
// una letra de los datos (el plan, la fecha) rompe la firma.
import { createPrivateKey, createPublicKey, randomBytes, sign, verify } from 'node:crypto'

export type PlanPago = 'colaborador' | 'pro' | 'equipo'
export type Plan = 'gratis' | PlanPago
export type Licencia = { id: string; para: string; plan: PlanPago; desde: number; hasta?: number }
export type Lectura = { ok: true; licencia: Licencia } | { ok: false; motivo: string }

export const PLANES: Record<Plan, { nombre: string; para: string }> = {
  gratis: { nombre: 'Gratis', para: 'Con tus propios motores, sin límites durante la beta.' },
  colaborador: { nombre: 'Colaborador', para: 'El equipo del creador de Esme: todo incluido, por invitación.' },
  pro: { nombre: 'Pro', para: 'Para quien vive en Esme.' },
  equipo: { nombre: 'Equipo', para: 'Para empresas y equipos.' },
}
const PAGO: PlanPago[] = ['colaborador', 'pro', 'equipo']
const PREFIJO = 'ESME-'

/** Lo usa solo el script del creador (scripts/esme-licencias.mjs): la clave privada nunca entra en la app. */
export function firmarLicencia(d: Omit<Licencia, 'id'> & { id?: string }, clavePrivadaPem: string): string {
  const datos: Licencia = { id: d.id ?? randomBytes(6).toString('base64url'), para: d.para, plan: d.plan, desde: d.desde, ...(d.hasta ? { hasta: d.hasta } : {}) }
  const cuerpo = Buffer.from(JSON.stringify(datos))
  const firma = sign(null, cuerpo, createPrivateKey(clavePrivadaPem))
  return `${PREFIJO}${cuerpo.toString('base64url')}.${firma.toString('base64url')}`
}

const fecha = (ms: number) => new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
const NO = (motivo: string): Lectura => ({ ok: false, motivo })

export function leerLicencia(texto: string, clavePublicaPem: string, ahora = Date.now()): Lectura {
  const codigo = texto.replace(/\s+/g, '')
  if (!codigo.startsWith(PREFIJO)) return NO('Eso no parece un código de Esme: empieza por «ESME-».')
  const [cuerpo, firma, ...resto] = codigo.slice(PREFIJO.length).split('.')
  if (!cuerpo || !firma || resto.length || !/^[\w-]+$/.test(cuerpo) || !/^[\w-]+$/.test(firma)) return NO('El código está incompleto: cópialo entero.')
  const bytes = Buffer.from(cuerpo, 'base64url')
  let autentico = false
  try { autentico = verify(null, bytes, createPublicKey(clavePublicaPem), Buffer.from(firma, 'base64url')) } catch { autentico = false }
  if (!autentico) return NO('Este código no es auténtico: no lo firmó Esme.')
  let d: Partial<Licencia>
  try { d = JSON.parse(bytes.toString('utf8')) } catch { return NO('El código está dañado.') }
  if (typeof d.para !== 'string' || typeof d.desde !== 'number' || typeof d.id !== 'string' || !PAGO.includes(d.plan as PlanPago)) return NO('El código es de un plan que esta versión de Esme no conoce.')
  if (d.hasta !== undefined && (typeof d.hasta !== 'number' || d.hasta < ahora)) return NO(`Este código caducó el ${fecha(Number(d.hasta))}. Pide uno nuevo.`)
  return { ok: true, licencia: { id: d.id, para: d.para, plan: d.plan as PlanPago, desde: d.desde, ...(d.hasta ? { hasta: d.hasta } : {}) } }
}

export type EstadoPlan = { plan: Plan; nombre: string; para?: string; hasta?: number; aviso?: string }
/** El plan que tienes según el código guardado: sin código, Gratis; si el código ya no vale, Gratis con el porqué. */
export function estadoDe(codigo: string | null, clavePublicaPem: string, ahora = Date.now()): EstadoPlan {
  if (!codigo) return { plan: 'gratis', nombre: PLANES.gratis.nombre }
  const r = leerLicencia(codigo, clavePublicaPem, ahora)
  if (!r.ok) return { plan: 'gratis', nombre: PLANES.gratis.nombre, aviso: r.motivo }
  const { plan, para, hasta } = r.licencia
  return { plan, nombre: PLANES[plan].nombre, para, ...(hasta ? { hasta } : {}) }
}
