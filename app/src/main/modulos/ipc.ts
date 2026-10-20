// Los canales de los módulos: la puerta de los módulos en la ventana.
//
// Cuatro tiempos, y en este orden: lo que hay instalado, lo que se instala
// (verificando la firma), lo que la persona concede y lo que se activa. El
// permiso es de la persona: sin ese momento, la puerta no tiene dueño.
import { ipcMain } from 'electron'
import type { BrainInfo } from '../brain-process'
import { ClienteCerebro } from '../mente/cliente'
import { ponCerebro, runtimeModulos } from './runtime'
import { disponibles, type ResultadoDisponibles } from './tienda'

export type VistaModulo = {
  id: string
  version: string
  estado: 'instalado' | 'activo' | 'error'
  error?: string
  declaradas: string[]
  concedidas: string[]
  pendientes: string[]
  usadas: string[]
}

export type ResultadoModulos =
  | { ok: true; modulos: VistaModulo[] }
  | { ok: false; error: string }

const mensaje = (e: unknown): string => (e instanceof Error ? e.message : String(e))

/** Lo que la ventana ve de un módulo: lo declarado, lo concedido y lo usado. */
const vista = (m: {
  id: string
  version: string
  estado: 'instalado' | 'activo' | 'error'
  error?: string
  permisos: { declaradas: string[]; concedidas: string[]; pendientes: string[] }
  usadas: string[]
}): VistaModulo => ({
  id: m.id,
  version: m.version,
  estado: m.estado,
  error: m.error,
  declaradas: m.permisos.declaradas,
  concedidas: m.permisos.concedidas,
  pendientes: m.permisos.pendientes,
  usadas: m.usadas,
})

export const registerModulos = (o: { brainInfo: () => BrainInfo | null }): void => {
  const cerebro = (): void => {
    const i = o.brainInfo()
    ponCerebro(i ? new ClienteCerebro(i) : null)
  }

  ipcMain.handle('modulos:disponibles', async (): Promise<ResultadoDisponibles> => disponibles())

  ipcMain.handle('modulos:lista', async (): Promise<ResultadoModulos> => {    try {
      const r = runtimeModulos()
      await r.carga()
      return { ok: true, modulos: r.lista().map(vista) }
    } catch (e) {
      return { ok: false, error: mensaje(e) }
    }
  })

  ipcMain.handle('modulos:instala', async (_e, id: unknown): Promise<{ ok: true; modulo: VistaModulo } | { ok: false; error: string }> => {
    const modulo = String(id ?? '')
    if (!modulo) return { ok: false, error: 'no me dijiste qué módulo instalar' }
    try {
      const r = runtimeModulos()
      const m = await r.instala(modulo)
      return { ok: true, modulo: vista(m) }
    } catch (e) {
      return { ok: false, error: mensaje(e) }
    }
  })

  ipcMain.handle('modulos:concede', async (_e, id: unknown, capacidades: unknown): Promise<{ ok: true; modulos: VistaModulo[] } | { ok: false; error: string }> => {
    const modulo = String(id ?? '')
    const caps = Array.isArray(capacidades) ? capacidades.map(String) : []
    if (!modulo) return { ok: false, error: 'no me dijiste qué módulo' }
    try {
      const r = runtimeModulos()
      r.concede(modulo, caps, 'la persona')
      return { ok: true, modulos: r.lista().map(vista) }
    } catch (e) {
      return { ok: false, error: mensaje(e) }
    }
  })

  ipcMain.handle('modulos:revoca', async (_e, id: unknown, capacidades: unknown): Promise<{ ok: true; modulos: VistaModulo[] } | { ok: false; error: string }> => {
    const modulo = String(id ?? '')
    const caps = Array.isArray(capacidades) ? capacidades.map(String) : []
    if (!modulo) return { ok: false, error: 'no me dijiste qué módulo' }
    try {
      const r = runtimeModulos()
      r.revoca(modulo, caps)
      return { ok: true, modulos: r.lista().map(vista) }
    } catch (e) {
      return { ok: false, error: mensaje(e) }
    }
  })

  ipcMain.handle('modulos:activa', async (_e, id: unknown): Promise<{ ok: true; modulos: VistaModulo[] } | { ok: false; error: string }> => {
    const modulo = String(id ?? '')
    if (!modulo) return { ok: false, error: 'no me dijiste qué módulo' }
    try {
      cerebro()
      const r = runtimeModulos()
      await r.carga()
      await r.activa(modulo)
      return { ok: true, modulos: r.lista().map(vista) }
    } catch (e) {
      return { ok: false, error: mensaje(e) }
    }
  })

  ipcMain.handle('modulos:desactiva', async (_e, id: unknown): Promise<{ ok: true; modulos: VistaModulo[] } | { ok: false; error: string }> => {
    const modulo = String(id ?? '')
    if (!modulo) return { ok: false, error: 'no me dijiste qué módulo' }
    try {
      const r = runtimeModulos()
      await r.desactiva(modulo)
      return { ok: true, modulos: r.lista().map(vista) }
    } catch (e) {
      return { ok: false, error: mensaje(e) }
    }
  })
}
