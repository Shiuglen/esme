// La Tienda › Skills: instrucciones de experto para Esme y para tus agentes (Claude Code, OpenCode, Qwen, Cline, Codex,
// Gemini…), desde el repositorio de su autor y fijadas a la versión que Esme revisó. Antes de instalar ves todo: lo que dice,
// sus ficheros y las alertas calculadas en tu equipo. Los scripts quedan fuera salvo que los pidas.
import { AlertTriangle, Check, FileCode2, FileText, Search, ShieldCheck, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Markdown } from '../chat/Markdown'
import { bridge, type SkillCatalogo, type VistaSkill } from '../lib/bridge'
import { cn } from '../lib/cn'
import { coincide } from '../shell/paleta-buscar'

const NIVEL = { alto: 'text-peligro', medio: 'text-atencion', aviso: 'text-texto-3' } as const
const kb = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toLocaleString('es-ES', { maximumFractionDigits: 1 })} KB`)
const autor = (repo: string) => repo.split('/')[0]

export function TiendaSkills() {
  const [datos, setDatos] = useState<{ skills: SkillCatalogo[]; agentes: { id: string; nombre: string }[] } | null>(null)
  const [grupo, setGrupo] = useState('Todas')
  const [q, setQ] = useState('')
  const [abierta, setAbierta] = useState<SkillCatalogo | null>(null)
  const cargar = () => void bridge.skills.catalogo().then(setDatos)
  useEffect(cargar, [])
  const grupos = useMemo(() => ['Todas', ...new Set((datos?.skills ?? []).map((s) => s.grupo))], [datos])
  const visibles = (datos?.skills ?? []).filter((s) => (grupo === 'Todas' || s.grupo === grupo) && (!q.trim() || coincide(q, `${s.nombre} ${s.descripcionEs} ${s.descripcion} ${s.repo}`)))
  const instaladas = (datos?.skills ?? []).filter((s) => s.instalada).length

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-10 min-w-[260px] flex-1 items-center gap-2 rounded-full border border-linea px-3.5 focus-within:border-foco">
          <Search className="size-4 text-texto-3" strokeWidth={1.75} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca: tests, diseño, depurar, PDF…" aria-label="Buscar skills"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-texto outline-none placeholder:text-texto-3" />
        </label>
        <div role="radiogroup" aria-label="Grupo" className="flex flex-wrap gap-1">
          {grupos.map((g) => (
            <button key={g} type="button" role="radio" aria-checked={grupo === g} onClick={() => setGrupo(g)}
              className={cn('h-8 rounded-full px-3 text-[12.5px] transition-colors', grupo === g ? 'bg-s2 text-texto' : 'text-texto-3 hover:text-texto')}>{g}</button>
          ))}
        </div>
      </div>
      <p className="m-0 text-[12.5px] text-texto-3">
        {datos ? `${datos.skills.length} skills revisadas${instaladas ? ` · ${instaladas} instaladas` : ''} · cada una viene del repositorio de su autor, fijada a la versión revisada` : 'Cargando el catálogo…'}
      </p>

      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-px overflow-hidden rounded-3 border border-linea bg-linea p-0">
        {visibles.map((s) => (
          <li key={s.id} className="bg-[var(--hoja)]">
            <button type="button" onClick={() => setAbierta(s)} className="grid h-full w-full content-start gap-2 p-4 text-left transition-colors hover:bg-s1/60">
              <span className="flex items-baseline gap-2">
                <span className="font-display text-[19px] leading-tight text-texto italic">{s.nombre}</span>
                {s.instalada && <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-acento"><Check className="size-3" />instalada</span>}
              </span>
              <span className="line-clamp-2 text-[13px] leading-5 text-texto-2">{s.descripcionEs}</span>
              <span className="text-[11.5px] text-texto-3">{autor(s.repo)} · {s.licencia} · {s.grupo}{s.tieneScripts ? ' · trae scripts' : ''}</span>
            </button>
          </li>
        ))}
        {datos && !visibles.length && <li className="bg-[var(--hoja)] p-6 text-[13px] text-texto-3">Nada con eso. Prueba con otras palabras.</li>}
      </ul>

      <AnimatePresence>
        {abierta && datos && <Ficha key={abierta.id} skill={abierta} agentes={datos.agentes} onCerrar={() => setAbierta(null)} onCambio={() => { cargar(); setAbierta(null) }} />}
      </AnimatePresence>
    </div>
  )
}

function Ficha({ skill: s, agentes, onCerrar, onCambio }: { skill: SkillCatalogo; agentes: { id: string; nombre: string }[]; onCerrar(): void; onCambio(): void }) {
  const [vista, setVista] = useState<VistaSkill | null>(null)
  const [crudo, setCrudo] = useState(false)
  const [elegidos, setElegidos] = useState<string[]>(() => s.instalada?.agentes ?? [])
  const [conScripts, setConScripts] = useState(false)
  const [estado, setEstado] = useState<{ ocupado?: boolean; texto?: string; ok?: boolean }>({})
  const [seguro, setSeguro] = useState(false)
  useEffect(() => { void bridge.skills.vistaPrevia(s.id).then(setVista) }, [s.id])

  const instalar = async () => {
    setEstado({ ocupado: true })
    const r = await bridge.skills.instalar(s.id, elegidos, conScripts)
    if (!r.ok) return setEstado({ ok: false, texto: r.error })
    const para = r.carpetas.flatMap((c) => c.agentes).map((a) => agentes.find((x) => x.id === a)?.nombre ?? a)
    setEstado({ ok: true, texto: `Instalada para Esme${para.length ? ` y ${para.join(', ')}` : ''}.${r.conflictos.length ? ` ${r.conflictos.map((c) => c.motivo).join(' ')}` : ''}${r.scriptsOmitidos ? ' Sin sus scripts.' : ''}` })
    setTimeout(onCambio, 1600)
  }
  const desinstalar = async () => {
    if (!seguro) return setSeguro(true)
    const r = await bridge.skills.desinstalar(s.id)
    setEstado(r.ok ? { ok: true, texto: 'Desinstalada. Lo ajeno no se ha tocado.' } : { ok: false, texto: r.error })
    if (r.ok) setTimeout(onCambio, 1200)
  }

  return (
    <motion.div className="fixed inset-0 z-40 grid place-items-center bg-black/45 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCerrar}>
      <motion.section role="dialog" aria-modal="true" aria-label={`Skill ${s.nombre}`} onClick={(e) => e.stopPropagation()}
        initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }}
        className="grid max-h-[86vh] w-[min(880px,100%)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-4 border border-linea bg-[var(--hoja)]">
        <header className="grid gap-1.5 border-b border-linea px-6 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <h2 className="m-0 font-display text-[28px] leading-tight text-texto italic">{s.nombre}</h2>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="ml-auto grid size-8 place-items-center rounded-full text-texto-3 hover:bg-s2 hover:text-texto"><X className="size-4" /></button>
          </div>
          <p className="m-0 text-[14.5px] text-texto-2">{s.descripcionEs}</p>
          <p className="m-0 text-[12px] text-texto-3" title="Esto es lo que lee el modelo para decidir cuándo usarla">«{s.descripcion}»</p>
          <p className="m-0 text-[11.5px] text-texto-3">{s.repo}/{s.ruta} · versión {s.commit.slice(0, 7)} revisada el {s.revisadoEl} · {s.licencia} · {s.ficheros} ficheros, {kb(s.bytes)}</p>
        </header>

        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_260px] gap-0 overflow-hidden">
          <div className="min-h-0 overflow-y-auto px-6 py-4">
            {!vista && <p className="m-0 text-[13px] text-texto-3">Descargando de {s.repo} y comprobando que es la versión revisada…</p>}
            {vista && !vista.ok && <p className="m-0 flex items-start gap-2 text-[13px] text-peligro"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{vista.error}</p>}
            {vista?.ok && (
              <>
                <div className="mb-3 flex items-center gap-2 text-[12px] text-texto-3">
                  <span>SKILL.md · unas {vista.tokens.toLocaleString('es-ES')} fichas de texto para el modelo{vista.soloManual ? ' · solo cuando la llames' : ''}</span>
                  <button type="button" onClick={() => setCrudo((c) => !c)} className="ml-auto underline underline-offset-4 hover:text-texto">{crudo ? 'Ver renderizado' : 'Ver el texto sin procesar'}</button>
                </div>
                {crudo ? <pre className="m-0 overflow-x-auto rounded-2 border border-linea p-3 text-[12px] leading-5 whitespace-pre-wrap text-texto-2">{vista.skillMd}</pre>
                  : <div className="text-[14px] leading-[1.7] text-texto"><Markdown texto={vista.cuerpo ?? vista.skillMd} /></div>}
              </>
            )}
          </div>
          <aside className="grid min-h-0 content-start gap-4 overflow-y-auto border-l border-linea px-4 py-4">
            {vista?.ok && (
              <>
                <section aria-label="Alertas" className="grid gap-1.5">
                  <p className="m-0 text-[12px] text-texto-3">Alertas (calculadas en tu equipo)</p>
                  {vista.alertas.length === 0
                    ? <p className="m-0 flex items-center gap-1.5 text-[12.5px] text-texto-2"><ShieldCheck className="size-3.5 text-acento" />Sin alertas: solo instrucciones.</p>
                    : vista.alertas.map((a, i) => <p key={i} className={cn('m-0 text-[12.5px] leading-snug', NIVEL[a.nivel])}>{a.motivo}{a.ruta ? <span className="text-texto-3"> · {a.ruta}</span> : null}</p>)}
                  {vista.avisos.map((a) => <p key={a} className="m-0 text-[12px] text-texto-3">{a}</p>)}
                </section>
                <section aria-label="Ficheros" className="grid gap-1">
                  <p className="m-0 text-[12px] text-texto-3">Ficheros</p>
                  {vista.ficheros.map((f) => (
                    <p key={f.ruta} className={cn('m-0 flex items-center gap-1.5 truncate text-[12px]', f.script ? 'text-atencion' : 'text-texto-2')} title={f.ruta}>
                      {f.script ? <FileCode2 className="size-3.5 shrink-0" /> : <FileText className="size-3.5 shrink-0 text-texto-3" />}<span className="truncate">{f.ruta}</span><span className="ml-auto shrink-0 text-texto-3">{kb(f.bytes)}</span>
                    </p>
                  ))}
                </section>
              </>
            )}
          </aside>
        </div>

        <footer className="grid gap-3 border-t border-linea px-6 py-4">
          <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
            <span className="mr-1 text-texto-3">Para</span>
            <span className="inline-flex h-7 items-center gap-1 rounded-full border border-acento/50 px-2.5 text-texto"><Check className="size-3 text-acento" />Esme</span>
            {agentes.map((a) => {
              const si = elegidos.includes(a.id)
              return <button key={a.id} type="button" role="checkbox" aria-checked={si} onClick={() => setElegidos((l) => (si ? l.filter((x) => x !== a.id) : [...l, a.id]))}
                className={cn('inline-flex h-7 items-center gap-1 rounded-full border px-2.5 transition-colors', si ? 'border-acento/50 text-texto' : 'border-linea text-texto-3 hover:text-texto')}>{si && <Check className="size-3 text-acento" />}{a.nombre}</button>
            })}
            {s.tieneScripts && (
              <button type="button" role="switch" aria-checked={conScripts} onClick={() => setConScripts((c) => !c)}
                className={cn('ml-auto inline-flex h-7 items-center rounded-full border px-2.5', conScripts ? 'border-atencion text-atencion' : 'border-linea text-texto-3 hover:text-texto')}>
                {conScripts ? 'Con sus scripts (revísalos antes)' : 'Sin scripts'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {estado.texto && <p className={cn('m-0 text-[12.5px]', estado.ok ? 'text-texto-2' : 'text-peligro')}>{estado.texto}</p>}
            {s.instalada && (
              <button type="button" onClick={() => void desinstalar()} onBlur={() => setSeguro(false)}
                className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px]', seguro ? 'bg-peligro text-white' : 'text-texto-3 hover:text-peligro')}>
                <Trash2 className="size-3.5" />{seguro ? 'Desinstalar de todas partes' : 'Desinstalar'}
              </button>
            )}
            <button type="button" onClick={() => void instalar()} disabled={!vista?.ok || estado.ocupado}
              className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-acento px-4 text-[13px] font-medium text-sobre-acento disabled:opacity-40">
              {s.instalada ? 'Reinstalar' : 'Instalar'}{elegidos.length ? ` para Esme y ${elegidos.length} ${elegidos.length === 1 ? 'agente' : 'agentes'}` : ' para Esme'}
            </button>
          </div>
        </footer>
      </motion.section>
    </motion.div>
  )
}
