// La negativa por palabras: el ACP a veces no dice «refusal» — el motor lo dice en el mensaje y el turno acaba
// «end_turn», que contaba como éxito. La regla es conservadora (preferimos pasar una negativa que acusar una que
// no fue): sólo hay negativa si el MENSAJE FINAL del turno es breve y dice claramente que no hará el encargo.
// Un «no puedo ejecutar el binario por permisos» es otra cosa (palabra distinta de «hacer/cumplir/ayudar…»), y un
// mensaje largo suele venir con el trabajo hecho — ése no se acusa. El veredicto del creador corregirá lo que escape.
export const LARGO_NEGATIVA = 400
const RX = new RegExp([
  /no puedo (hacer eso|hacerlo|cumplir|completar|realizar)/.source,
  /no puedo (ayudar)/.source,
  /no (har[eé]|vamos a hacer) (eso|esto|nada)/.source,
  /no me es posible/.source,
  /no me (est[aá]|es) permitido/.source,
  /no es algo que (pued|deba) hacer/.source,
  /va contra (mis|sus) principios/.source,
  /debo (declinar|rechazar)/.source,
  /i can'?t (do that|comply|help you|help with|complete|fulfill)/.source,
  /i (cannot|can'?t) (comply|assist|fulfill|do that)/.source,
  /i'?m unable to (comply|assist|help|do that)/.source,
  /i (won'?t|will not) (comply|do that|do this)/.source,
  /i must decline/.source,
].map((s) => `(${s})`).join('|'), 'i')

/** ¿Es una negativa a la tarea lo último que dijo el motor? `texto`: el último mensaje del turno. */
export function esNegativaTexto(texto: string | undefined): boolean {
  if (!texto) return false
  const t = texto.trim()
  if (!t || t.length > LARGO_NEGATIVA) return false
  return RX.test(t)
}
