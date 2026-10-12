// Cifras de uso para la interfaz: nunca NaN, nada diminuto redondeado a cero.
const ok = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n)

export function fmtUSD(n: number | undefined): string {
  if (!ok(n) || n === 0) return '$0'
  if (n < 0.005) return '<$0.01'
  if (n >= 1000) return `$${Math.round(n).toLocaleString('en-US')}`
  return `$${n.toFixed(2)}`
}

export function fmtTokens(n: number | undefined): string {
  if (!ok(n)) return '0'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`
  return String(Math.round(n))
}

export function pctContexto(usados: number, contexto: number | undefined): number | null {
  if (!ok(contexto) || contexto <= 0 || !ok(usados)) return null
  return Math.max(0, Math.min(100, Math.round((usados / contexto) * 100)))
}
