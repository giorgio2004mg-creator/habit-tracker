import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { DataRoot } from './state/auth'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataRoot>
      <App />
    </DataRoot>
  </StrictMode>,
)

// Solo in produzione: in sviluppo la cache nasconderebbe le modifiche
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.error('Service worker non registrato', err))
  })
}
