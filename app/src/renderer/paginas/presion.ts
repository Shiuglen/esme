// La casa en cifras: la presión de los procesos vista desde el Mando (la columna y su vista de procesos).
//
// La fila 21 del acta del 21-oct pedía «la vista de proceso con los botones de parar»: esto es su
// mitad de la ventana. La de abajo (quién y cuánto) está en app/src/main/uso/presion.ts; aquí sólo
// se le da forma de palabras y se decide qué se puede soltar.
import { useEffect, useState } from 'react'
import { bridge, type PresionVista } from '../lib/bridge'

/** MB en palabras: de 75 MB a 1,6 GB, con coma decimal. */
export function cortoMB(mb: number): string {
  const r = mb >= 1024 ? `${(mb / 1024).toFixed(1).replace('.', ',')} GB` : `${Math.round(mb)} MB`
  return mb >= 1024 && r.endsWith(' GB') && r.startsWith('1,0') ? '1 GB' : r
}

/** La frase corta de la columna del Mando: lo que come la casa y lo que queda. */
export function fraseCasa(p: PresionVista): string {
  const nombres = new Set(p.procesos.map((x) => x.rol))
  return [
    `${cortoMB(p.totalMB)}`,
    p.libresMB ? `libres ${cortoMB(p.libresMB)}` : '',
    nombres.has('agente') ? `${p.procesos.filter((x) => x.rol === 'agente').length} agente${p.procesos.filter((x) => x.rol === 'agente').length === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' · ')
}

/** Las filas de la vista de procesos: los más gordos arriba, con lo que se puede soltar marcado. */
export function filasPresion(p: PresionVista): PresionVista['procesos'] {
  return [...p.procesos].sort((a, b) => b.rssMB - a.rssMB)
}

/** El aviso que hay que ver antes de parar: nunca la casa (app, cerebro); agents y chrome sí. */
export function avisoDeParar(rol: string): string {
  if (rol === 'agente') return 'El agente queda parado de golpe: su tarea se verá interrumpida y sin turno cerrado.'
  if (rol === 'chrome') return 'El navegador se cierra: la próxima página lo vuelve a encender.'
  return 'Ese proceso es de la casa: pararlo apaga a Esme, y no está permitido.'
}

type Estado = { p: PresionVista | null; error: string | null }

/** El snapshot de la casa mientras se mira y cada 15 s: nada se mide si nadie lo está viendo. */
export function usePresion(visible: boolean): Estado {
  const [x, setX] = useState<Estado>({ p: null, error: null })
  useEffect(() => {
    if (!visible) return
    let vivo = true
    const medir = () => { void bridge.presion.ahora().then((p) => { if (vivo) setX({ p, error: null }) }).catch((e) => { if (vivo) setX({ p: null, error: e.message }) }) }
    medir()
    const t = setInterval(medir, 15_000)
    return () => { vivo = false; clearInterval(t) }
  }, [visible])
  return x
}

/** La parada de un proceso: se confirma dos veces, como en la Revisión (el segundo clic dice qué pasa).
 *  La casa nunca llega al segundo clic: si no es parable, el aviso es siempre el mismo. */
export function textoConfirmarParado(rol: string, segundoClic: boolean): string {
  if (rol !== 'agente' && rol !== 'chrome') return avisoDeParar(rol)
  return segundoClic ? 'Parado. La memoria que se suelte es la del agente, no la del historial.' : avisoDeParar(rol)
}
