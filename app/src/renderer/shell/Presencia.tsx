// La presencia de Esme: el Punto (marca/PuntoVista.tsx), siempre el mismo ser con cualquier piel; la piel solo le pone
// color. Muestra en qué está Esme (tinta/estado.ts) y, por voz, lo fuerte que hablas tú o habla ella. Con la presencia
// «ninguna», no se dibuja. (Antes la piel podía cambiar el ser por un orbe o la cara de un paquete: ya no.)
import type { EstadoEsme } from '../tinta/estado'
import type { Presencia as TipoPresencia } from '../tinta/piel'
import { PuntoVista } from '../marca/PuntoVista'

export function Presencia({ tipo, estado, nivelTu, nivelElla, px = 120, tam, className }: { tipo: TipoPresencia; estado: EstadoEsme; nivelTu: number; nivelElla: number; color?: string; px?: number; tam?: string; className?: string }) {
  if (tipo === 'ninguna') return null
  return <PuntoVista px={px} tam={tam} estado={estado} nivel={estado === 'escuchando' ? nivelTu : nivelElla} titulo="Esme" className={className ?? 'text-acento'} />
}
