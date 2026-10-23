// Lo que el creador repite: la tarjeta que lo propone.
//
// Esto NO crea nada por su cuenta. Muestra la tarea que se repite, cuántas veces y el
// encargo de ejemplo, y un botón que deja ese encargo en la caja para lanzarlo como
// cualquier otra receta. Si nadie lo acepta, no pasa nada: la propuesta es sólo una
// pista, y la decisión es del creador.
//
// Y hay un segundo camino: convertir la repetición en **skill**. La mente pone el
// esqueleto (los encargos de verdad y los huecos), el creador lo escribe y lo instala
// para sus agentes. Sin el clic del creador no se escribe ningún fichero.
import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Hammer, Repeat } from 'lucide-react'
import { toast } from 'sonner'
import { bridge, type Necesidad, type Repeticion } from '../lib/bridge'
import { cn } from '../lib/cn'

/** Lo que dice la tarjeta de una tarea repetida, en palabras. */
export function fraseRepeticion(r: Repeticion): string {
  return `Lo has encargado ${r.veces} ${r.veces === 1 ? 'vez' : 'veces'}, del ${r.desde} al ${r.hasta}.`
}

/** ¿Se puede ofrecer el encargo? Sin ejemplo no hay nada que lanzar. */
export function sePuedeUsar(r: Repeticion): boolean {
  return r.ejemplo.trim().length > 0
}

/** Las tareas repetidas que la mente ve ahora mismo. */
export function useRepeticiones(): Repeticion[] {
  const [lista, setLista] = useState<Repeticion[]>([])
  useEffect(() => {
    let vivo = true
    void bridge.mente.repeticiones()
      .then((r) => { if (vivo) setLista(r.repeticiones ?? []) })
      .catch(() => { if (vivo) setLista([]) })
    return () => { vivo = false }
  }, [])
  return lista
}

/** La tarjeta de una tarea repetida: el ejemplo y los dos caminos. */
export function TarjetaRepeticion({ r, onElegir, onConvertir }: { r: Repeticion; onElegir(texto: string): void; onConvertir?(r: Repeticion): void }) {
  return (
    <div className="group grid content-start gap-1.5 rounded-3 border border-acento/30 bg-acento-velo/50 p-3.5 text-left">
      <span className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-2 bg-acento-velo text-acento">
          <Repeat className="size-4" strokeWidth={1.75} />
        </span>
        <span className="text-[13.5px] font-medium text-texto">{r.titulo}</span>
      </span>
      <span className="text-[12.5px] leading-snug text-texto-2">{fraseRepeticion(r)}</span>
      <span className="text-[11px] leading-snug text-texto-3">«{r.ejemplo}»</span>
      <span className="mt-1 flex flex-wrap items-center gap-1.5">
        {sePuedeUsar(r) && (
          <button type="button" onClick={() => onElegir(r.ejemplo)}
            className={cn('w-fit rounded-full border border-linea px-2.5 py-1 text-[11.5px] transition-colors',
              'text-texto-2 hover:border-linea-fuerte hover:text-texto')}>
            Usar este encargo
          </button>
        )}
        {onConvertir && r.borrador && (
          <button type="button" onClick={() => onConvertir(r)}
            className={cn('inline-flex w-fit items-center gap-1 rounded-full border border-linea px-2.5 py-1 text-[11.5px] transition-colors',
              'text-texto-2 hover:border-linea-fuerte hover:text-texto')}>
            <BookOpen className="size-3" strokeWidth={1.75} />
            Convertir en skill
          </button>
        )}
      </span>
    </div>
  )
}

// ---- La receta: el esqueleto de la mente, escrito por el creador ----

/** Los agentes que pueden llevar skills: los que la Tienda conoce. */
export function useAgentesConSkills(): { id: string; nombre: string }[] {
  const [lista, setLista] = useState<{ id: string; nombre: string }[]>([])
  useEffect(() => {
    let vivo = true
    void bridge.skills.catalogo()
      .then((c) => { if (vivo) setLista(c.agentes ?? []) })
      .catch(() => { if (vivo) setLista([]) })
    return () => { vivo = false }
  }, [])
  return lista
}

/** El nombre de la receta tiene que poder ser una carpeta: minúsculas, guiones y números. */
export function nombreValido(nombre: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(nombre.trim())
}

/**
 * El editor de la receta: la mente pone el esqueleto y el creador lo escribe.
 *
 * Nada se instala solo: se ven los tres campos, se elige para quién es y se pulsa
 * «Instalar». El fichero se escribe en la carpeta de skills de los agentes elegidos y
 * lleva la marca de Esme (para poder quitarlo después).
 */
export function EditorSkill({ r, onCerrar }: { r: Repeticion; onCerrar(): void }) {
  const [nombre, setNombre] = useState(r.borrador?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(r.borrador?.descripcion ?? '')
  const [cuerpo, setCuerpo] = useState(r.borrador?.cuerpo ?? '')
  const [agentes, setAgentes] = useState<string[]>([])
  const [instalando, setInstalando] = useState(false)
  const disponibles = useAgentesConSkills()
  // por defecto, para los motores que hicieron la tarea (si están entre los que llevan skills)
  const sugeridos = useMemo(() => {
    const ids = disponibles.map((a) => a.id)
    const mios = r.motores.filter((m) => ids.includes(m))
    return mios.length ? mios : ids.slice(0, 1)
  }, [disponibles, r.motores])
  useEffect(() => { setAgentes(sugeridos) }, [sugeridos])   // eslint-disable-line react-hooks/exhaustive-deps

  const listo = nombreValido(nombre) && descripcion.trim().length > 0 && cuerpo.trim().length > 0 && agentes.length > 0

  const instalar = async () => {
    if (!listo || instalando) return
    setInstalando(true)
    try {
      const r2 = await bridge.skills.propuesta({ nombre: nombre.trim(), descripcion: descripcion.trim(), cuerpo, agentes })
      if (r2.ok) {
        toast.success(`Receta «${r2.nombre}» instalada`, {
          description: `Va en ${r2.carpetas.length} ${r2.carpetas.length === 1 ? 'carpeta' : 'carpetas'}. Tus agentes ya la ven.`,
        })
        if (r2.conflictos.length) toast.error(r2.conflictos.map((c) => c.motivo).join(' '))
        onCerrar()
      } else toast.error(r2.error)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally { setInstalando(false) }
  }

  return (
    <div className="grid gap-3 rounded-3 border border-linea bg-s1/60 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13.5px] font-medium text-texto">La receta de «{r.titulo}»</span>
        <span className="text-[12px] text-texto-3">La mente puso el esqueleto. La receta la escribes tú.</span>
      </div>
      <label className="grid gap-1">
        <span className="text-[12px] text-texto-2">Nombre</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} spellCheck={false}
          className={cn('rounded-2 border border-linea bg-s2 px-2.5 py-1.5 text-[13px] text-texto outline-none focus:border-linea-fuerte',
            !nombreValido(nombre) && 'border-peligro/60')} />
        {!nombreValido(nombre) && <span className="text-[11.5px] text-peligro">Sólo letras, números, guiones y puntos (empieza por letra o número).</span>}
      </label>
      <label className="grid gap-1">
        <span className="text-[12px] text-texto-2">Descripción (la leen los agentes)</span>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2}
          className="rounded-2 border border-linea bg-s2 px-2.5 py-1.5 text-[13px] leading-snug text-texto outline-none focus:border-linea-fuerte" />
      </label>
      <label className="grid gap-1">
        <span className="text-[12px] text-texto-2">La receta</span>
        <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={12} spellCheck={false}
          className="rounded-2 border border-linea bg-s2 px-2.5 py-2 font-mono text-[12.5px] leading-relaxed text-texto outline-none focus:border-linea-fuerte" />
      </label>
      <div className="grid gap-1.5">
        <span className="text-[12px] text-texto-2">Para quién es</span>
        <div className="flex flex-wrap gap-1.5">
          {disponibles.length === 0 && <span className="text-[12px] text-texto-3">No hay agentes con carpeta de skills.</span>}
          {disponibles.map((a) => {
            const marcado = agentes.includes(a.id)
            return (
              <button key={a.id} type="button" aria-pressed={marcado}
                onClick={() => setAgentes(marcado ? agentes.filter((x) => x !== a.id) : [...agentes, a.id])}
                className={cn('rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                  marcado ? 'border-acento/50 bg-acento-velo/60 text-acento' : 'border-linea text-texto-2 hover:border-linea-fuerte hover:text-texto')}>
                {a.nombre}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={instalar} disabled={!listo || instalando}
          className={cn('rounded-full border px-3 py-1.5 text-[12.5px] transition-colors',
            listo ? 'border-acento/50 bg-acento-velo/60 text-acento hover:bg-acento-velo' : 'border-linea text-texto-3')}>
          {instalando ? 'Instalando…' : 'Instalar la receta'}
        </button>
        <button type="button" onClick={onCerrar}
          className="rounded-full border border-linea px-3 py-1.5 text-[12.5px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto">
          Dejarlo
        </button>
      </div>
    </div>
  )
}

// ---- Lo que falta: herramientas que el equipo echa de menos ----

/** Lo que dice la tarjeta de una herramienta que falta, en palabras. */
export function fraseNecesidad(n: Necesidad): string {
  const quien = n.motores.length ? ` en ${n.motores.join(', ')}` : ''
  return `Falló ${n.veces} ${n.veces === 1 ? 'vez' : 'veces'}${quien}.`
}

/** El encargo de la Forja: qué tiene que hacer la herramienta que falta. */
export function encargoNecesidad(n: Necesidad): string {
  const que = n.herramienta
    ? `una herramienta llamada «${n.herramienta}»`
    : `una herramienta que solucione este fallo: ${n.fallo}`
  const para = n.encargos.length ? `Para esto la necesité: ${n.encargos[0]}` : ''
  return `${que}. ${para}`.trim()
}

/** Las herramientas que la mente deduce que faltan. */
export function useNecesidades(): Necesidad[] {
  const [lista, setLista] = useState<Necesidad[]>([])
  useEffect(() => {
    let vivo = true
    void bridge.mente.necesidad()
      .then((r) => { if (vivo) setLista(r.necesidades ?? []) })
      .catch(() => { if (vivo) setLista([]) })
    return () => { vivo = false }
  }, [])
  return lista
}

/** La tarjeta de una herramienta que falta: el fallo y el botón que la fabrica. */
export function TarjetaNecesidad({ n, onFabricar }: { n: Necesidad; onFabricar(encargo: string): void }) {
  return (
    <div className="group grid content-start gap-1.5 rounded-3 border border-atencion/30 bg-atencion-velo/50 p-3.5 text-left">
      <span className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-2 bg-atencion-velo text-atencion">
          <Hammer className="size-4" strokeWidth={1.75} />
        </span>
        <span className="text-[13.5px] font-medium text-texto">Falta «{n.titulo}»</span>
      </span>
      <span className="text-[12.5px] leading-snug text-texto-2">{fraseNecesidad(n)}</span>
      <span className="text-[11px] leading-snug text-texto-3">«{n.fallo}»</span>
      <button type="button" onClick={() => onFabricar(encargoNecesidad(n))}
        className={cn('mt-1 w-fit rounded-full border border-linea px-2.5 py-1 text-[11.5px] transition-colors',
          'text-texto-2 hover:border-linea-fuerte hover:text-texto')}>
        Fabricarla
      </button>
    </div>
  )
}

// La puerta del Taller: los encargos que llegaron de fuera (por la mente) y esperan aquí a que
// el creador los apruebe. La cola vive en la mente; la tarea la crea el Taller si aceptas, con
// el acceso apretado (ediciones) y sin ninguna credencial. Rechazar también es responder.
import { DoorOpen } from 'lucide-react'
import type { EncargoFuera } from '../lib/bridge'

/** «Hace N» en palabras cortas: la cola dice cuándo entró cada encargo (ts en segundos, como la mente). */
export function haceDe(ts: number, ahora: number): string {
  const s = Math.max(0, Math.round(ahora - ts))
  if (s < 90) return `hace ${s} s`
  const m = Math.round(s / 60)
  if (m < 90) return `hace ${m} min`
  const h = Math.round(m / 60)
  if (h < 36) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} días`
}

/** Los encargos de fuera que esperan tu respuesta: se ven con el panel «Nueva tarea» abierto.
 *  Devuelve la lista y el `quitar` para cuando el creador ya respondió a uno (local, sin re-preguntar). */
export function useEncargosFuera(): [EncargoFuera[], (id: string) => void] {
  const [lista, setLista] = useState<EncargoFuera[]>([])
  useEffect(() => {
    let vivo = true
    void bridge.mente.tallerEncargos()
      .then((r) => { if (vivo) setLista(r.filter((x) => x.estado === 'pendiente')) })
      .catch(() => { if (vivo) setLista([]) })
    return () => { vivo = false }
  }, [])
  const quitarFueraNow = (id: string) => setLista((v) => v.filter((x) => x.id !== id))
  return [lista, quitarFueraNow]
}

/** La tarjeta de un encargo de fuera: de dónde llegó, qué pide, y la decisión del creador. */
export function TarjetaEncargoFuera({ e, ahora, onAprobar, onRechazar }: {
  e: EncargoFuera; ahora: number; onAprobar(e: EncargoFuera): void; onRechazar(e: EncargoFuera): void
}) {
  return (
    <div className="group grid content-start gap-1.5 rounded-3 border border-linea-fuerte/40 bg-s1/60 p-3.5 text-left">
      <span className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-2 bg-acento-velo text-acento">
          <DoorOpen className="size-4" strokeWidth={1.75} />
        </span>
        <span className="text-[13.5px] font-medium text-texto">{e.titulo}</span>
      </span>
      <span className="text-[11px] text-texto-3">
        Encargo de fuera · {haceDe(e.ts, ahora)} · llega con acceso «ediciones» y sin credenciales
      </span>
      <span className="line-clamp-3 text-[12.5px] leading-snug text-texto-2" title={e.texto}>{e.texto}</span>
      <span className="mt-1 flex gap-2">
        <button type="button" onClick={() => onAprobar(e)}
          className="w-fit rounded-full border border-linea px-2.5 py-1 text-[11.5px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto">
          Aprobar y arrancar
        </button>
        <button type="button" onClick={() => onRechazar(e)}
          className="w-fit rounded-full border border-linea px-2.5 py-1 text-[11.5px] text-texto-3 transition-colors hover:border-linea-fuerte hover:text-texto">
          Rechazar
        </button>
      </span>
    </div>
  )
}
