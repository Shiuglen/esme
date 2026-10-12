// Una sección que aún no existe: dice qué habrá aquí, sin fingir datos.
export function Proximamente({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="grid h-full place-items-center px-10">
      <div className="grid max-w-[520px] gap-3 text-center">
        <h1 className="m-0 font-display text-[34px] leading-[1.1] font-semibold tracking-[-0.03em]">{titulo}</h1>
        <p className="m-0 text-[15px] text-texto-2 text-balance">{texto}</p>
        <span className="mx-auto mt-1 inline-flex h-6 items-center rounded-full border border-linea bg-s2 px-2.5 text-xs font-medium text-texto-3">en construcción</span>
      </div>
    </div>
  )
}
