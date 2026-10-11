// IAs y claves: cada proveedor con su clave, cifrada en el llavero del sistema. Las claves nunca vuelven a la interfaz.
import { useEffect, useState } from 'react'
import { bridge, type ProviderView } from '../lib/bridge'

export function SettingsPanel() {
  const [list, setList] = useState<ProviderView[]>([])
  const [status, setStatus] = useState<{ secure: boolean; backend: string } | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const refresh = () => void bridge.providers().then(setList)
  useEffect(() => { refresh(); void bridge.keys.status().then(setStatus) }, [])

  return (
    <div className="scroll" style={{ padding: 14, display: 'grid', gap: 12 }}>
      {status && !status.secure && <p style={{ color: 'var(--rose)', margin: 0, fontSize: 12.5 }}>
        Aviso: tu sistema no tiene llavero activo ({status.backend}); las claves quedarían sin cifrar de verdad. Activa gnome-keyring o kwallet.</p>}
      {bridge.mode() === 'web' && <p className="muted" style={{ margin: 0 }}>Las claves se gestionan en la app de escritorio.</p>}
      {list.map((p) => (
        <div key={p.id} style={{ display: 'grid', gap: 6 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 15 }}>{p.label}</b>
            <span className="muted">{p.local ? 'local · nada sale de tu PC' : p.hasKey ? 'clave guardada' : 'sin clave'}{p.retainsData ? ' · puede retener datos' : ''}</span>
          </div>
          {p.needsKey && (
            <div className="row">
              <input className="field" type="password" placeholder={p.hasKey ? '•••••••• (guardada)' : 'pega tu clave'} value={drafts[p.id] ?? ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))} autoComplete="off" />
              <button className="btn" disabled={!drafts[p.id]} onClick={async () => { await bridge.keys.set(p.id, drafts[p.id]); setDrafts((d) => ({ ...d, [p.id]: '' })); refresh() }}>guardar</button>
              {p.hasKey && <button className="btn ghost" onClick={async () => { await bridge.keys.remove(p.id); refresh() }}>quitar</button>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
