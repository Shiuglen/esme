// Capa de proveedores en main: catálogo models.dev, registro de uso y presupuesto, y detección de motores ACP.
import { app, BrowserWindow, ipcMain } from 'electron'
import { access, constants } from 'node:fs/promises'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { cargarCatalogo, type ProveedorCatalogo } from './catalogo/modelsdev'
import { RegistroUso, costeDe, type Consumo, type Presupuesto } from './uso/registro'
import { buscarPrecio, calcularEstado, hayAlerta, normalizarPresupuesto, resumirProveedores, PRESUPUESTO_DEFECTO, type Evaluacion } from './uso/estado'
import { detectarMotores } from './motores/acp-motores'
import { crearWhich, extsPlataforma } from './motores/which'

type Catalogo = Awaited<ReturnType<typeof cargarCatalogo>>
let catalogo: Promise<Catalogo> | null = null
let proveedores: ProveedorCatalogo[] = []
let registro: RegistroUso | null = null
let presupuesto: Presupuesto = PRESUPUESTO_DEFECTO
let archivoPresupuesto = ''
let estadoPrevio: Evaluacion['estado'] = 'ok'

const precio = (p: string, m: string) => buscarPrecio(proveedores, p, m)
const estado = () => calcularEstado(registro!, precio, presupuesto, Date.now())
const emitir = (canal: string, dato: unknown) => { for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send(canal, dato) }

function leerPresupuesto(): Presupuesto {
  try { return normalizarPresupuesto(JSON.parse(readFileSync(archivoPresupuesto, 'utf8'))) } catch { return PRESUPUESTO_DEFECTO }
}

// Anota un consumo, lo emite a las ventanas con su coste y avisa si el presupuesto empeora. Devuelve el coste en USD.
export function anotarConsumo(c: Consumo): number {
  if (!registro) return 0
  registro.anotar(c)
  const costeUSD = costeDe(c, precio(c.proveedor, c.modelo))
  emitir('uso:consumo', { ...c, costeUSD })
  const e = estado()
  if (hayAlerta(estadoPrevio, e.evaluacion.estado)) emitir('uso:alerta', e.evaluacion)
  estadoPrevio = e.evaluacion.estado
  return costeUSD
}

export function registerProveedores() {
  const userData = app.getPath('userData')
  registro = new RegistroUso(join(userData, 'uso.jsonl'))
  archivoPresupuesto = join(userData, 'presupuesto.json')
  presupuesto = leerPresupuesto()
  catalogo = cargarCatalogo({ dirCache: userData }).then((c) => { proveedores = c.proveedores; estadoPrevio = estado().evaluacion.estado; return c })
  catalogo.catch((err) => console.error('[catálogo] no cargó:', err))
  const cat = async () => (await catalogo!).proveedores

  ipcMain.handle('catalogo:proveedores', async () => resumirProveedores(await cat()))
  ipcMain.handle('catalogo:modelos', async (_e, id: string) => (await cat()).find((p) => p.id === id)?.modelos ?? [])
  ipcMain.handle('catalogo:origen', async () => { const c = await catalogo!; return { origen: c.origen, fecha: c.fecha } })
  ipcMain.handle('uso:estado', async () => { await catalogo!.catch(() => undefined); return estado() })
  ipcMain.handle('uso:resumen', async (_e, desde: number, hasta: number) => {
    await catalogo!.catch(() => undefined)
    return registro!.resumen({ desde, hasta, precio })
  })
  ipcMain.handle('uso:presupuesto', async (_e, p: unknown) => {
    presupuesto = normalizarPresupuesto(p)
    try { mkdirSync(userData, { recursive: true }); writeFileSync(archivoPresupuesto, JSON.stringify(presupuesto, null, 2)) } catch (err) { console.error('[presupuesto] no se guardó:', err) }
    await catalogo!.catch(() => undefined)
    const e = estado(); estadoPrevio = e.evaluacion.estado
    return e
  })
  ipcMain.handle('motores:detectar', () => {
    const existe = (r: string) => access(r, constants.X_OK).then(() => true, () => false)
    return detectarMotores(crearWhich(process.env.PATH, existe, { exts: extsPlataforma(process.platform, process.env.PATHEXT) }))
  })
}
