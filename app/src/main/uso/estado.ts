// Funciones puras del estado de uso: precio con tolerancia, límites de día/mes locales y transición de alertas.
import type { ModeloCatalogo, ProveedorCatalogo } from '../catalogo/modelsdev'
import { evaluarPresupuesto, type Presupuesto, type RegistroUso } from './registro'

export type Evaluacion = ReturnType<typeof evaluarPresupuesto>
export type EstadoUso = { hoyUSD: number; mesUSD: number; tokensHoy: number; ahorradosHoy: number; presupuesto: Presupuesto; evaluacion: Evaluacion }
export const PRESUPUESTO_DEFECTO: Presupuesto = { avisos: [0.5, 0.8, 1] }

type Precio = Pick<ModeloCatalogo, 'coste'>

// Busca el precio por proveedor+modelo; si no está en ese proveedor, por id de modelo en cualquiera.
export function buscarPrecio(ps: ProveedorCatalogo[], proveedor: string, modelo: string): Precio | undefined {
  const exacto = ps.find((p) => p.id === proveedor)?.modelos.find((m) => m.id === modelo)
  if (exacto) return exacto
  for (const p of ps) { const m = p.modelos.find((x) => x.id === modelo); if (m) return m }
  return undefined
}

export function limitesLocales(ahora: number): { inicioDia: number; inicioMes: number } {
  const d = new Date(ahora)
  return { inicioDia: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), inicioMes: new Date(d.getFullYear(), d.getMonth(), 1).getTime() }
}

export function calcularEstado(registro: Pick<RegistroUso, 'resumen'>, precio: (p: string, m: string) => Precio | undefined, presupuesto: Presupuesto, ahora: number): EstadoUso {
  const { inicioDia, inicioMes } = limitesLocales(ahora)
  const hoy = registro.resumen({ desde: inicioDia, hasta: ahora, precio })
  const mes = registro.resumen({ desde: inicioMes, hasta: ahora, precio })
  return { hoyUSD: hoy.costeUSD, mesUSD: mes.costeUSD, tokensHoy: hoy.tokens, ahorradosHoy: hoy.ahorradosMemoria, presupuesto,
    evaluacion: evaluarPresupuesto(hoy.costeUSD, mes.costeUSD, presupuesto) }
}

// Se alerta solo al empeorar de estado (ok a aviso, o a límite); no al bajar ni al repetir.
export function hayAlerta(antes: Evaluacion['estado'], despues: Evaluacion['estado']): boolean {
  const rango = { ok: 0, aviso: 1, limite: 2 }
  return rango[despues] > rango[antes]
}

export function normalizarPresupuesto(x: unknown): Presupuesto {
  const o = x && typeof x === 'object' ? (x as Record<string, unknown>) : {}
  const tope = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined)
  const avisos = Array.isArray(o.avisos) ? o.avisos.filter((a): a is number => typeof a === 'number' && Number.isFinite(a) && a > 0) : PRESUPUESTO_DEFECTO.avisos
  const p: Presupuesto = { avisos }
  const d = tope(o.diarioUSD), m = tope(o.mensualUSD)
  if (d !== undefined) p.diarioUSD = d
  if (m !== undefined) p.mensualUSD = m
  return p
}

export type ProveedorResumen = { id: string; nombre: string; env: string[]; modelos: number; gratis: number }
export function resumirProveedores(ps: ProveedorCatalogo[]): ProveedorResumen[] {
  return ps.map((p) => ({ id: p.id, nombre: p.nombre, env: p.env, modelos: p.modelos.length, gratis: p.modelos.filter((m) => m.gratis).length }))
    .sort((a, b) => b.modelos - a.modelos || a.nombre.localeCompare(b.nombre))
}
