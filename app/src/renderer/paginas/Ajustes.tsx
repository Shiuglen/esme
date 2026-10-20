// Ajustes: los motores de Esme (por API, por tu suscripción, en tu ordenador y el catálogo entero), tu presupuesto y la apariencia.
// Las claves van al llavero del sistema y nunca vuelven a la interfaz; las suscripciones las abres tú en su CLI oficial.
import { Check, ChevronRight, Cpu, KeyRound, Laptop, Package, Search, ShieldAlert, ShieldCheck, ShieldQuestion, Wallet } from 'lucide-react'
import { Bicho } from '../marca/SerVista'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { fmtTokens, fmtUSD } from '../chat/formatos'
import { bridge, type AgenteMente, type AlCerrar, type EstadoUso, type ModeloCatalogo, type MotorDetectado, type MotorTaller, type OrigenCatalogo, type ProveedorResumen, type ProviderView } from '../lib/bridge'
import { cn } from '../lib/cn'
import { Apariencia, type Pieles } from './Apariencia'
import { TuPlan } from './TuPlan'
import { useMuelle } from '../tinta/movimiento'
import { EntrarAgente } from './EntrarAgente'
import { TintaVista } from '../marca/PuntoVista'
import { useVersiones, VersionDeAgente } from './VersionAgente'
import { ClienteCerebro } from '../../main/mente/cliente'
import { conexionGuardada, guardarConexion, olvidarConexion } from '../lib/mente-web'

type Pestana = 'motores' | 'presupuesto' | 'apariencia' | 'plan' | 'sistema'
type Vista = 'conectados' | 'suscripcion' | 'catalogo' | 'local'

function Segmentos<T extends string>({ valor, opciones, onCambio, id }: { valor: T; opciones: { id: T; texto: string }[]; onCambio(v: T): void; id: string }) {
  const muelle = useMuelle({ stiffness: 520, damping: 40 })
  return (
    <div role="tablist" className="inline-flex gap-0.5 justify-self-start vidrio rounded-3 border p-1">
      {opciones.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={valor === o.id} onClick={() => onCambio(o.id)}
          className={cn('relative h-8 rounded-2 px-3.5 text-[13px] font-medium transition-colors', valor === o.id ? 'text-texto' : 'text-texto-2 hover:text-texto')}>
          {valor === o.id && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-2 bg-s3" transition={muelle} />}
          <span className="relative">{o.texto}</span>
        </button>
      ))}
    </div>
  )
}

const SELLO = {
  permitido: { Icono: ShieldCheck, texto: 'permitido', cls: 'text-texto-2 border-linea' },
  tolerado: { Icono: ShieldQuestion, texto: 'tolerado', cls: 'text-atencion border-atencion/40' },
  'requiere-aprobacion': { Icono: ShieldAlert, texto: 'requiere aprobación', cls: 'text-atencion border-atencion/40' },
} as const

function Fila({ icono, titulo, sub, derecha, children }: { icono: React.ReactNode; titulo: React.ReactNode; sub?: React.ReactNode; derecha?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="grid gap-3 border-b border-linea px-4 py-3.5 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-2 bg-s2 text-texto-2">{icono}</span>
        <div className="grid min-w-0 gap-0.5"><span className="truncate text-sm font-medium text-texto">{titulo}</span>{sub && <span className="truncate text-xs text-texto-3">{sub}</span>}</div>
        {derecha && <div className="ml-auto flex shrink-0 items-center gap-2">{derecha}</div>}
      </div>
      {children}
    </div>
  )
}

const Caja = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={cn('overflow-hidden rounded-3 vidrio halo border', className)}>{children}</div>
const Pastilla = ({ children, className }: { children: React.ReactNode; className?: string }) => <span className={cn('inline-flex h-6 items-center gap-1 rounded-full border border-linea px-2.5 text-xs font-medium text-texto-2', className)}>{children}</span>

function Clave({ p, onCambio }: { p: ProviderView; onCambio(): void }) {
  const [borrador, setBorrador] = useState('')
  return (
    <form className="flex gap-2 pl-11" onSubmit={async (e) => { e.preventDefault(); if (!borrador) return; await bridge.keys.set(p.id, borrador); setBorrador(''); toast.success(`Clave de ${p.label} guardada en el llavero`); onCambio() }}>
      <input type="password" autoComplete="off" value={borrador} onChange={(e) => setBorrador(e.target.value)} placeholder={p.hasKey ? '•••••••• guardada · pega otra para cambiarla' : 'Pega tu clave'}
        aria-label={`Clave de ${p.label}`} className="h-8 min-w-0 flex-1 rounded-2 border border-linea bg-fondo px-3 text-[13px] outline-none placeholder:text-texto-3 focus-visible:border-linea-fuerte" />
      <button type="submit" disabled={!borrador} className="h-8 rounded-2 bg-acento px-3 text-[13px] font-medium text-sobre-acento disabled:opacity-40">Guardar</button>
      {p.hasKey && <button type="button" onClick={async () => { await bridge.keys.remove(p.id); toast(`Clave de ${p.label} quitada`); onCambio() }} className="h-8 rounded-2 px-3 text-[13px] text-texto-2 hover:bg-s2">Quitar</button>}
    </form>
  )
}

function CatalogoRegistro() {
  // El registro ACP en la mano: buscar, instalar de verdad, ver el detalle correr y qué quedó en el equipo.
  const [motores, setMotores] = useState<MotorTaller[]>([])
  const [busca, setBusca] = useState('')
  const [instalando, setInstalando] = useState<string | null>(null)
  const [hilo, setHilo] = useState<{ id: string; texto: string } | null>(null)
  const refrescar = () => void bridge.taller.motores().then(setMotores)
  useEffect(() => {
    refrescar()
    return bridge.taller.onInstalacion((p) => setHilo((a) => (a && a.id === p.id ? { id: p.id, texto: (a.texto + (p.trozo ?? '')).slice(-400) } : { id: p.id, texto: p.trozo ?? '' })))
  }, [])
  const registro = useMemo(() => {
    const del = motores.filter((m) => m.via === 'registro')
    const q = busca.trim().toLowerCase()
    return q ? del.filter((m) => `${m.nombre} ${m.id}`.toLowerCase().includes(q)) : del
  }, [motores, busca])
  const instalar = (id: string) => {
    setInstalando(id); setHilo(null)
    void bridge.taller.instalarMotor(id).then((r) => {
      setInstalando((v) => (v === id ? null : v)); refrescar()
      if (r.ok) toast(`${r.nombre} instalado de verdad`)
      else toast.error(r.error)
    })
  }
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 flex items-center gap-2 text-sm font-semibold"><Package className="size-4" strokeWidth={1.5} />Catálogo vivo del registro ACP</h3>
        <label className="relative grid">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-texto-3" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar en el registro…" aria-label="Buscar motor del registro"
            className="h-9 w-[240px] rounded-2 border bg-s2 pr-3 pl-8 text-[13px] text-texto outline-none placeholder:text-texto-3 focus:border-texto-3" />
        </label>
      </div>
      <p className="m-0 text-xs text-texto-3">Los motores que el mundo ya escribió para ACP. «Instalar» corre su propio <code className="text-texto-2">npm install -g</code> aquí mismo, con el detalle en vivo; su arranque se cablea en el paso siguiente del taller.</p>
      <div className="max-h-[440px] overflow-y-auto rounded-3 border">
        {registro.slice(0, 60).map((m) => (
          <Fila key={m.id} icono={<Bicho de={m.id} tamaño={17} />} titulo={m.nombre} sub={m.login}
            derecha={instalando === m.id ? <Pastilla className="animate-pulse text-texto-2">instalando…</Pastilla>
              : m.instalado ? (m.credencia
                ? <Pastilla className="text-luz"><KeyRound className="size-3.5" />con tu llave</Pastilla>
                : <Pastilla className="text-texto"><Check className="size-3.5" />instalado</Pastilla>)
              : m.instalacion ? <button type="button" onClick={() => instalar(m.id)} className="h-8 shrink-0 rounded-2 border px-3 text-[12.5px] text-texto transition-colors hover:bg-s2">Instalar</button>
              : <Pastilla className="text-texto-3">manual</Pastilla>}>
            {instalando === m.id && hilo?.id === m.id && hilo.texto && (
              <pre className="m-0 mb-1 max-h-20 overflow-y-auto rounded-2 bg-s2 px-3 py-1.5 text-[11px] leading-4 break-all whitespace-pre-wrap text-texto-3">
                {hilo.texto.split('\n').filter(Boolean).slice(-6).join('\n')}
              </pre>
            )}
          </Fila>
        ))}
        {registro.length === 0 && <p className="m-0 p-5 text-sm text-texto-3">El registro no llegó aún, o tu búsqueda no trajo nada.</p>}
      </div>
    </div>
  )
}

function Motores() {
  const [vista, setVista] = useState<Vista>('conectados')
  const [proveedores, setProveedores] = useState<ProviderView[]>([])
  const [motores, setMotores] = useState<MotorDetectado[]>([])
  const [catalogo, setCatalogo] = useState<ProveedorResumen[]>([])
  const [origen, setOrigen] = useState<OrigenCatalogo | null>(null)
  const [busca, setBusca] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [modelos, setModelos] = useState<Record<string, ModeloCatalogo[]>>({})
  const [llavero, setLlavero] = useState<{ secure: boolean; backend: string } | null>(null)
  const { versiones, recargar: recargarVersiones } = useVersiones()
  const refrescar = () => void bridge.providers().then(setProveedores)
  useEffect(() => {
    refrescar(); void bridge.motores.detectar().then(setMotores); void bridge.catalogo.proveedores().then(setCatalogo)
    void bridge.catalogo.origen().then(setOrigen); void bridge.keys.status().then(setLlavero)
  }, [])
  const abrir = (id: string) => { setAbierto((a) => (a === id ? null : id)); if (!modelos[id]) void bridge.catalogo.modelos(id).then((m) => setModelos((x) => ({ ...x, [id]: [...m].sort((a, b) => Number(b.gratis) - Number(a.gratis) || b.contexto - a.contexto) }))) }

  const api = proveedores.filter((p) => !p.local), locales = proveedores.filter((p) => p.local)
  const conectados = [...proveedores.filter((p) => p.hasKey && !p.local), ...motores.filter((m) => m.instalado)]
  const filtrado = useMemo(() => { const q = busca.trim().toLowerCase(); return q ? catalogo.filter((c) => `${c.nombre} ${c.id}`.toLowerCase().includes(q)) : catalogo }, [busca, catalogo])
  const totalModelos = catalogo.reduce((s, c) => s + c.modelos, 0), totalGratis = catalogo.reduce((s, c) => s + c.gratis, 0)

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentos<Vista> id="vista" valor={vista} onCambio={setVista} opciones={[{ id: 'conectados', texto: `Conectados${conectados.length ? ` · ${conectados.length}` : ''}` }, { id: 'suscripcion', texto: 'Tu suscripción' }, { id: 'catalogo', texto: 'Catálogo' }, { id: 'local', texto: 'En tu ordenador' }]} />
        {llavero && !llavero.secure && <span className="text-xs text-peligro">Tu sistema no tiene llavero activo ({llavero.backend}): activa gnome-keyring o kwallet antes de guardar claves.</span>}
      </div>

      {vista === 'conectados' && (
        <Caja>
          {conectados.length === 0 ? (
            <div className="grid gap-2 p-6"><p className="m-0 font-medium">Aún no has conectado ningún motor.</p>
              <p className="m-0 text-sm text-texto-3">Empieza gratis con un modelo local o con OpenCode Zen, o usa tu suscripción de Copilot, Cursor u OpenCode desde «Tu suscripción».</p></div>
          ) : conectados.map((c) => 'label' in c
            ? <Fila key={c.id} icono={<Bicho de={c.id} tamaño={17} />} titulo={c.label} sub="por API · clave en tu llavero" derecha={<Pastilla><Check className="size-3.5" />listo</Pastilla>} />
            : <Fila key={c.id} icono={<TintaVista motor={c.id} px={22} estado="lista" />} titulo={c.nombre} sub={<span title={c.ruta ?? undefined}>tu agente · en este equipo</span>} derecha={<Pastilla>instalado</Pastilla>}>
                <div className="pl-11"><EntrarAgente motor={c.id} nombre={c.nombre} /><VersionDeAgente id={c.id} nombre={c.nombre} v={versiones[c.id]} onCambio={recargarVersiones} /></div>
              </Fila>)}
        </Caja>
      )}

      {vista === 'suscripcion' && (
        <div className="grid gap-3">
          <p className="m-0 max-w-[68ch] text-sm text-texto-2">Esme abre la CLI oficial que ya tienes instalada, con tu sesión, y le da su memoria. Nunca guarda tus tokens: inicias sesión tú, en la CLI de cada servicio.</p>
          <Caja>
            {motores.length === 0 && <p className="m-0 p-6 text-sm text-texto-3">{bridge.mode() === 'web' ? 'Los motores por suscripción se detectan en la app de escritorio.' : 'Buscando motores…'}</p>}
            {motores.map((m) => { const s = SELLO[m.cumplimiento]; return (
              <Fila key={m.id} icono={<Bicho de={m.id} tamaño={17} />} titulo={m.nombre}
                sub={m.instalado ? <span title={m.ruta ?? undefined}>instalado en este equipo</span> : `sin instalar · ${m.login}`}
                derecha={<>
                  <Pastilla className={s.cls}><s.Icono className="size-3.5" strokeWidth={1.5} />{s.texto}</Pastilla>
                  <Pastilla className={m.instalado ? 'text-texto' : 'text-texto-3'}>{m.instalado ? 'listo' : 'instálalo'}</Pastilla>
                </>}>
                {(/sin verificar/i.test(m.nota) || m.cumplimiento !== 'permitido') && <p className="m-0 pl-11 text-xs text-texto-3">{m.nota} · verificado el {m.verificado}</p>}
              </Fila>) })}
          </Caja>
        </div>
      )}

      {vista === 'catalogo' && (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-9 min-w-[260px] flex-1 items-center gap-2 rounded-2 vidrio halo border px-3 focus-within:border-linea-fuerte">
              <Search className="size-4 text-texto-3" strokeWidth={1.5} aria-hidden />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Busca un proveedor: openrouter, groq, mistral…" aria-label="Buscar proveedor" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-texto-3" />
            </label>
            <span className="text-xs text-texto-3 tabular-nums">{catalogo.length} proveedores · {totalModelos.toLocaleString('es-ES')} modelos · {totalGratis} gratis{origen ? ` · datos de models.dev (${origen.origen === 'red' ? 'al día' : origen.origen === 'cache' ? 'en caché' : 'semilla sin conexión'})` : ''}</span>
          </div>
          <Caja>
            {filtrado.length === 0 && <p className="m-0 p-6 text-sm text-texto-3">{bridge.mode() === 'web' ? 'El catálogo se carga en la app de escritorio.' : 'Ningún proveedor coincide.'}</p>}
            {filtrado.slice(0, 80).map((c) => (
              <div key={c.id} className="border-b border-linea last:border-b-0">
                <button type="button" onClick={() => abrir(c.id)} aria-expanded={abierto === c.id} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-s2/60">
                  <ChevronRight className={cn('size-4 shrink-0 text-texto-3 transition-transform', abierto === c.id && 'rotate-90')} strokeWidth={1.5} />
                  <span className="truncate text-sm font-medium">{c.nombre}</span>
                  <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-texto-3 tabular-nums">
                    {c.gratis > 0 && <span className="aurora-borde inline-flex h-6 items-center rounded-full px-2.5 font-medium text-texto">{c.gratis} gratis</span>}
                    {c.modelos} modelos
                  </span>
                </button>
                {abierto === c.id && (
                  <div className="grid gap-1 px-4 pb-3 pl-11">
                    {(modelos[c.id] ?? []).slice(0, 12).map((m) => (
                      <div key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2 px-2 py-1.5 text-[13px] hover:bg-s2/60">
                        <span className="truncate">{m.nombre}<span className="ml-2 text-xs text-texto-3">{m.id}</span></span>
                        <span className="flex gap-1.5">{m.gratis && <Pastilla className="aurora-borde border-transparent text-texto">gratis</Pastilla>}{m.herramientas && <Pastilla>herramientas</Pastilla>}{m.razonamiento && <Pastilla>razona</Pastilla>}</span>
                        <span className="w-[200px] text-right text-xs text-texto-3 tabular-nums">{m.contexto ? `${fmtTokens(m.contexto)} ctx · ` : ''}{m.gratis ? 'gratis' : `${fmtUSD(m.coste.entrada)} / ${fmtUSD(m.coste.salida)} por 1M`}</span>
                      </div>))}
                    {(modelos[c.id]?.length ?? 0) > 12 && <span className="px-2 text-xs text-texto-3">y {modelos[c.id]!.length - 12} más</span>}
                    {api.some((p) => p.id === c.id || (c.id === 'opencode' && p.id === 'opencode-zen'))
                      ? <span className="px-2 pt-1 text-xs text-texto-2">Conéctalo en «Conectados» pegando tu clave en su fila.</span>
                      : <span className="px-2 pt-1 text-xs text-texto-3">Pronto: conexión directa con tu clave ({c.env.join(', ') || 'sin variable'}).</span>}
                  </div>)}
              </div>))}
          </Caja>
          <div className="grid gap-2">
            <h3 className="m-0 text-sm font-semibold">Tus claves</h3>
            <Caja>{api.map((p) => (
              <Fila key={p.id} icono={<KeyRound className="size-4" strokeWidth={1.5} />} titulo={p.label} sub={p.retainsData ? 'ojo: puede usar tus datos para entrenar' : 'no retiene tus datos'}
                derecha={p.hasKey ? <Pastilla><Check className="size-3.5" />guardada</Pastilla> : undefined}>
                {bridge.mode() === 'electron' && <Clave p={p} onCambio={refrescar} />}
              </Fila>))}</Caja>
          </div>
        </div>
      )}

      {vista === 'local' && (
        <div className="grid gap-4">
          <Caja>
            {locales.map((p) => <Fila key={p.id} icono={<Laptop className="size-4" strokeWidth={1.5} />} titulo={p.label} sub="nada sale de tu ordenador" derecha={<Pastilla>{p.defaultModel ?? 'modelo a elegir'}</Pastilla>} />)}
            <Fila icono={<Cpu className="size-4" strokeWidth={1.5} />} titulo="Más modelos locales" sub="la Tienda los detectará y te dejará instalarlos con un clic" />
          </Caja>
          <CatalogoRegistro />
        </div>
      )}
    </div>
  )
}

function Presupuesto() {
  const [estado, setEstado] = useState<EstadoUso | null>(null)
  const [diario, setDiario] = useState(''), [mensual, setMensual] = useState('')
  useEffect(() => { void bridge.uso.estado().then((e) => { setEstado(e); if (e) { setDiario(e.presupuesto.diarioUSD ? String(e.presupuesto.diarioUSD) : ''); setMensual(e.presupuesto.mensualUSD ? String(e.presupuesto.mensualUSD) : '') } }) }, [])
  const guardar = async () => {
    const e = await bridge.uso.presupuesto({ diarioUSD: Number(diario) || undefined, mensualUSD: Number(mensual) || undefined, avisos: estado?.presupuesto.avisos ?? [0.5, 0.8, 1] })
    if (e) { setEstado(e); toast.success('Presupuesto guardado') }
  }
  if (!estado) return <Caja><p className="m-0 p-6 text-sm text-texto-3">{bridge.mode() === 'web' ? 'El presupuesto se gestiona en la app de escritorio.' : 'Cargando…'}</p></Caja>
  const campo = (etq: string, v: string, set: (s: string) => void, gasto: number) => (
    <label className="grid gap-1.5">
      <span className="text-xs text-texto-3">{etq} · llevas {fmtUSD(gasto)}</span>
      <span className="flex h-10 items-center gap-1 rounded-2 border border-linea bg-fondo px-3 focus-within:border-linea-fuerte"><span className="text-texto-3">$</span>
        <input inputMode="decimal" value={v} onChange={(e) => set(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="sin tope" className="min-w-0 flex-1 bg-transparent text-sm outline-none tabular-nums placeholder:text-texto-3" /></span>
    </label>)
  return (
    <div className="grid max-w-[560px] gap-4">
      <p className="m-0 text-sm text-texto-2">Esme te avisa al llegar al {estado.presupuesto.avisos.map((a) => `${Math.round(a * 100)} %`).join(', ')} de tus topes. Al 100 % te pregunta antes de seguir gastando.</p>
      <Caja className="grid gap-4 p-4">
        <div className="grid grid-cols-2 gap-3">{campo('Tope diario', diario, setDiario, estado.hoyUSD)}{campo('Tope mensual', mensual, setMensual, estado.mesUSD)}</div>
        <div className="flex justify-end"><button type="button" onClick={guardar} className="h-9 rounded-2 bg-acento px-4 text-sm font-medium text-sobre-acento">Guardar presupuesto</button></div>
      </Caja>
    </div>
  )
}

// Qué hace Esme al cerrar su ventana: quedarse junto al reloj para que tu equipo siga trabajando, o cerrarse del todo.
function Sistema() {
  const [v, setV] = useState<AlCerrar | null>(null)
  useEffect(() => { void bridge.ajustes.alCerrar().then(setV) }, [])
  const poner = async (n: AlCerrar) => { setV(n); const r = await bridge.ajustes.ponerAlCerrar(n); if (!r.ok) toast.error(r.error) }
  const AYUDA: Record<AlCerrar, string> = {
    auto: 'Si tu equipo tiene encargos programados o agentes trabajando, Esme se queda junto al reloj para hacerlos. Si no, se cierra.',
    siempre: 'Esme se queda siempre junto al reloj al cerrar la ventana. Para cerrarla del todo: su icono → Salir del todo.',
    nunca: 'Esme se cierra del todo al cerrar la ventana, aunque haya encargos programados: no se harán hasta que la abras.',
  }
  return (
    <div className="grid gap-5">
    <Lanzador />
    <MenteCompartida />
    <section className="vidrio grid gap-3 rounded-4 border p-5">
      <h3 className="m-0 text-sm font-semibold">Al cerrar la ventana</h3>
      {v === null ? <span className="h-10 w-72 animate-pulse rounded-3 bg-s2/70" /> : (
        <>
          <Segmentos<AlCerrar> id="al-cerrar" valor={v} onCambio={(n) => void poner(n)} opciones={[{ id: 'auto', texto: 'Si hay trabajo pendiente' }, { id: 'siempre', texto: 'Quedarse siempre' }, { id: 'nunca', texto: 'Cerrarse del todo' }]} />
          <p className="m-0 max-w-[620px] text-[13px] leading-5 text-texto-2">{AYUDA[v]}</p>
        </>
      )}
    </section>
    </div>
  )
}

// El lanzador: Esme desde cualquier app con un atajo
function Lanzador() {
  const lz = (window as unknown as { daimon?: { lanzador?: { alternar(): void; estado(): Promise<{ atajo: string; registrado: boolean }> } } }).daimon?.lanzador
  const [e, setE] = useState<{ atajo: string; registrado: boolean } | null>(null)
  useEffect(() => { void lz?.estado().then(setE) }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="vidrio grid gap-3 rounded-4 border p-5">
      <h3 className="m-0 text-sm font-semibold">Esme desde cualquier sitio</h3>
      <p className="m-0 max-w-[640px] text-[13px] leading-5 text-texto-2">
        {e ? (e.registrado ? <>Pulsa <kbd className="rounded-1 border border-linea px-1.5 py-0.5 font-sans text-[12px] text-texto">{e.atajo}</kbd> en cualquier app: preguntas, encargas a tu equipo o buscas en tu mente sin cambiar de ventana.</> : `Otra app usa ${e.atajo}: el lanzador sigue disponible con el botón.`) : 'Cargando…'}
      </p>
      <button type="button" onClick={() => lz?.alternar()} className="h-8 w-fit rounded-full border border-linea px-4 text-[12.5px] text-texto-2 hover:text-texto">Probarlo</button>
    </section>
  )
}

// Tu mente para todas tus IAs: Esme registra su memoria en los agentes que usas fuera de ella. Adiós a los .md.
function MenteCompartida() {
  const [agentes, setAgentes] = useState<AgenteMente[] | null>(null)
  const recargar = () => void bridge.mente.agentes().then(setAgentes)
  useEffect(recargar, [])
  // La entrada se compone en el proceso principal (el token no vuelve a la ventana) y va al portapapeles.
  const copiar = async () => {
    const r = await bridge.mente.copiarEntrada()
    if (r.ok) toast.success('Entrada copiada', { description: 'Pégala en la configuración MCP de la otra IA.' })
    else toast.error(r.error ?? 'No pude copiarla.')
  }
  const cambiar = async (a: AgenteMente) => {
    const r = await bridge.mente.conectar(a.id, !a.conectado)
    if (!r.ok) { toast.error(r.error); return }
    toast.success(a.conectado ? `${a.nombre} ya no usa tu mente` : `${a.nombre} ya usa tu mente`, { description: a.conectado ? undefined : 'Reinícialo para que la vea. Guardé una copia de su configuración anterior.' })
    recargar()
  }
  return (
    <section className="vidrio grid gap-3 rounded-4 border p-5">
      <h3 className="m-0 text-sm font-semibold">Tu mente en tus otras IAs</h3>
      <p className="m-0 max-w-[640px] text-[13px] leading-5 text-texto-2">Los agentes que usas fuera de Esme pueden recordar con tu mente en vez de con ficheros .md: lo que aprende uno lo saben todos. Solo funciona en este equipo (127.0.0.1) y con tu token.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void copiar()}
          className="rounded-full border border-linea px-3 py-1.5 text-[12.5px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto">
          Copiar la entrada para otra IA
        </button>
        <span className="text-[12px] text-texto-3">La pegas en la configuración MCP de la otra IA y ya recuerda contigo.</span>
      </div>
      <ul className="m-0 grid list-none gap-2 p-0">
        {(agentes ?? []).map((a) => (
          <li key={a.id} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 text-[13.5px] text-texto">{a.nombre}<span className="ml-2 text-[12px] text-texto-3">{a.instalado ? a.fichero.replace(/^.*?(\.[^/]+.*)$/, '~/$1') : 'no lo tienes en este equipo'}</span></span>
            <button type="button" role="switch" aria-checked={a.conectado} aria-label={`Tu mente en ${a.nombre}`} disabled={!a.instalado && !a.conectado}
              onClick={() => void cambiar(a)} className={cn('relative h-6 w-10 rounded-full transition-colors disabled:opacity-30', a.conectado ? 'bg-acento' : 'bg-s3')}>
              <span className={cn('absolute top-1 size-4 rounded-full bg-white transition-all', a.conectado ? 'left-5' : 'left-1')} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * La mente desde el navegador: dónde está y con qué palabra se abre.
 *
 * Sólo aparece en la versión web (en la de escritorio la mente ya está en casa y la lleva el
 * proceso principal). El token es la palabra de la memoria: se queda en este navegador y
 * no se enseña en ninguna URL.
 */
function MenteDesdeElNavegador() {
  const guardada = conexionGuardada()
  const [url, setUrl] = useState(guardada?.url ?? 'http://127.0.0.1:47321')
  const [token, setToken] = useState(guardada?.token ?? '')
  const [estado, setEstado] = useState<'idle' | 'mira' | 'viva' | 'error'>('idle')
  const [motivo, setMotivo] = useState('')
  const [recuerdos, setRecuerdos] = useState<number | null>(null)

  const mirar = async (): Promise<boolean> => {
    setEstado('mira'); setMotivo('')
    const c = new ClienteCerebro({ url: url.replace(/\/+$/, ''), token: token.trim() })
    try {
      const h = await c.salud()
      setRecuerdos(h.memories); setEstado('viva')
      return true
    } catch (e) {
      setEstado('error'); setMotivo(e instanceof Error ? e.message : String(e)); setRecuerdos(null)
      return false
    }
  }
  const conectar = async () => {
    if (!await mirar()) return
    guardarConexion({ url, token: token.trim() })
    toast.success('Conectado con tu mente', { description: 'Esme ya recuerda y sueña desde aquí.' })
  }
  const olvidar = () => {
    olvidarConexion(); setToken(''); setEstado('idle'); setRecuerdos(null)
    toast('Se te olvidó la mente en este navegador', { description: 'Ya no guarda nada de ella aquí.' })
  }

  return (
    <section className="vidrio grid gap-3 rounded-4 border p-5">
      <h3 className="m-0 text-sm font-semibold">Tu mente, desde el navegador</h3>
      <p className="m-0 max-w-[640px] text-[13px] leading-5 text-texto-2">
        Esta copia de Esme habla con tu mente por su propia puerta: donde esté (este equipo o tu servidor) y con la palabra que abre.
        La palabra se queda en este navegador y no viaja en ninguna URL.
      </p>
      <div className="grid gap-2">
        <label className="grid gap-1">
          <span className="text-[12px] text-texto-2">Dónde está</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false}
            className="rounded-2 border border-linea bg-s2 px-2.5 py-1.5 text-[13px] text-texto outline-none focus:border-linea-fuerte" />
        </label>
        <label className="grid gap-1">
          <span className="text-[12px] text-texto-2">Su palabra (el token)</span>
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} spellCheck={false}
            className="rounded-2 border border-linea bg-s2 px-2.5 py-1.5 text-[13px] text-texto outline-none focus:border-linea-fuerte" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void conectar()} disabled={!url.trim() || !token.trim() || estado === 'mira'}
          className="rounded-full border border-linea px-3 py-1.5 text-[12.5px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto disabled:opacity-40">
          {estado === 'mira' ? 'Mirando…' : 'Conectar'}
        </button>
        {guardada && (
          <button type="button" onClick={olvidar}
            className="rounded-full border border-linea px-3 py-1.5 text-[12.5px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto">
            Olvidar la mente aquí
          </button>
        )}
        {estado === 'viva' && <span className="text-[12.5px] text-texto-2">Mente viva: {recuerdos?.toLocaleString('es')} recuerdos.</span>}
        {estado === 'error' && <span className="text-[12.5px] text-peligro">No pude entrar: {motivo}</span>}
      </div>
    </section>
  )
}

export function Ajustes({ tema, onTema, pieles }: { tema: 'noche' | 'dia'; onTema(t: 'noche' | 'dia'): void; pieles: Pieles }) {
  const [pestana, setPestana] = useState<Pestana>('motores')
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-[980px] gap-6 px-10 pt-10 pb-12">
        <div className="grid gap-2">
          <h1 className="m-0 font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.03em]">Ajustes</h1>
          <p className="m-0 text-[15px] text-texto-2">Esme funciona con cualquier IA. Conecta las que quieras: por API, con tu suscripción o en tu ordenador.</p>
        </div>
        <Segmentos<Pestana> id="pestana" valor={pestana} onCambio={setPestana} opciones={[{ id: 'motores', texto: 'Motores' }, { id: 'presupuesto', texto: 'Presupuesto' }, { id: 'apariencia', texto: 'Apariencia' }, { id: 'plan', texto: 'Tu plan' }, { id: 'sistema', texto: 'Sistema' }]} />
        {pestana === 'motores' && <Motores />}
        {pestana === 'presupuesto' && <Presupuesto />}
        {pestana === 'apariencia' && <Apariencia tema={tema} onTema={onTema} pieles={pieles} />}
        {pestana === 'plan' && <TuPlan />}
        {pestana === 'sistema' && <Sistema />}
        {pestana === 'sistema' && bridge.mode() === 'web' && <MenteDesdeElNavegador />}
        {(pestana === 'motores' || pestana === 'presupuesto') && <p className="m-0 flex items-center gap-2 text-xs text-texto-3"><Wallet className="size-3.5" strokeWidth={1.5} />Los precios vienen de models.dev y se actualizan solos cada día.</p>}
      </div>
    </div>
  )
}
