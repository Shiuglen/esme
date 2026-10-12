// Paleta (Ctrl K): busca, navega y actúa. Lo que no sea una acción se convierte en una pregunta para Esme.
import { Command } from 'cmdk'
import { CornerDownLeft, MessageSquare, Palette, Search, SunMoon } from 'lucide-react'
import { useState } from 'react'
import { AJUSTES, SECCIONES, type SeccionId } from './secciones'

const ACENTOS = [['esmeralda', 'Esmeralda'], ['zafiro', 'Zafiro'], ['violeta', 'Violeta'], ['coral', 'Coral']] as const
const fila = 'flex h-[38px] cursor-pointer items-center gap-2.5 rounded-2 px-2.5 text-texto-2 data-[selected=true]:bg-s3 data-[selected=true]:text-texto'
const titulo = '[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-texto-3'

export function Paleta({ abierta, onCerrar, onIr, onPreguntar, onTema, onAcento }: {
  abierta: boolean; onCerrar(): void; onIr(id: SeccionId): void; onPreguntar(q: string): void; onTema(): void; onAcento(a: string): void
}) {
  const [texto, setTexto] = useState('')
  const hecho = (f: () => void) => () => { f(); setTexto(''); onCerrar() }
  return (
    <Command.Dialog open={abierta} onOpenChange={(v) => !v && onCerrar()} label="Paleta de comandos" loop
      overlayClassName="fixed inset-0 z-40 bg-black/40"
      contentClassName="fixed top-[14vh] left-1/2 z-50 w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-4 border border-linea bg-cristal shadow-flotante backdrop-blur-[20px]">
      <div className="flex items-center gap-2.5 border-b border-linea px-4 py-3.5 text-texto-3">
        <Search className="size-4" strokeWidth={1.5} aria-hidden />
        <Command.Input value={texto} onValueChange={setTexto} placeholder="Busca, pregunta o da una orden…" className="min-w-0 flex-1 bg-transparent text-[15px] text-texto outline-none placeholder:text-texto-3" />
        <kbd className="rounded-[5px] border border-linea bg-s2 px-1.5 py-0.5 font-sans text-[11px]">Esc</kbd>
      </div>
      <Command.List className="max-h-[380px] overflow-y-auto p-1.5">
        <Command.Empty className="px-2.5 py-3 text-texto-3">Pulsa Enter para preguntárselo a Esme.</Command.Empty>
        {texto.trim() && (
          <Command.Group heading="Esme" className={titulo}>
            <Command.Item value={`preguntar ${texto}`} onSelect={hecho(() => onPreguntar(texto.trim()))} className={fila}>
              <MessageSquare className="size-4" strokeWidth={1.5} />Preguntar «{texto.trim()}»<CornerDownLeft className="ml-auto size-3.5 text-texto-3" />
            </Command.Item>
          </Command.Group>
        )}
        <Command.Group heading="Ir a" className={titulo}>
          {[...SECCIONES, AJUSTES].map((s) => (
            <Command.Item key={s.id} value={`ir ${s.nombre}`} onSelect={hecho(() => onIr(s.id))} className={fila}>
              <s.Icono className="size-4" strokeWidth={1.5} />{s.nombre}<kbd className="ml-auto rounded-[5px] border border-linea bg-s2 px-1.5 py-0.5 font-sans text-[11px] text-texto-3">{s.atajo}</kbd>
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Apariencia" className={titulo}>
          <Command.Item value="cambiar tema día noche" onSelect={hecho(onTema)} className={fila}><SunMoon className="size-4" strokeWidth={1.5} />Cambiar entre día y noche</Command.Item>
          {ACENTOS.map(([id, nombre]) => (
            <Command.Item key={id} value={`acento ${nombre}`} onSelect={hecho(() => onAcento(id))} className={fila}><Palette className="size-4" strokeWidth={1.5} />Acento {nombre.toLowerCase()}</Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
