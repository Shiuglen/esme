// Cifras de uso para la interfaz: nunca NaN, nada diminuto redondeado a cero.
const ok = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n)

// En español, como se escribe en Latinoamérica: coma decimal, punto de millares y el símbolo delante («$4,50»).
const es = (n: number, d: number) => n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' } as Intl.NumberFormatOptions)

export function fmtUSD(n: number | undefined): string {
  if (!ok(n) || n === 0) return '$0'
  if (n < 0.005) return '<$0,01'
  if (n >= 1000) return `$${es(Math.round(n), 0)}`
  return `$${es(n, 2)}`
}

export function fmtTokens(n: number | undefined): string {
  if (!ok(n)) return '0'
  if (n >= 1e6) return `${es(n / 1e6, 1)} M`
  if (n >= 1e3) return `${es(n / 1e3, 1)} mil`
  return String(Math.round(n))
}

export function pctContexto(usados: number, contexto: number | undefined): number | null {
  if (!ok(contexto) || contexto <= 0 || !ok(usados)) return null
  return Math.max(0, Math.min(100, Math.round((usados / contexto) * 100)))
}
