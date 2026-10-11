// Panel flotante sobre el Atlas: se arrastra por la cabecera, se redimensiona por la esquina y recuerda su sitio.
import { useEffect, useRef, useState, type ReactNode } from 'react'

type Rect = { x: number; y: number; w: number; h: number }
const load = (id: string, d: Rect): Rect => { try { return JSON.parse(localStorage.getItem(`panel:${id}`) ?? '') as Rect } catch { return d } }
const save = (id: string, r: Rect) => { try { localStorage.setItem(`panel:${id}`, JSON.stringify(r)) } catch { /* sin almacenamiento */ } }

/** Mantiene el panel dentro de la ventana (nunca nace ni queda fuera de la vista). */
export function clampRect(r: Rect, W: number, H: number): Rect {
  const w = Math.min(Math.max(300, r.w || 0), Math.max(300, W - 16)), h = Math.min(Math.max(180, r.h || 0), Math.max(180, H - 72))
  return { w, h, x: Math.min(Math.max(8, r.x || 0), Math.max(8, W - w - 8)), y: Math.min(Math.max(56, r.y || 0), Math.max(56, H - h - 64)) }
}

export function Panel(props: { id: string; title: string; initial: Rect; front: boolean; onFront(): void; onClose(): void; extra?: ReactNode; children: ReactNode }) {
  const [r, setR] = useState<Rect>(() => clampRect(load(props.id, props.initial), innerWidth, innerHeight))
  useEffect(() => {
    const fit = () => setR((cur) => clampRect(cur, innerWidth, innerHeight))
    fit(); addEventListener('resize', fit)
    return () => removeEventListener('resize', fit)
  }, [])
  const drag = useRef<{ mode: 'move' | 'size'; sx: number; sy: number; r: Rect } | null>(null)

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const dx = e.clientX - d.sx, dy = e.clientY - d.sy
      const next = d.mode === 'move'
        ? { ...d.r, x: Math.min(Math.max(d.r.x + dx, -d.r.w + 120), innerWidth - 120), y: Math.min(Math.max(d.r.y + dy, 0), innerHeight - 48) }
        : { ...d.r, w: Math.max(300, d.r.w + dx), h: Math.max(180, d.r.h + dy) }
      setR(next)
    }
    const up = () => { if (drag.current) { drag.current = null; setR((cur) => { save(props.id, cur); return cur }) } }
    addEventListener('pointermove', move); addEventListener('pointerup', up)
    return () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up) }
  }, [props.id])

  const start = (mode: 'move' | 'size') => (e: React.PointerEvent) => { e.preventDefault(); props.onFront(); drag.current = { mode, sx: e.clientX, sy: e.clientY, r } }

  return (
    <section className={`panel${props.front ? ' front' : ''}`} style={{ left: r.x, top: r.y, width: r.w, height: r.h }} onPointerDown={props.onFront}
      aria-label={props.title}>
      <header className="panel-head" onPointerDown={start('move')}>
        <h2>{props.title}</h2>
        {props.extra}
        <button className="x" onPointerDown={(e) => e.stopPropagation()} onClick={props.onClose} aria-label={`Cerrar ${props.title}`}>✕</button>
      </header>
      <div className="panel-body">{props.children}</div>
      <div className="panel-resize" onPointerDown={start('size')} />
    </section>
  )
}
