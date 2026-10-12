// Router en tres niveles (alto/medio/bajo): clasifica modelos, elige el motor de cada paso, escala y aprende de la persona.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { ModeloCatalogo } from '../catalogo/modelsdev'

export type Nivel = 'alto' | 'medio' | 'bajo'
export type TipoPaso = 'planificar' | 'juzgar' | 'construir' | 'escribir' | 'conversar' | 'leer' | 'ordenar' | 'condensar' | 'enrutar'

export function nivelDe(t: TipoPaso): Nivel {
  if (t === 'planificar' || t === 'juzgar') return 'alto'
  if (t === 'construir' || t === 'escribir' || t === 'conversar') return 'medio'
  return 'bajo'
}

export type Candidato = { proveedor: string; modelo: string; nivel: Nivel; costeEntrada: number; costeSalida: number; gratis: boolean
  herramientas: boolean; contexto: number; retieneDatos?: boolean }

const RE_ALTO = /opus|ultra|gpt-6(?!.*(mini|nano))|\bpro\b|o\d-pro|deep-?think/i
// «mini» con límites de letra para que «gemini» no cuente como pequeño.
const RE_BAJO = /haiku|flash-lite|(?<![a-z])mini(?![a-z])|nano|small|lite|\b[1-9]b\b|1[0-4]b/i

export function clasificarModelo(m: ModeloCatalogo): Nivel {
  const nombre = `${m.id} ${m.nombre}`
  if (RE_ALTO.test(nombre)) return 'alto'
  if (RE_BAJO.test(nombre)) return 'bajo'
  if (m.gratis) return 'medio'
  if (m.coste.salida >= 10) return 'alto'
  if (m.coste.salida <= 1.2) return 'bajo'
  return 'medio'
}

type Opciones = { preferirGratis: boolean; requiereHerramientas?: boolean; contextoMinimo?: number
  fijado?: { proveedor: string; modelo: string }; calidad?: (t: TipoPaso, c: Candidato) => number; evitarRetencion?: boolean }
type Eleccion = { candidato: Candidato; nivel: Nivel; degradado: boolean; motivo: string }

const ORDEN: Nivel[] = ['bajo', 'medio', 'alto']
// Busca primero el nivel objetivo, luego los superiores y por último los inferiores.
const nivelesDeBusqueda = (obj: Nivel): Nivel[] => { const i = ORDEN.indexOf(obj); return [obj, ...ORDEN.slice(i + 1), ...ORDEN.slice(0, i).reverse()] }

export function elegir(t: TipoPaso, cs: Candidato[], o: Opciones): Eleccion | null {
  if (o.fijado) {
    const f = cs.find(c => c.proveedor === o.fijado!.proveedor && c.modelo === o.fijado!.modelo)
    if (f) return { candidato: f, nivel: f.nivel, degradado: false, motivo: `${f.nivel} · fijado por ti` }
  }
  const validos = cs.filter(c => (!o.requiereHerramientas || c.herramientas) && (!o.contextoMinimo || c.contexto >= o.contextoMinimo) && !(o.evitarRetencion && c.retieneDatos))
  if (!validos.length) return null
  const objetivo = nivelDe(t), cal = (c: Candidato) => { const q = o.calidad?.(t, c); return typeof q === 'number' && Number.isFinite(q) ? q : 0.5 }
  const punt = (c: Candidato) => cal(c) / ((c.costeEntrada + c.costeSalida) / 2 + 0.01)
  const mejor = (l: Candidato[]) => l.reduce((a, b) => (punt(b) > punt(a) ? b : a))
  for (const nivel of nivelesDeBusqueda(objetivo)) {
    const pool = validos.filter(c => c.nivel === nivel)
    if (!pool.length) continue
    let ganador = mejor(pool), razon = ganador.gratis ? 'gratis' : 'mejor calidad por precio'
    const gratis = pool.filter(c => c.gratis), pago = pool.filter(c => !c.gratis)
    if (o.preferirGratis && gratis.length && pago.length) {
      const g = mejor(gratis), p = mejor(pago)
      if (cal(g) > cal(p) - 0.2 + 1e-9) { ganador = g; razon = 'gratis' } else { ganador = p; razon = 'de pago, el gratis rinde bastante menos' }
    }
    const degradado = nivel !== objetivo
    return { candidato: ganador, nivel, degradado,
      motivo: `${nivel} · ${razon} · ${degradado ? `sin modelos de nivel ${objetivo}, uso este para ${t}` : `el que mejor sabe ${t}`}` }
  }
  return null
}

export function escalar(e: { nivel: Nivel; confianza?: number; fallos: number; comprobacionOk?: boolean; sensible?: boolean }):
  { a: Nivel | 'persona'; motivo: string } | null {
  if (e.sensible) return { a: 'persona', motivo: 'Decide una persona: dinero, clientes, borrados o algo público' }
  if (e.nivel === 'bajo' && ((e.confianza !== undefined && e.confianza < 0.7) || e.comprobacionOk === false))
    return { a: 'medio', motivo: e.comprobacionOk === false ? 'La comprobación falló en el nivel bajo' : 'Poca confianza en el nivel bajo' }
  if (e.nivel === 'medio' && e.fallos >= 2) return { a: 'alto', motivo: 'Dos fallos en el nivel medio' }
  if (e.nivel === 'alto' && e.fallos >= 2) return { a: 'persona', motivo: 'Dos fallos en el nivel alto: que lo vea una persona' }
  return null
}

type Cuenta = { aciertos: number; n: number }
const PESO = { aprobado: 1, editado: 0.5, rechazado: 0 } as const

export class Aprendizaje {
  private datos: Record<string, Cuenta> = {}
  constructor(private archivo?: string) {
    if (!archivo) return
    try { const j = JSON.parse(readFileSync(archivo, 'utf8')); if (j && typeof j === 'object' && !Array.isArray(j)) this.datos = j } catch { /* vacío o corrupto */ }
  }
  private clave = (t: TipoPaso, p: string, m: string) => `${t}|${p}|${m}`
  registrar(t: TipoPaso, proveedor: string, modelo: string, r: 'aprobado' | 'editado' | 'rechazado'): void {
    const k = this.clave(t, proveedor, modelo), c = this.datos[k] ?? { aciertos: 0, n: 0 }
    c.aciertos += PESO[r]; c.n += 1; this.datos[k] = c
    if (!this.archivo) return
    try { mkdirSync(dirname(this.archivo), { recursive: true }); writeFileSync(this.archivo, JSON.stringify(this.datos)) } catch { /* sin disco: queda en memoria */ }
  }
  calidad(t: TipoPaso, proveedor: string, modelo: string): number {
    const c = this.datos[this.clave(t, proveedor, modelo)] ?? { aciertos: 0, n: 0 }
    return (c.aciertos + 2) / (c.n + 4)
  }
}
