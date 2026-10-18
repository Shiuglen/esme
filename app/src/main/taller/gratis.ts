// Cuando un modelo gratis llega a su límite, el Taller no se rinde: pasa a otro gratis del mismo motor que aún no haya
// probado en esa tarea. Nunca a uno de pago sin que lo elijas tú.
import type { OpcionConfig } from '../motores/sesion-acp'

const GRATIS = /(^|[-:_/])free($|[-:_/])|gratis/i
export function otroModeloGratis(opciones: OpcionConfig[] | undefined, probados: Set<string>): string | null {
  const m = opciones?.find((o) => o.id === 'model')
  if (!m) return null
  return m.valores.find((v) => GRATIS.test(v.id) && v.id !== m.actual && !probados.has(v.id))?.id ?? null
}
