// Paleta (Ctrl K): el centro de mando de Esme. Pregunta a la mente, encarga al equipo, encuentra en tu mente por
// significado, encuentra tus tareas, viste cualquier piel y te lleva a cualquier sitio.
//
// La lista y el foco los pone la pieza de beUI (ui/motion/command-palette.tsx): trae el portal, el frosted, el cursor de
// fila, el agrupado y la animación de entrada y salida. Aquí solo se decide QUÉ hay en la lista: la paleta de Esme
// no es un buscador de comandos, es una puerta a todo lo que la app sabe hacer.
import { Brain, Clock, CornerDownLeft, Hammer, MessageSquare, Palette, Search, SquareTerminal, SunMoon, Undo2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { BrainClient, Memory } from '../lib/brain'
import { haceCuanto } from '../paginas/diario'
import { sinMarkdown } from '../lib/texto-plano'
import { PIEL_BASE, type Piel } from '../tinta/piel'
import { PIELES_TIENDA } from '../tinta/pieles-tienda'
import { AJUSTES, SECCIONES, type SeccionId } from './secciones'
import { coincide, tareasQueCoinciden } from './paleta-buscar'
import { CommandPalette, type CommandItem } from '../ui/motion/command-palette'

const leer = (): string[] => { try { return JSON.parse(localStorage.getItem('esme:recientes') ?? '[]') as string[] } catch { return [] } }
const guardar = (v: string[]) => { try { localStorage.setItem('esme:recientes', JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

type TareaPaleta = { id: string; titulo: string; texto: string; inicio: number; estado: string; motorNombre: string }

export function Paleta({ abierta, onCerrar, onIr, onPreguntar, onTema, brain = null, tareas = [], onTarea, onRecuerdo, onVestir, onEncargar }: {
  abierta: boolean; onCerrar(): void; onIr(id: SeccionId): void; onPreguntar(q: string): void; onTema(): void
  brain?: BrainClient | null; tareas?: TareaPaleta[]; onTarea?(id: string): void; onRecuerdo?(id: string): void; onVestir?(p: Piel): void; onEncargar?(t: string): void
}) {
  const [texto, setTexto] = useState('')
  const [recientes, setRecientes] = useState<string[]>(leer)
  const [recuerdos, setRecuerdos] = useState<Memory[]>([])

  useEffect(() => { if (abierta) { setTexto('') } }, [abierta])

  // tu mente, por significado (no por palabras): con calma, para no buscar en cada tecla
  useEffect(() => {
    const q = texto.trim()
    if (!abierta || !brain || q.length < 3) { setRecuerdos([]); return }
    const t = setTimeout(() => void brain.search(q, 4).then(setRecuerdos).catch(() => setRecuerdos([])), 220)
    return () => clearTimeout(t)
  }, [texto, abierta, brain])

  const q = texto.trim()
  const susTareas = q ? tareasQueCoinciden(q, tareas, 4) : []
  const pieles = q ? PIELES_TIENDA.filter((p) => coincide(q, `${p.piel.nombre} ${p.descripcion} ${p.etiquetas.join(' ')} piel diseño`)).slice(0, 4) : []

  const preguntar = (pregunta: string) => {
    const n = [pregunta, ...recientes.filter((r) => r !== pregunta)].slice(0, 6)
    setRecientes(n); guardar(n); onPreguntar(pregunta)
  }
  const quitar = (r: string) => { const n = recientes.filter((x) => x !== r); setRecientes(n); guardar(n) }

  // La lista se arma con TODO lo que la app sabe hacer. Con texto, además, lo que has preguntado hace poco.
  const items = useMemo<CommandItem[]>(() => {
    const out: CommandItem[] = []

    if (q) {
      out.push({
        id: 'preguntar', group: 'Esme', label: `Preguntar «${q}»`, icon: MessageSquare,
        keywords: ['preguntar', 'memoria', 'mente'],
        onSelect: () => preguntar(q),
      })
      if (onEncargar) {
        out.push({
          id: 'encargar', group: 'Esme', label: `Encargar al equipo «${q}»`, icon: Hammer,
          hint: 'trabaja en una copia aislada',
          keywords: ['encargar', 'equipo', 'agente', 'tarea'], onSelect: () => { onEncargar(q); onCerrar() },
        })
      }
    }

    for (const r of recientes) {
      if (q && !coincide(q, r)) continue
      out.push({
        id: `reciente-${r}`, group: 'Lo último', label: r, icon: Clock,
        keywords: ['pregunta', 'reciente', 'historial'], onSelect: () => preguntar(r),
      })
    }

    for (const m of recuerdos) {
      out.push({
        id: `recuerdo-${m.id}`, group: 'En tu mente', label: sinMarkdown(m.text), icon: Brain,
        hint: haceCuanto(Date.parse(m.ts), Date.now()), keywords: ['memoria', 'recuerdo', 'mente'],
        onSelect: () => { onRecuerdo?.(m.id); onCerrar() },
      })
    }

    for (const t of susTareas) {
      out.push({
        id: `tarea-${t.id}`, group: 'Taller', label: t.titulo, icon: SquareTerminal,
        hint: `${t.motorNombre} · ${t.estado}`, keywords: ['tarea', 'taller', 'agente'],
        onSelect: () => { onTarea?.(t.id); onCerrar() },
      })
    }

    if (onVestir) {
      for (const p of pieles) {
        out.push({
          id: `piel-${p.id}`, group: 'Pieles', label: `Vestir «${p.piel.nombre}»`, icon: Palette,
          hint: p.descripcion, keywords: ['piel', 'diseño', 'vestir', ...p.etiquetas],
          onSelect: () => { onVestir(p.piel); onCerrar() },
        })
      }
    }

    for (const s of [...SECCIONES, AJUSTES]) {
      out.push({
        id: `ir-${s.id}`, group: 'Ir a', label: s.nombre, icon: s.Icono,
        hint: s.atajo, keywords: ['ir', 'abrir', ...s.nombre.split(' ')],
        onSelect: () => { onIr(s.id); onCerrar() },
      })
    }

    out.push({
      id: 'tema', group: 'Apariencia', label: 'Cambiar entre día y noche', icon: SunMoon,
      keywords: ['tema', 'claro', 'oscuro', 'noche', 'día'], onSelect: () => { onTema(); onCerrar() },
    })
    if (onVestir) {
      out.push({
        id: 'vestir-casa', group: 'Apariencia', label: 'Volver a la piel de casa', icon: Undo2,
        keywords: ['casa', 'reset', 'volver'], onSelect: () => { onVestir(PIEL_BASE); onCerrar() },
      })
    }

    return out
  }, [q, recientes, recuerdos, susTareas, pieles, onIr, onTema, onVestir, onEncargar, onTarea, onRecuerdo, onCerrar, onPreguntar])

  return (
    <CommandPalette
      open={abierta}
      onOpenChange={(o) => { if (!o) onCerrar() }}
      onQueryChange={setTexto}
      disableShortcut
      items={items}
      placeholder="Busca en tu mente, pregunta, encarga o ve a cualquier sitio…"
      emptyMessage="Nada con eso. Prueba con otra palabra."
    />
  )
}

export { Search, X }
