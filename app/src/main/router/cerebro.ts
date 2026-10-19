// Qué cerebro responde en la conversación. Además de las IAs con clave, tus agentes (Qwen Code, OpenCode, Claude…) son
// cerebros: «acp:<motor>» habla a través de tu suscripción o tu sesión. Y si un cerebro se agota (límite de lo gratis,
// cuota, clave rechazada), Esme no se queda muda: sigue con uno de tus agentes.
const AGENTE = /^acp:[a-z0-9][a-z0-9._-]*$/

export const esAgente = (p: string): p is `acp:${string}` => AGENTE.test(p)
export const motorDe = (p: `acp:${string}`) => p.slice(4)

export function cerebrosDeAgentes(motores: { id: string; nombre: string; instalado: boolean }[]) {
  return motores.filter((m) => m.instalado).map((m) => ({
    id: `acp:${m.id}`, label: `${m.nombre} · tu agente`, local: true, needsKey: false, hasKey: true, retainsData: false, agente: true,
  }))
}

// un límite se arregla con otro modelo gratis del mismo agente; la falta de sesión o de clave, con otro cerebro
const LIMITE = /rate.?limit|too many requests|\b429\b|quota|insufficient.*(credit|balance|fund)|\b402\b|payment required/i
const SIN_SESION = /missing.*key|falta la clave|\b401\b|unauthori[sz]ed|invalid.*api.?key|authenticat(e|ion) (required|first)/i
export const limite = (error: string) => LIMITE.test(error)
export const sinSesion = (error: string) => SIN_SESION.test(error)
export const agotado = (error: string) => limite(error) || sinSesion(error)
