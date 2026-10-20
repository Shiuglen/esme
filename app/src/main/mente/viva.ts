// La mente de la app traducida al contrato del kit.
//
// El módulo nunca habla con la mente: habla con la puerta, y la puerta la
// monta el host. Lo que la app le da al kit es esta traducción: el Tálamo de
// verdad (el cerebro en Python) detrás de la forma que el kit entiende.
//
// La traducción es honesta: lo que el cerebro no tiene, no se inventa. El
// Tálamo compone el contexto (no devuelve recuerdos sueltos), así que el
// `recall` devuelve los ids que el Tálamo eligió con el texto de cada uno
// cuando puede, y con el contexto compuesto cuando no puede.
import type { MenteViva } from 'esme-platform/core/ipc/mind-schema-types'
import type { ClienteCerebro } from './cliente'

export const menteViva = (cliente: ClienteCerebro): MenteViva => ({
  recall: async (query: string, budget?: number) => {
    const r = await cliente.recordar(query, budget === undefined ? {} : { budget })
    if (!r.ids.length) return r.context ? [{ id: 'contexto', texto: r.context, tokens: r.tokens }] : []
    // el texto de cada recuerdo, si el Tálamo lo tiene a mano
    const detalle = new Map<string, string>()
    try {
      for (const x of await cliente.recuerdos(query, 50)) if (x.id) detalle.set(String(x.id), String(x.text ?? ''))
    } catch { /* con el contexto compuesto basta */ }
    return r.ids.map((id) => ({ id, texto: detalle.get(id) ?? r.context, tokens: r.tokens }))
  },
  remember: async (text: string, kind?: string) => cliente.escribir(text, kind ?? 'note'),
  rumbo: async () => cliente.rumbo(),
})
