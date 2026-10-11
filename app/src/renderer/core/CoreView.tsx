// El Núcleo en escena: escenario azul marino, haces de luz cenital, rejilla mate y reflejo en el suelo.
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { Atlas } from '../lib/brain'
import { CoreScene } from './core'

export type CoreHandle = { recall(ids: string[]): void }

export const CoreView = forwardRef<CoreHandle, { data: Atlas | null; shift?: number }>(function CoreView({ data, shift = 0 }, ref) {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<CoreScene | null>(null)
  useEffect(() => { const s = new CoreScene(host.current!); scene.current = s; return () => s.dispose() }, [])
  useEffect(() => { if (data) scene.current?.setData(data) }, [data])
  useEffect(() => { scene.current?.setShift(shift) }, [shift])
  useImperativeHandle(ref, () => ({ recall: (ids) => scene.current?.recall(ids) }), [])
  return (
    <div className="stage" aria-label="El Núcleo: tu mente">
      <div className="stage-grid" />
      <div className="stage-beam b1" /><div className="stage-beam b2" /><div className="stage-beam b3" />
      <div className="stage-floor" />
      <div ref={host} className="stage-core" />
    </div>
  )
})
