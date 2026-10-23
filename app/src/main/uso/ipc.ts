// La puerta de la presión en la ventana: mirar a la casa y, si algo se desboca, soltarlo.
// El que decide se queda en el proceso principal: la ventana sólo manda un pid.
import { ipcMain } from 'electron'
import { explicar, medirPresion, pararProceso, type Presion } from './presion'

export type PresionVentana = Presion & { texto: string }

export function registerUso(): void {
  ipcMain.handle('uso:presion', (_e): PresionVentana => {
    const p = medirPresion()
    return { ...p, texto: explicar(p) }
  })
  ipcMain.handle('uso:parar', (_e, pid: unknown) =>
    (typeof pid === 'number' && Number.isInteger(pid) && pid > 0 && pid < 2 ** 22 ? pararProceso(pid) : Promise.resolve({ ok: false as const, error: 'Ese pid no vale.' })))
}
