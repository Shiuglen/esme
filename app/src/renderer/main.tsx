import '@fontsource-variable/funnel-display'
import '@fontsource-variable/funnel-sans'
import '@fontsource-variable/jetbrains-mono'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/esme.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
