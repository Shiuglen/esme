// Uso cuenta historias, no tablas (lección del FYP: «Where the profit went»): un titular con lo que pasó en el rango y un
// detalle con quién trabajó más o adónde se fue tu dinero.
import { nombreDeModelo } from '../lib/modelos'

type Modelo = { modelo: string; proveedor: string; tokens: number; costeUSD: number; llamadas: number }

const decimal = (n: number, d = 1) => n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d })
const tokens = (n: number) => (n >= 1e6 ? `${decimal(n / 1e6)} millones de` : n >= 1e3 ? `${decimal(n / 1e3)} mil` : String(n))
const pct = (a: number, b: number) => `${Math.round((a / Math.max(b, 1e-9)) * 100)} %`

export function historiaDeUso(r: { costeUSD: number; tokens: number; porModelo: Modelo[] }): { titular: string; detalle: string } {
  const respuestas = r.porModelo.reduce((s, m) => s + m.llamadas, 0)
  if (!respuestas) return { titular: 'Aún no hay uso en este rango.', detalle: 'Cada respuesta y cada tarea quedan anotadas aquí, con su coste real.' }
  const total = r.porModelo.reduce((s, m) => s + m.tokens, 0)
  const nombre = (m: Modelo) => `${nombreDeModelo(m.modelo)} (${m.proveedor})`
  if (r.costeUSD > 0) {
    const caro = [...r.porModelo].sort((a, b) => b.costeUSD - a.costeUSD)[0]
    return { titular: `Gastaste $${decimal(r.costeUSD, 2)} en ${respuestas} ${respuestas === 1 ? 'respuesta' : 'respuestas'}.`, detalle: `El ${pct(caro.costeUSD, r.costeUSD)} se fue en ${nombre(caro)}.` }
  }
  const mas = [...r.porModelo].sort((a, b) => b.tokens - a.tokens)[0]
  return { titular: `${respuestas} ${respuestas === 1 ? 'respuesta' : 'respuestas'} y ${tokens(total)} tokens, sin gastar un céntimo.`, detalle: `Quien más trabajó: ${nombre(mas)}, con el ${pct(mas.tokens, total)} de los tokens.` }
}
