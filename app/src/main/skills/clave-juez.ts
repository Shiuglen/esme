// La clave PÚBLICA del juez de las skills: sirve para comprobar su veredicto, no para fabricarlo.
// La firma del veredicto cubre la huella del árbol que se juzgó, así que esta clave es el
// listón de la Tienda de skills: si cambia, los veredictos viejos dejan de valer.
// La huella de la clave (16 hex del sha256 del PEM) es el `firmante` que va dentro del veredicto.
export const CLAVE_JUEZ = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAkePUK6fQTkQ5Il5Wwq5W0Dtf99h8j1P8eY2z7X3p1rk=
-----END PUBLIC KEY-----`
