// Una sola forma de escribir cifras en toda Esme. En español el CLDR no agrupa las de cuatro cifras («2346»), y la misma
// pantalla acababa diciendo «2346» y «2.346»: aquí se agrupan siempre.
export const cifra = (n: number) => n.toLocaleString('es-ES', { useGrouping: 'always' } as Intl.NumberFormatOptions)

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
/** «2026-10-12» → «12 de octubre». Lo que no sea una fecha ISO se devuelve tal cual. */
export function diaLegible(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]}` : iso
}
