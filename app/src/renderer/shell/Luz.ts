// La luz del cursor: una sola escucha para toda la app pone --mx/--my en la raíz (una vez por fotograma como mucho).
// Los filos de cristal (.hoja::before) la usan para brillar donde está el cursor, sin trabajo de React.
export function encenderLuz() {
  let raf = 0, x = -999, y = -999
  const pintar = () => { raf = 0; document.documentElement.style.setProperty('--mx', `${x}px`); document.documentElement.style.setProperty('--my', `${y}px`) }
  const mover = (e: PointerEvent) => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(pintar) }
  const salir = () => { x = y = -999; if (!raf) raf = requestAnimationFrame(pintar) }
  addEventListener('pointermove', mover, { passive: true }); document.addEventListener('pointerleave', salir)
  return () => { removeEventListener('pointermove', mover); document.removeEventListener('pointerleave', salir); cancelAnimationFrame(raf) }
}
