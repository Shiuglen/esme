// «Al día»: lo que pasó desde un momento, dicho en frases que se leen como una persona te lo contaría (quién hizo qué,
// dónde y cuándo), no como salida de sistema. Sale de lo que la app ya sabe —las tareas del Taller y los recuerdos nuevos—,
// así que no gasta IA y responde al instante. Lo que necesita de ti va primero.
import type { TareaTaller } from '../lib/bridge'
import type { Atlas } from '../lib/brain'
import { etiquetaFecha } from '../memoria/tiempo'

export type Entrada = {
  frase: string; cuando: string; ms: number
  tono?: 'atencion' | 'peligro' | 'vida'
  ir?: { lugar: 'taller'; id: string } | { lugar: 'memoria' }
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`
export function haceCuanto(ms: number, ahora: number): string {
  const m = Math.round((ahora - ms) / 60_000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  if (m < 24 * 60 && new Date(ms).getDate() === new Date(ahora).getDate()) return `hace ${Math.round(m / 60)} h`
  return etiquetaFecha(ms, ahora).replace(/^Ayer$/, 'ayer')
}
// un título que es un prompt entero se corta por palabras para leerse de un vistazo
export function recorta(t: string, max = 55): string {
  const limpio = t.replace(/\s+/g, ' ').trim()
  if (limpio.length <= max) return limpio
  let r = ''
  for (const w of limpio.split(' ')) { if ((r ? r.length + 1 : 0) + w.length > max) break; r = r ? `${r} ${w}` : w }
  return `${(r || limpio.slice(0, max)).replace(/[,.;:]$/, '')}…`
}
const DESTINO = { carpeta: 'a tu carpeta', rama: 'en una rama', exportada: 'como parche exportado' } as const

function deTarea(t: TareaTaller, ahora: number): Omit<Entrada, 'cuando'> | null {
  const quien = t.motorNombre, que = `«${recorta(t.titulo)}»`, ir = { lugar: 'taller' as const, id: t.id }
  switch (t.estado) {
    case 'esperando':
      return { frase: t.permiso ? `${quien} te espera en ${que}: pide permiso para «${t.permiso.titulo}».` : `${quien} te espera en ${que}.`, ms: ahora, tono: 'atencion', ir }
    case 'preparando': case 'trabajando':
      return { frase: `${quien} está trabajando en ${que}.`, ms: ahora, tono: 'vida', ir }
    case 'error':
      return { frase: `${quien} falló en ${que}${t.error ? `: ${t.error.replace(/\.$/, '')}` : ''}.`, ms: t.fin ?? t.inicio, tono: 'peligro', ir }
    case 'parada':
      return { frase: `Paraste ${que} (${quien}).`, ms: t.fin ?? t.inicio, ir }
    case 'lista': {
      if (t.aplicada) return { frase: `Aplicaste ${que} ${DESTINO[t.aplicada.modo]} (${plural(t.aplicada.ficheros, 'fichero', 'ficheros')}).`, ms: t.aplicada.cuando, ir }
      const n = t.cambios?.ficheros ?? 0
      return { frase: n ? `${quien} terminó ${que}: ${plural(n, 'fichero cambiado', 'ficheros cambiados')}, ${n === 1 ? 'listo' : 'listos'} para revisar.` : `${quien} terminó ${que} sin cambios.`, ms: t.fin ?? t.inicio, ir }
    }
  }
}

function deRecuerdos(atlas: Atlas, desde: number, ahora: number): Omit<Entrada, 'cuando'> | null {
  const porTema = new Map<number, number>()
  let n = 0, ultimo = 0
  for (const p of atlas.points) {
    const ms = p.ts ? Date.parse(p.ts) : NaN
    if (!(ms >= desde && ms <= ahora)) continue
    n++; ultimo = Math.max(ultimo, ms); porTema.set(p.cluster, (porTema.get(p.cluster) ?? 0) + 1)
  }
  if (!n) return null
  const nombre = (id: number) => atlas.clusters.find((c) => c.id === id)?.label
  const temas = [...porTema].sort((a, b) => b[1] - a[1]).map(([id]) => nombre(id)).filter((x): x is string => !!x).slice(0, 2).map((x) => `«${x}»`)
  const sobre = temas.length ? (n === 1 ? `, de ${temas[0]}` : `, sobre todo de ${temas.join(' y ')}`) : ''
  return { frase: `Tu mente guardó ${plural(n, 'recuerdo nuevo', 'recuerdos nuevos')}${sobre}.`, ms: ultimo, ir: { lugar: 'memoria' } }
}

export function diarioDe({ tareas, atlas, desde, ahora }: { tareas: TareaTaller[]; atlas: Atlas | null; desde: number; ahora: number }): Entrada[] {
  const todas = [...tareas.map((t) => deTarea(t, ahora)), atlas ? deRecuerdos(atlas, desde, ahora) : null]
    .filter((e): e is Omit<Entrada, 'cuando'> => !!e && (e.ms >= desde || e.tono === 'atencion' || e.tono === 'vida'))
  const urgente = (e: Omit<Entrada, 'cuando'>) => (e.tono === 'atencion' ? 1 : 0)
  // lo que se repite (el mismo encargo varias veces) se cuenta una vez, con la más reciente y cuántas veces pasó
  const veces = new Map<string, number>(), unicas: Omit<Entrada, 'cuando'>[] = []
  for (const e of todas.sort((a, b) => urgente(b) - urgente(a) || b.ms - a.ms)) {
    if (!veces.has(e.frase)) unicas.push(e)
    veces.set(e.frase, (veces.get(e.frase) ?? 0) + 1)
  }
  return unicas.map((e) => {
    const n = veces.get(e.frase) ?? 1
    return { ...e, frase: n > 1 ? e.frase.replace(/\.$/, ` (${n} veces).`) : e.frase, cuando: haceCuanto(e.ms, ahora) }
  })
}
