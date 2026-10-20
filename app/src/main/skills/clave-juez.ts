// Las claves PÚBLICAS del juez de las skills: sirven para comprobar su veredicto, no para fabricarlo.
// La firma del veredicto cubre la huella del árbol que se juzgó y el catálogo exacto que se juzgó, así que
// estas claves son el listón de la Tienda de skills: si cambian, los veredictos viejos dejan de valer.
// La huella de la clave (16 hex del sha256 del PEM) es el `firmante` que va dentro del veredicto.
// La dev key (la que firma el kit en local) va primero; cuando la de release firme, su clave entra aquí.
export const CLAVES_JUEZ = [`-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAkePUK6fQTkQ5Il5Wwq5W0Dtf99h8j1P8eY2z7X3p1rk=
-----END PUBLIC KEY-----`]
