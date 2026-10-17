// El vestidor (Ajustes › Apariencia): aquí la persona cambia Esme entera. Arriba, la piel que lleva con deshacer, rehacer y
// restablecer; luego las pieles de casa, cada una pintada con sus propios colores y su letra; y abajo cada capa de la piel
// para afinarla. Los deslizadores ensayan en vivo y solo se guarda en el historial lo que sueltas.
import { LoaderCircle, Moon, Redo2, RotateCcw, Sparkles, Sun, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { disenarPiel } from '../tinta/disenar'
import { cn } from '../lib/cn'
import { paletaPropia } from '../tinta/estilo-propio'
import { LETRAS, PIEL_BASE, revisarContraste, variablesDePiel, type Base, type LetraId, type Piel } from '../tinta/piel'
import { PIELES_CASA } from '../tinta/pieles-casa'
import { cargarLetra } from '../tinta/vestir'

export type Pieles = { actual: Piel; puedeDeshacer: boolean; puedeRehacer: boolean; ensayar(p: Piel): void; vestir(p: Piel): void; deshacer(): void; rehacer(): void }
type Tema = 'noche' | 'dia'
type Muestra = { fondo: string; superficie: string; texto: string; acento: string }

// Los colores con los que se reconoce cada estilo de casa (los mismos del CSS)
const ESTILOS: Record<string, Record<Tema, Muestra>> = {
  esmeralda: { noche: { fondo: '#05080f', superficie: '#0a0f1a', texto: '#e9eef7', acento: '#23d9b0' }, dia: { fondo: '#f4f6fa', superficie: '#ffffff', texto: '#0a1222', acento: '#087f69' } },
  quartz: { noche: { fondo: 'oklch(15% 0.014 262)', superficie: 'oklch(18.5% 0.016 262)', texto: 'oklch(96.5% 0.006 250)', acento: 'oklch(80% 0.110 195)' }, dia: { fondo: 'oklch(99.1% 0.002 250)', superficie: 'oklch(99.7% 0.001 250)', texto: 'oklch(20% 0.024 262)', acento: 'oklch(52% 0.090 195)' } },
  lime: { noche: { fondo: '#0e0e0c', superficie: '#1a1a17', texto: '#f4f3ee', acento: '#cad649' }, dia: { fondo: '#f6f5f2', superficie: '#ffffff', texto: '#0f0f0d', acento: '#7c8700' } },
  grabado: { noche: { fondo: '#08090d', superficie: '#0f1117', texto: '#e8ebf0', acento: '#5ef0d4' }, dia: { fondo: '#f3f3ef', superficie: '#fbfbf9', texto: '#141a26', acento: '#077567' } },
}
function muestra(p: Piel, tema: Tema): Muestra {
  if (p.color.tipo === 'libre') return p.color[tema]
  if (p.color.tipo === 'gustos') { const v = paletaPropia(p.color.gustos, tema); return { fondo: v['--fondo'], superficie: v['--superficie-1'], texto: v['--texto'], acento: v['--acento'] } }
  return ESTILOS[p.color.estilo][tema]
}
const igual = (a: Piel, b: Piel) => JSON.stringify(a) === JSON.stringify(b)
const radio = (p: Piel, base: number) => `${Math.round(base * p.forma.radio)}px`

function Tarjeta({ p, tema, puesta, onVestir }: { p: Piel; tema: Tema; puesta: boolean; onVestir(): void }) {
  const m = muestra(p, tema), t = LETRAS[p.letra.titulos], x = LETRAS[p.letra.texto]
  return (
    <button type="button" onClick={onVestir} aria-pressed={puesta} title={`Vestir «${p.nombre}»`}
      className={cn('group grid w-full gap-2 rounded-3 border p-2 text-left transition-colors', puesta ? 'border-acento' : 'border-linea hover:border-linea-fuerte')}>
      <span aria-hidden className="grid h-[104px] content-between overflow-hidden p-3" style={{ background: m.fondo, borderRadius: radio(p, 10) }}>
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[22px] leading-none" style={{ color: m.texto, fontFamily: t.titulos }}>Aa</span>
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: m.acento }} />
        </span>
        <span className="grid gap-1.5 p-2" style={{ background: m.superficie, borderRadius: radio(p, 6) }}>
          <span className="h-1.5 w-3/4 rounded-full opacity-80" style={{ background: m.texto }} />
          <span className="h-1.5 w-1/2 rounded-full opacity-45" style={{ background: m.texto }} />
          <span className="mt-0.5 h-3.5 w-12" style={{ background: m.acento, borderRadius: radio(p, 6) }} />
        </span>
      </span>
      <span className="grid px-1 leading-tight">
        <span className={cn('text-[13px]', puesta ? 'font-medium text-texto' : 'text-texto')}>{p.nombre}</span>
        <span className="truncate text-[11.5px] text-texto-3" style={{ fontFamily: x.texto }}>{t.nombre}{t !== x ? ` + ${x.nombre}` : ''}</span>
      </span>
    </button>
  )
}

function Segmentado<T extends string>({ valor, opciones, onCambio, etiqueta }: { valor: T; opciones: [T, string][]; onCambio(v: T): void; etiqueta: string }) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="inline-flex rounded-full border border-linea bg-s1 p-0.5">
      {opciones.map(([id, texto]) => (
        <button key={id} type="button" role="radio" aria-checked={valor === id} onClick={() => onCambio(id)}
          className={cn('h-7 rounded-full px-3 text-[12.5px] transition-colors', valor === id ? 'bg-acento text-sobre-acento' : 'text-texto-2 hover:text-texto')}>{texto}</button>
      ))}
    </div>
  )
}

function Capa({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-linea pt-4">
      <h3 className="m-0 text-[13px] font-medium text-texto-2">{titulo}</h3>
      {children}
    </section>
  )
}

const EJEMPLOS = ['Como Linear', 'Más cálida', 'Minimalista japonés', 'Terminal retro de los 80', 'Revista de moda', 'Seria y compacta para trabajar']

/** Pídesela a Esme: la IA diseña la piel, Esme la comprueba y te la pone para que la veas; tú decides. */
function Pidesela({ pieles }: { pieles: Pieles }) {
  const [peticion, setPeticion] = useState('')
  const [fase, setFase] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [propuesta, setPropuesta] = useState<{ piel: Piel; motor: string; antes: Piel } | null>(null)
  const pedir = async (q: string) => {
    const texto = q.trim(); if (!texto || fase) return
    setPeticion(texto); setError(null); setFase('Pensando…')
    const antes = propuesta?.antes ?? pieles.actual
    const r = await disenarPiel(texto, antes, setFase)
    setFase(null)
    if (!r.ok) { setError(r.error); return }
    setPropuesta({ piel: r.piel, motor: r.motor, antes }); pieles.ensayar(r.piel)
  }
  const cerrar = (quedarse: boolean) => { if (!propuesta) return; pieles.vestir(quedarse ? propuesta.piel : propuesta.antes); setPropuesta(null) }
  return (
    <section aria-label="Pídesela a Esme" className="grid gap-3 rounded-4 border border-linea bg-s1 p-4">
      <form onSubmit={(e) => { e.preventDefault(); void pedir(peticion) }} className="flex items-center gap-2">
        <Sparkles className="size-4 shrink-0 text-acento" strokeWidth={1.75} aria-hidden />
        <input value={peticion} onChange={(e) => setPeticion(e.target.value)} disabled={!!fase} aria-label="Describe la piel que quieres"
          placeholder="Pídesela a Esme: «como Linear», «más cálida», «terminal retro»…"
          className="h-9 min-w-0 flex-1 bg-transparent text-[14.5px] text-texto outline-none placeholder:text-texto-3" />
        <button type="submit" disabled={!peticion.trim() || !!fase} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-acento px-3.5 text-[13px] font-medium text-sobre-acento disabled:opacity-40">
          {fase ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : null}Diseñar
        </button>
      </form>
      {!fase && !propuesta && (
        <div className="flex flex-wrap gap-1.5">
          {EJEMPLOS.map((x) => <button key={x} type="button" onClick={() => void pedir(x)} className="rounded-full border border-linea px-2.5 py-1 text-[12px] text-texto-2 hover:border-linea-fuerte hover:text-texto">{x}</button>)}
        </div>
      )}
      {fase && <p aria-live="polite" className="m-0 text-[13px] text-texto-2">{fase}</p>}
      {error && <p role="alert" className="m-0 text-[13px] text-atencion">{error}</p>}
      {propuesta && (
        <div className="flex flex-wrap items-center gap-2 rounded-3 border border-acento/50 bg-acento-velo px-3 py-2.5">
          <span className="mr-auto text-[13.5px] text-texto">«{propuesta.piel.nombre}», diseñada con {propuesta.motor}. Ya la llevas puesta para que la veas en toda la app.</span>
          <button type="button" onClick={() => cerrar(true)} className="h-8 rounded-full bg-acento px-3.5 text-[13px] font-medium text-sobre-acento">Quedármela</button>
          <button type="button" onClick={() => void pedir(peticion)} className="h-8 rounded-full border border-linea px-3 text-[13px] text-texto-2 hover:text-texto">Otra</button>
          <button type="button" onClick={() => cerrar(false)} className="h-8 rounded-full border border-linea px-3 text-[13px] text-texto-2 hover:text-texto">Volver a la mía</button>
        </div>
      )}
    </section>
  )
}

export function Apariencia({ tema, onTema, pieles }: { tema: Tema; onTema(t: Tema): void; pieles: Pieles }) {
  const p = pieles.actual
  useEffect(() => { for (const id of Object.keys(LETRAS) as LetraId[]) void cargarLetra(id) }, [])   // para ver cada letra en su muestra
  const cambia = (cambio: Partial<Piel>, ensayo = false) => {
    const nueva: Piel = { ...p, ...cambio, nombre: PIELES_CASA.some((c) => c.nombre === p.nombre) ? `${p.nombre} a tu manera` : p.nombre }
    ;(ensayo ? pieles.ensayar : pieles.vestir)(nueva)
  }
  // un deslizador ensaya mientras se mueve y viste al soltarlo
  const deslizador = (nombre: string, min: number, max: number, paso: number, v: number, poner: (n: number) => Partial<Piel>, izquierda: string, derecha: string, formato = (n: number) => String(n)) => (
    <label className="grid max-w-[420px] gap-1.5">
      <span className="flex justify-between text-xs text-texto-2"><span>{nombre}</span><span className="tabular-nums text-texto-3">{formato(v)}</span></span>
      <input type="range" min={min} max={max} step={paso} value={v} className="accent-acento"
        onChange={(e) => cambia(poner(Number(e.target.value)), true)}
        onPointerUp={(e) => cambia(poner(Number((e.target as HTMLInputElement).value)))}
        onKeyUp={(e) => cambia(poner(Number((e.target as HTMLInputElement).value)))} />
      <span className="flex justify-between text-[10.5px] text-texto-3"><span>{izquierda}</span><span>{derecha}</span></span>
    </label>
  )
  const avisos = p.color.tipo === 'estilo' ? [] : revisarContraste(variablesDePiel(p, tema))
  const base: Record<Tema, Base> = p.color.tipo === 'libre' ? p.color : { noche: muestra(p, 'noche'), dia: muestra(p, 'dia') }
  const libre = (t: Tema, k: keyof Muestra, valor: string) => cambia({ color: { tipo: 'libre', noche: { ...base.noche }, dia: { ...base.dia }, [t]: { ...base[t], [k]: valor } } as Piel['color'] })
  const esHex = (c: string) => /^#[0-9a-f]{6}$/i.test(c)

  return (
    <div className="grid max-w-[880px] gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <span className="text-xs text-texto-3">Llevas puesta</span>
          <span className="font-display text-[22px] leading-tight font-semibold tracking-[-0.02em]">{p.nombre}</span>
        </div>
        <div className="flex items-center gap-2">
          <Segmentado<Tema> etiqueta="Día o noche" valor={tema} onCambio={onTema} opciones={[['noche', 'Noche'], ['dia', 'Día']]} />
          <button type="button" onClick={pieles.deshacer} disabled={!pieles.puedeDeshacer} title="Deshacer el último cambio de piel"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-linea px-3 text-[12.5px] text-texto-2 hover:text-texto disabled:opacity-35"><Undo2 className="size-3.5" />Deshacer</button>
          <button type="button" onClick={pieles.rehacer} disabled={!pieles.puedeRehacer} title="Rehacer"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-linea px-3 text-[12.5px] text-texto-2 hover:text-texto disabled:opacity-35"><Redo2 className="size-3.5" />Rehacer</button>
          <button type="button" onClick={() => pieles.vestir(PIEL_BASE)} disabled={igual(p, PIEL_BASE)} title="Volver a la piel de casa (también con Ctrl+Mayús+0, desde cualquier sitio)"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-linea px-3 text-[12.5px] text-texto-2 hover:text-texto disabled:opacity-35"><RotateCcw className="size-3.5" />Restablecer</button>
        </div>
      </div>
      <p className="m-0 max-w-[62ch] text-sm leading-6 text-texto-2">Esme no tiene un diseño: tiene pieles. Vístela con una de casa o cámbiale cada capa; todo se ve al momento y cualquier cambio se puede deshacer. Si algo deja de leerse bien, te lo digo antes de que te canse la vista.</p>

      <Pidesela pieles={pieles} />

      <div role="list" aria-label="Pieles de casa" className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {PIELES_CASA.map((c) => <div role="listitem" key={c.nombre}><Tarjeta p={c} tema={tema} puesta={p.nombre === c.nombre && igual(p, c)} onVestir={() => pieles.vestir(c)} /></div>)}
      </div>

      {avisos.length > 0 && (
        <div role="alert" className="grid gap-1 rounded-3 border border-atencion/40 bg-atencion-velo px-4 py-3 text-[13px] text-texto">
          <span className="font-medium text-atencion">Esto no se lee bien con esta piel:</span>
          {avisos.map((a) => <span key={a} className="text-texto-2">{a}</span>)}
        </div>
      )}

      <Capa titulo="Color">
        <div className="flex flex-wrap items-center gap-2">
          <Segmentado etiqueta="Tipo de color" valor={p.color.tipo} onCambio={(t) => cambia({ color: t === 'estilo' ? { tipo: 'estilo', estilo: 'esmeralda' } : t === 'gustos' ? { tipo: 'gustos', gustos: { tono: 165, papel: 30, fuerza: 70 } } : { tipo: 'libre', noche: base.noche, dia: base.dia } })}
            opciones={[['estilo', 'De casa'], ['gustos', 'Mi ecuación'], ['libre', 'Libre']]} />
          {p.color.tipo === 'estilo' && (
            <Segmentado etiqueta="Estilo de casa" valor={p.color.estilo} onCambio={(estilo) => cambia({ color: { tipo: 'estilo', estilo } })}
              opciones={[['esmeralda', 'Esmeralda'], ['quartz', 'Cuarzo'], ['lime', 'Lima'], ['grabado', 'Tinta y Luz']]} />
          )}
        </div>
        {p.color.tipo === 'gustos' && (() => { const g = p.color.gustos; return (
          <div className="grid gap-4 sm:grid-cols-3">
            {deslizador('Tono de la luz', 0, 360, 1, g.tono, (tono) => ({ color: { tipo: 'gustos', gustos: { ...g, tono } } }), 'frío', 'cálido')}
            {deslizador('Temperatura del papel', 0, 100, 1, g.papel, (papel) => ({ color: { tipo: 'gustos', gustos: { ...g, papel } } }), 'azul', 'ámbar')}
            {deslizador('Fuerza', 0, 100, 1, g.fuerza, (fuerza) => ({ color: { tipo: 'gustos', gustos: { ...g, fuerza } } }), 'casi gris', 'vivísimo')}
          </div>) })()}
        {p.color.tipo === 'libre' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {(['noche', 'dia'] as const).map((t) => (
              <div key={t} className="grid gap-2 rounded-3 border border-linea p-3">
                <span className="flex items-center gap-1.5 text-xs text-texto-2">{t === 'noche' ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}{t === 'noche' ? 'De noche' : 'De día'}</span>
                <div className="grid grid-cols-4 gap-2">
                  {(['fondo', 'superficie', 'texto', 'acento'] as const).map((k) => (
                    <label key={k} className="grid gap-1 text-[11px] text-texto-3">
                      <input type="color" value={esHex(base[t][k]) ? base[t][k] : '#808080'} onChange={(e) => libre(t, k, e.target.value)}
                        className="h-9 w-full cursor-pointer rounded-2 border border-linea bg-transparent" aria-label={`${k} ${t === 'noche' ? 'de noche' : 'de día'}`} />
                      {k}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Capa>

      <Capa titulo="Letra">
        <div className="grid gap-3 sm:grid-cols-2">
          {(['titulos', 'texto'] as const).map((rol) => (
            <label key={rol} className="grid gap-1.5 text-xs text-texto-2">
              {rol === 'titulos' ? 'Títulos' : 'Texto'}
              <select value={p.letra[rol]} onChange={(e) => cambia({ letra: { ...p.letra, [rol]: e.target.value as LetraId } })}
                className="h-9 rounded-2 border border-linea bg-s1 px-3 text-[14px] text-texto" style={{ fontFamily: LETRAS[p.letra[rol]][rol] }}>
                {(Object.keys(LETRAS) as LetraId[]).map((id) => <option key={id} value={id} style={{ fontFamily: LETRAS[id][rol] }}>{LETRAS[id].nombre}</option>)}
              </select>
            </label>
          ))}
        </div>
        {deslizador('Tamaño de toda la app', 0.85, 1.2, 0.05, p.letra.escala, (escala) => ({ letra: { ...p.letra, escala } }), 'más pequeña', 'más grande', (n) => `${Math.round(n * 100)} %`)}
      </Capa>

      <Capa titulo="Forma">
        {deslizador('Esquinas', 0, 2.5, 0.1, p.forma.radio, (r) => ({ forma: { ...p.forma, radio: r } }), 'cuadradas', 'muy redondas', (n) => `${Math.round(n * 100)} %`)}
        <Segmentado etiqueta="Sombras" valor={p.forma.sombra} onCambio={(sombra) => cambia({ forma: { ...p.forma, sombra } })} opciones={[['plana', 'Planas'], ['suave', 'Suaves'], ['honda', 'Hondas']]} />
      </Capa>

      <Capa titulo="Ritmo y fondo">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <label className="grid gap-1.5 text-xs text-texto-2">Densidad<Segmentado etiqueta="Densidad" valor={p.densidad} onCambio={(densidad) => cambia({ densidad })} opciones={[['compacta', 'Compacta'], ['comoda', 'Cómoda'], ['amplia', 'Amplia']]} /></label>
          <label className="grid gap-1.5 text-xs text-texto-2">Movimiento<Segmentado etiqueta="Movimiento" valor={p.movimiento} onCambio={(movimiento) => cambia({ movimiento })} opciones={[['nada', 'Nada'], ['sutil', 'Sutil'], ['vivo', 'Vivo']]} /></label>
          <label className="grid gap-1.5 text-xs text-texto-2">Fondo<Segmentado etiqueta="Fondo" valor={p.fondo} onCambio={(fondo) => cambia({ fondo })} opciones={[['liso', 'Liso'], ['aurora', 'Resplandor'], ['papel', 'Papel']]} /></label>
        </div>
        <p className="m-0 text-xs text-texto-3">«Liso» y «Nada» son lo que menos consume: ni el fondo ni la interfaz trabajan cuando no haces nada.</p>
      </Capa>
    </div>
  )
}
