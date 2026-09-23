import { createElement, lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// /pilot → UI pilot backend (Sprint 1). Semua jalur lain → SmartDashboard Aquaponik.
const isPilot = window.location.pathname === '/pilot' || window.location.pathname.startsWith('/pilot/')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<p role="status">Memuat JagoFarm…</p>}>
      {createElement(lazy(() => (isPilot ? import('./PilotApp.jsx') : import('./SmartApp.jsx'))))}
    </Suspense>
  </StrictMode>,
)
