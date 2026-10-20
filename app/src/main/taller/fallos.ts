// Qué fallos son de los que se van solos.
//
// Medido en las tareas reales de este equipo (la curva del Taller, 20-oct): de 46 tareas, 16 acabaron
// con error. Los motivos: «Internal error» del proveedor (7), «Authentication required» (3), «Rate
// limit» (2), «getaddrinfo ETIMEOUT» (2), modelo retirado (1) y «la sesión del motor está cerrada» (3).
//
// Con esto, lo temporal se reintenta solo y lo que necesita al creador (entrar en la cuenta) no se
// reintenta: reintentar lo que no se va a arreglar sólo hace esperar.
/** Fallos de red o del proveedor que vuelven solos: la red se cae un rato y vuelve. */
export function esTemporal(motivo: string): boolean {
  return /econnrefused|econnreset|epipe|eai_again|enotfound|eai_noname|etimedout|getaddrinfo|socket hang ?up|fetch failed|network|timeout|timed ?out|\b50[234]\b|bad gateway|gateway time-?out/i.test(motivo)
}

/** El «Internal error» del proveedor: genérico y temporal a medias. Se reintenta una vez, no más. */
export function errorDelProveedor(motivo: string): boolean {
  return /internal error/i.test(motivo)
}

/** La sesión del motor se cerró: se puede abrir otra y seguir por donde iba. */
export function sesionMuerta(motivo: string): boolean {
  return /sesión del motor está cerrada|sesion del motor esta cerrada|session (is )?closed|not connected|connection closed|sesion cerrada/i.test(motivo)
}

/** Fallos que necesitan al creador (entrar en su cuenta): reintentarlos no arregla nada. */
export function necesitaSesion(motivo: string): boolean {
  return /auth(entication|enticate)? required|authmethods|not authenticated|unauthori[sz]ed|sign in|log ?in required/i.test(motivo)
}
