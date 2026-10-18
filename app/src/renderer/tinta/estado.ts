// En qué estado está Esme (lo que enseña su presencia: la esfera, el orbe de voz o la cara) y qué suena con cada cosa
// que pasa (la pieza «sonido»). Lógica pura: los componentes solo la traducen a su forma.
export type EstadoEsme = 'escuchando' | 'hablando' | 'pensando' | 'te-necesita' | 'trabajando' | 'reposo'

export function estadoDeEsme(e: { escuchando: boolean; hablando: boolean; pensando: boolean; trabajando: number; esperando: number }): EstadoEsme {
  if (e.escuchando) return 'escuchando'
  if (e.hablando) return 'hablando'
  if (e.pensando) return 'pensando'
  if (e.esperando > 0) return 'te-necesita'
  if (e.trabajando > 0) return 'trabajando'
  return 'reposo'
}

export type EventoSonoro = 'pulsar' | 'escuchar' | 'callar' | 'respuesta' | 'listo' | 'error' | 'aviso'
export type ModoSonido = 'nada' | 'avisos' | 'completo'
export type NombreSonido = 'clickSoft' | 'switchOn' | 'switchOff' | 'notificationPop' | 'successChime' | 'errorBuzz'
const SONIDOS: Record<EventoSonoro, NombreSonido> = { pulsar: 'clickSoft', escuchar: 'switchOn', callar: 'switchOff', respuesta: 'notificationPop', listo: 'successChime', error: 'errorBuzz', aviso: 'notificationPop' }

/** Qué sonido toca un evento con el modo elegido; null si se calla. «avisos» deja fuera el clic de cada pulsación. */
export function sonidoPara(evento: EventoSonoro, modo: ModoSonido): NombreSonido | null {
  if (modo === 'nada' || (modo === 'avisos' && evento === 'pulsar')) return null
  return SONIDOS[evento]
}
