// Cmd+K: una línea para todo. Escribe y elige; Enter ejecuta.
import { useEffect, useMemo, useRef, useState } from 'react'

export type Command = { id: string; label: string; hint?: string; run(query: string): void }

export function CommandPalette(props: { open: boolean; commands: Command[]; onClose(): void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { if (props.open) { setQ(''); setSel(0); setTimeout(() => input.current?.focus(), 10) } }, [props.open])
  const list = useMemo(() => {
    const s = q.toLowerCase().trim()
    const hits = props.commands.filter((c) => !s || c.label.toLowerCase().includes(s))
    return hits.length ? hits : props.commands.filter((c) => c.id === 'ask')
  }, [q, props.commands])
  if (!props.open) return null
  const run = (c?: Command) => { if (c) { props.onClose(); c.run(q) } }
  return (
    <>
      <div className="scrim" onClick={props.onClose} />
      <div className="palette" role="dialog" aria-label="Paleta de comandos">
        <input ref={input} value={q} placeholder="Pregunta a tu mente o escribe una acción…" onChange={(e) => { setQ(e.target.value); setSel(0) }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') props.onClose()
            else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, list.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
            else if (e.key === 'Enter') run(list[sel])
          }} />
        <ul className="scroll">
          {list.map((c, i) => (
            <li key={c.id} className={i === sel ? 'sel' : ''} onMouseEnter={() => setSel(i)} onClick={() => run(c)}>
              <span>{c.label}</span>{c.hint && <span className="muted">{c.hint}</span>}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
