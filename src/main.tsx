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
