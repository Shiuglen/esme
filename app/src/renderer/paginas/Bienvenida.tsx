// La bienvenida: lo primero que ve cualquiera al abrir Esme.
//
// La regla del creador: *«que todos la amen»*. La primera vez que alguien abre la app no hay una
// mente llena, hay una pregunta: «¿qué es esto?». Así que aquí se explica en tres frases lo que
// Esme sabe hacer de verdad —recuerda, actúa, y tu equipo trabaja mientras tú haces otra cosa— y
// se ofrecen tres primeros pases que de verdad funcionan: no son ejemplos de mentira, son cosas que el
// motor puede hacer ahora mismo.
import { motion } from 'motion/react'
import { useMuelle } from '../tinta/movimiento'

export const PRIMEROS_PASES: { texto: string; pista: string }[] = [
  { texto: '¿Qué sabes de mí? Cuéntame lo que recuerdo y dímelo.', pista: 'la mente se abre' },
  { texto: 'Busca en internet cómo se hace una firma criptográfica en Rust y resume lo importante.', pista: 'las manos: busca y lee' },
  { texto: 'Encárgale a mi equipo que añada un modo oscuro a la página de ajustes, con sus pruebas.', pista: 'el equipo trabaja en una copia' },
]

export function Bienvenida({ onProbar }: { onProbar(texto: string): void }) {
  const muelle = useMuelle({ stiffness: 420, damping: 32 })
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={muelle}
      className="grid gap-3">
      <p className="m-0 max-w-[46ch] text-[15.5px] leading-[1.55] text-texto-2">
        Soy <span className="text-texto">Esme</span>. Vivo en tu equipo: recuerdo lo que me cuentas, actúo por ti
        (busco, leo, encargo) y mi equipo trabaja mientras tú haces otra cosa.
      </p>
      <div className="grid gap-1.5">
        {PRIMEROS_PASES.map((p) => (
          <button key={p.texto} type="button" onClick={() => onProbar(p.texto)}
            className="group grid gap-0.5 text-left text-[14px] leading-[1.45] text-texto-2 transition-colors hover:text-texto">
            <span className="flex items-baseline gap-2">
              <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-acento opacity-70" />
              <span className="underline decoration-linea-fuerte underline-offset-[3px] transition-colors group-hover:decoration-acento">{p.texto}</span>
            </span>
            <span className="pl-[18px] text-[11.5px] text-texto-3">{p.pista}</span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}
