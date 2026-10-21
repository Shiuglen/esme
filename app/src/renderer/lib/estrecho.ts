// ¿Cabe esto en la pantalla? Lo que se necesita saber es si la ventana es estrecha (un móvil o una
// ventana pequeña) para cambiar la FORMA de una cosa, no solo su tamaño: en una pantalla estrecha el
// detalle no va al lado (no cabe), va abajo, en una hoja que se desliza.
//
// Se pregunta al navegador con matchMedia, no midiendo el window: el navegador ya lo sabe y avisa
// solo cuando cambia (resize, girar el móvil, plegar la pestaña).
import { useEffect, useState } from 'react'

/** ¿La ventana es más estrecha que este ancho (en píxeles CSS)? */
export function useEstrecho(ancho: number): boolean {
  const [estrecho, setEstrecho] = useState(() =>
    typeof matchMedia !== 'undefined' ? matchMedia(`(max-width: ${ancho - 1}px)`).matches : false,
  )
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return
    const mq = matchMedia(`(max-width: ${ancho - 1}px)`)
    const cambiar = () => setEstrecho(mq.matches)
    cambiar()
    mq.addEventListener('change', cambiar)
    return () => mq.removeEventListener('change', cambiar)
  }, [ancho])
  return estrecho
}
