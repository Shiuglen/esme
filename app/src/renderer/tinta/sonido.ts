// El sonido de Esme (pieza «sonido»): sonidos de interfaz de Kenney (CC0, vía soundcn) reproducidos con Web Audio.
// Se cargan solo la primera vez que suenan. El modo lo pone la piel; nada suena con «Silencio».
import { sonidoPara, type EventoSonoro, type ModoSonido, type NombreSonido } from './estado'

let modo: ModoSonido = 'avisos'
export const ponerModoSonido = (m: ModoSonido) => { modo = m }

const cargar: Record<NombreSonido, () => Promise<{ dataUri: string }>> = {
  clickSoft: () => import('../ui/sonido/sounds/click-soft/click-soft').then((m) => m.clickSoftSound),
  switchOn: () => import('../ui/sonido/sounds/switch-on/switch-on').then((m) => m.switchOnSound),
  switchOff: () => import('../ui/sonido/sounds/switch-off/switch-off').then((m) => m.switchOffSound),
  notificationPop: () => import('../ui/sonido/sounds/notification-pop/notification-pop').then((m) => m.notificationPopSound),
  successChime: () => import('../ui/sonido/sounds/success-chime/success-chime').then((m) => m.successChimeSound),
  errorBuzz: () => import('../ui/sonido/sounds/error-buzz/error-buzz').then((m) => m.errorBuzzSound),
}
const VOLUMEN: Partial<Record<NombreSonido, number>> = { clickSoft: 0.35, switchOn: 0.5, switchOff: 0.5 }

export async function sonar(evento: EventoSonoro) {
  const n = sonidoPara(evento, modo)
  if (!n) return
  try {
    const [{ playSound }, s] = await Promise.all([import('../ui/sonido/lib/sound-engine'), cargar[n]()])
    await playSound(s.dataUri, { volume: VOLUMEN[n] ?? 0.6 })
  } catch { /* sin audio: no pasa nada */ }
}
