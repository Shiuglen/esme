// Una sola forma de escribir cifras en toda Esme. En español el CLDR no agrupa las de cuatro cifras («2346»), y la misma
// pantalla acababa diciendo «2346» y «2.346»: aquí se agrupan siempre.
export const cifra = (n: number) => n.toLocaleString('es-ES', { useGrouping: 'always' } as Intl.NumberFormatOptions)
