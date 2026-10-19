// El nombre legible de un modelo: los ids llegan crudos y envueltos («Qwen3 Coder (OpenRouter · poolside/laguna-s-2.1:free)»,
// «nvidia/nemotron-3.5-lightning:free») y la interfaz acababa enseñando «laguna-s-2.1:free)». Aquí se desenvuelve, se quita
// el proveedor y la marca de gratis, y se escribe como lo diría una persona: «Laguna S 2.1».
const interior = (m: string) => {
  const p = m.match(/\(([^()]*)\)\s*$/)
  return (p ? p[1] : m).split('·').pop()!.trim()
}
const numero = (k: string) => /^\d+(\.\d+)?$/.test(k)

export const esGratis = (m: string | null | undefined) => !!m && /[:-]free$/i.test(interior(m))

export function nombreDeModelo(m: string | null | undefined): string {
  if (!m) return ''
  const x = interior(m)
  if (/\s/.test(x) && !x.includes('/')) return x   // ya viene legible
  const out: string[] = []
  for (const k of x.split('/').pop()!.replace(/[:-]free$/i, '').split(/[-_]/).filter(Boolean)) {
    if (numero(k) && out.length && numero(out[out.length - 1])) { out[out.length - 1] += `.${k}`; continue }   // 5-5 → 5.5
    out.push(/^\d/.test(k) ? k : k.length <= 3 && /^[a-z]+$/i.test(k) ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1))
  }
  return out.join(' ')
}
