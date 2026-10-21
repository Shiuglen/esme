// Los agentes de la Tienda: lo que la gente publica para que tu equipo trabaje con ellos.
//
// Un agente es un producto como una piel, pero en vez de vestirse se USA: dice cómo se lanza (el comando), con qué
// herramientas cuenta y para qué sirve. Viene en el catálogo firmado, así que no es un comando suelto que alguien
// te cuela: viene con la firma de Esme y con su versión.
//
// El contenido es DATOS, nunca código: el comando es una plantilla con {carpeta} y {tarea} que se rellenan al
// instalar. La app no ejecuta nada sin que tú lo pidas.
export type AgenteTienda = {
  id: string
  nombre: string
  autor: string
  descripcion: string
  etiquetas: string[]
  version: number
  /** El comando con el que se lanza. {carpeta} = la copia aislada, {tarea} = lo que hay que hacer. */
  comando: string
  /** Las herramientas que necesita (MCP, ejecutables…). Si faltan, la Tienda lo dice antes de instalar. */
  herramientas?: string[]
  /** Un ejemplo de lo que sabe hacer: lo que se lee en la ficha. */
  ejemplo?: string
}

export const AGENTES_TIENDA: AgenteTienda[] = [
  {
    id: 'opencode',
    nombre: 'OpenCode',
    autor: 'SST',
    descripcion: 'El agente de terminal que lee el repo, edita ficheros y corre pruebas. El más versátil para construir.',
    etiquetas: ['código', 'terminal', 'general'],
    version: 1,
    comando: 'opencode -p "{tarea}"',
    herramientas: ['node', 'git'],
    ejemplo: '«Arregla el test que falla y deja la suite en verde»',
  },
  {
    id: 'claude-code',
    nombre: 'Claude Code',
    autor: 'Anthropic',
    descripcion: 'El agente de Anthropic para la terminal: lee, edita y explica. Fuerte con refactors grandes.',
    etiquetas: ['código', 'terminal', 'refactor'],
    version: 1,
    comando: 'claude -p "{tarea}"',
    herramientas: ['node', 'git'],
    ejemplo: '«Mueve este módulo a la arquitectura nueva y deja los tests»',
  },
  {
    id: 'codex',
    nombre: 'Codex',
    autor: 'OpenAI',
    descripcion: 'El agente de OpenAI para la terminal. Preciso con los cambios mecánicos y con el formato.',
    etiquetas: ['código', 'terminal', 'mecánico'],
    version: 1,
    comando: 'codex exec "{tarea}"',
    herramientas: ['node', 'git'],
    ejemplo: '«Renombra estas funciones y actualiza las llamadas»',
  },
  {
    id: 'gemini-cli',
    nombre: 'Gemini CLI',
    autor: 'Google',
    descripcion: 'El agente de Google para la terminal. Contexto enorme: bueno para leer repos enteros.',
    etiquetas: ['código', 'terminal', 'contexto'],
    version: 1,
    comando: 'gemini -p "{tarea}"',
    herramientas: ['node', 'git'],
    ejemplo: '«Explora este repo y dime dónde vive la lógica de permisos»',
  },
  {
    id: 'qwen-code',
    nombre: 'Qwen Code',
    autor: 'Alibaba',
    descripcion: 'El agente de Alibaba para la terminal. Multi-modelo: puede razonar o apurar.',
    etiquetas: ['código', 'terminal', 'multimodelo'],
    version: 1,
    comando: 'qwen -p "{tarea}"',
    herramientas: ['node', 'git'],
    ejemplo: '«Escribe los tests que le faltan a este módulo»',
  },
  {
    id: 'esme-cerebro',
    nombre: 'El Cerebro',
    autor: 'Esme',
    descripcion: 'No es un agente de código: es la memoria. Conoce lo que happened y sabe lo que tú no dijiste.',
    etiquetas: ['memoria', 'contexto'],
    version: 1,
    comando: 'esme cerebro "{tarea}"',
    herramientas: [],
    ejemplo: '«¿Qué decidimos la semana pasada sobre la Tienda?»',
  },
]
