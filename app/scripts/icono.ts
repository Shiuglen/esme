// Genera el icono de escritorio de Esme desde la geometría real de la Señal (src/renderer/marca/senal.ts):
// papel de tinta, las cinco neuronas en tinta de luz (cada una tapa a la de detrás) y el impulso encendido en la del frente.
// Uso: npx vite-node scripts/icono.ts   → resources/esme.svg y esme.png (rasterizado con Chrome headless: ImageMagick no
// entiende máscaras ni degradados y solo pinta la línea del frente)
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { impulso, lineasSenal } from '../src/renderer/marca/senal'

const L = lineasSenal({ lineas: 5, t: 0 }), imp = impulso(0.42)
const mascaras = L.map((_, k) => `<mask id="m${k}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120"><rect x="-10" y="-10" width="120" height="120" fill="#fff"/>${
  L.slice(k + 1).map((d) => `<path d="${d.d} L${d.x1} ${d.base + 8} L${d.x0} ${d.base + 8} Z" fill="#000" stroke="#000" stroke-width="${(d.grosor * 0.6).toFixed(2)}" stroke-linejoin="round"/>`).join('')}</mask>`).join('')
const lineas = L.map((l, k) => `<path d="${l.d}" fill="none" stroke="#e8ebf0" stroke-opacity="${(0.32 + 0.68 * l.f).toFixed(2)}" stroke-width="${(l.grosor * 1.25).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"${k < L.length - 1 ? ` mask="url(#m${k})"` : ''}/>`).join('')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs>${mascaras}<radialGradient id="luz"><stop offset="0" stop-color="#5ef0d4" stop-opacity=".95"/><stop offset=".45" stop-color="#5ef0d4" stop-opacity=".35"/><stop offset="1" stop-color="#5ef0d4" stop-opacity="0"/></radialGradient>
<linearGradient id="papel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#11141b"/><stop offset="1" stop-color="#07080b"/></linearGradient></defs>
<rect x="20" y="20" width="472" height="472" rx="108" fill="url(#papel)"/>
<rect x="20.75" y="20.75" width="470.5" height="470.5" rx="107.25" fill="none" stroke="#5ef0d4" stroke-opacity=".16" stroke-width="1.5"/>
<g transform="translate(46 50) scale(4.2)">${lineas}
<circle cx="${imp.x.toFixed(2)}" cy="${imp.y.toFixed(2)}" r="7" fill="url(#luz)"/><circle cx="${imp.x.toFixed(2)}" cy="${imp.y.toFixed(2)}" r="1.7" fill="#fff"/></g>
</svg>`
writeFileSync(new URL('../resources/esme.svg', import.meta.url), svg)
const perfil = mkdtempSync(join(tmpdir(), 'esme-icono-'))
try {
  execFileSync('google-chrome', ['--headless=new', `--user-data-dir=${perfil}`, '--hide-scrollbars', '--window-size=512,512', '--default-background-color=00000000',
    `--screenshot=${resolve('resources/esme.png')}`, `file://${resolve('resources/esme.svg')}`], { stdio: 'ignore' })
} catch (e) { console.error('sin PNG:', (e as Error).message) } finally { rmSync(perfil, { recursive: true, force: true }) }
console.log('icono listo')
