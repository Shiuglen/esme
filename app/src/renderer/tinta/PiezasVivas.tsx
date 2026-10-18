// Cómo se dibuja cada pieza (tinta/piezas.ts dice qué huecos y variantes hay). Los efectos vienen de React Bits,
// revisados a mano en ui/efectos; todos toman el color del acento de la piel, así cualquier pieza combina con cualquier piel.
import type { ReactNode } from 'react'
import BlurText from '../ui/efectos/BlurText'
import ClickSpark from '../ui/efectos/ClickSpark'
import DecryptedText from '../ui/efectos/DecryptedText'
import ElectricBorder from '../ui/efectos/ElectricBorder'
import GlitchText from '../ui/efectos/GlitchText'
import GradientText from '../ui/efectos/GradientText'
import ShinyText from '../ui/efectos/ShinyText'
import StarBorder from '../ui/efectos/StarBorder'
import type { Piezas } from './piezas'

const acento = () => getComputedStyle(document.documentElement).getPropertyValue('--acento').trim() || '#7df9ff'
const texto = () => getComputedStyle(document.documentElement).getPropertyValue('--texto').trim() || '#ffffff'

/** El saludo de la portada (y cualquier titular que quiera presentarse con la pieza elegida). */
export function Saludo({ texto: t, pieza }: { texto: string; pieza: Piezas['saludo'] }) {
  switch (pieza) {
    case 'enfoque': return <BlurText key={t} text={t} animateBy="letters" delay={45} direction="bottom" className="justify-center" />
    case 'descifrar': return <DecryptedText key={t} text={t} animateOn="view" sequential speed={40} revealDirection="start" encryptedClassName="text-acento" />
    case 'brillo': return <ShinyText text={t} color={texto()} shineColor={acento()} speed={3} />
    case 'degradado': return <GradientText colors={[acento(), texto(), acento()]} animationSpeed={6}>{t}</GradientText>
    case 'glitch': return <GlitchText speed={0.6} enableShadows color={texto()} intensity={0.3} offset={2} fontSize="1em" className="!font-[inherit]">{t}</GlitchText>
    default: return <>{t}</>
  }
}

/** Lo que pasa al pulsar en cualquier parte de Esme. */
export function AlPulsar({ pieza, children }: { pieza: Piezas['pulsar']; children: ReactNode }) {
  if (pieza !== 'chispas') return <>{children}</>
  return <ClickSpark sparkColor={acento()} sparkCount={9} sparkRadius={22} sparkSize={9} duration={420} className="h-full">{children}</ClickSpark>
}

/** El borde de lo que está trabajando (el compositor mientras Esme responde). */
export function BordeTrabajo({ pieza, activo, radio = 24, children }: { pieza: Piezas['trabajo']; activo: boolean; radio?: number; children: ReactNode }) {
  if (!activo || pieza === 'nada') return <>{children}</>
  if (pieza === 'electrico') return <ElectricBorder color={acento()} speed={1} chaos={0.4} borderRadius={radio}>{children}</ElectricBorder>
  if (pieza === 'estrella') return <StarBorder as="div" color={acento()} radius={radio} duration={4} backgroundColor="transparent" textColor="inherit" borderColor="transparent" className="block !p-0">{children}</StarBorder>
  return <div className="rounded-[24px] animate-[pulso-trabajo_1.8s_ease-in-out_infinite]" style={{ borderRadius: radio }}>{children}</div>
}
