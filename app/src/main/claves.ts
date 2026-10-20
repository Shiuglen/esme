// Las claves públicas de Esme: la app no guarda ninguna privada, solo comprueba.
// - CLAVE_LICENCIA: la que firma los códigos de licencia (scripts/esme-licencias.mjs; la privada vive solo en el equipo
//   del creador). La usa la licencia y nada más: una llave que firma licencias no debe firmar la Tienda.
// - CLAVES_TIENDA: la que firma lo que se PUBLICA —el catálogo de productos, los veredictos del juez, el índice de módulos—.
//   Hoy es la dev key del kit (la que firma en local, sin red); cuando la de release firme, su clave entra aquí y la dev
//   deja de valer para publicar.
export const CLAVE_LICENCIA = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA3k4rgijL+T8EtKrRHyAwQ4VZL5zvoVsXSIyXhqFd280=
-----END PUBLIC KEY-----`

export const CLAVES_TIENDA = [`-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAkePUK6fQTkQ5Il5Wwq5W0Dtf99h8j1P8eY2z7X3p1rk=
-----END PUBLIC KEY-----`]
