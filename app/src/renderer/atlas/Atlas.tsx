// El Atlas como fondo vivo de toda la app.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Atlas as AtlasData, BrainClient } from '../lib/brain'
import { AtlasScene } from './scene'

export type AtlasHandle = { light(ids: string[], who: string, label: string): void; focus(id: string): void }

export const Atlas = forwardRef<AtlasHandle, { data: AtlasData | null; day: boolean; brain: BrainClient | null; onPick(id: string): void }>(
  function Atlas({ data, day, brain, onPick }, ref) {
    const host = useRef<HTMLDivElement>(null), overlay = useRef<HTMLDivElement>(null)
    const scene = useRef<AtlasScene | null>(null)
    const [tip, setTip] = useState<{ x: number; y: number; text: string; meta: string } | null>(null)
    const hoverReq = useRef(0)

    useEffect(() => {
      const s = new AtlasScene(host.current!, overlay.current!)
      scene.current = s
      return () => s.dispose()
    }, [])
    useEffect(() => { if (data) scene.current?.setData(data) }, [data])
    useEffect(() => { scene.current?.setDay(day) }, [day])
    useEffect(() => {
      const s = scene.current
      if (!s) return
      s.onPick = onPick
      let last = ''
      s.onHover = (id, x, y) => {
        if (!id) { last = ''; setTip(null); return }
        if (id === last) { setTip((t) => (t ? { ...t, x, y } : t)); return }
        last = id
        const req = ++hoverReq.current
        void brain?.memory(id).then((m) => {
          if (req === hoverReq.current) setTip({ x, y, text: m.text.slice(0, 260), meta: `${m.kind} · ${m.ts.slice(0, 10)} · ${m.source.split('/').pop()}` })
        }).catch(() => {})
      }
    }, [brain, onPick])

    useImperativeHandle(ref, () => ({
      light: (ids, who, label) => scene.current?.light(ids, who, label),
      focus: (id) => scene.current?.focus(id),
    }), [])

    return (
      <>
        <div ref={host} className="atlas" aria-label="Atlas de tu memoria" />
        <div ref={overlay} className="atlas-overlay" />
        {data && !data.points.length && <div className="atlas-empty">Aún no hay mapa: absorbe tus notas desde Memoria.</div>}
        {tip && (
          <div className="tooltip" style={{ left: Math.min(tip.x + 14, innerWidth - 360), top: tip.y + 14 }}>
            <small>{tip.meta}</small>{tip.text}{tip.text.length >= 260 ? '…' : ''}
          </div>
        )}
      </>
    )
  },
)
