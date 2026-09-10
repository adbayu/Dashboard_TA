import { createElement, lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<p role="status">Memuat JagoFarm…</p>}>
      {createElement(lazy(() => window.location.pathname === '/demo' || window.location.pathname.startsWith('/demo/') ? import('./App.jsx') : import('./PilotApp.jsx')))}
    </Suspense>
  </StrictMode>,
)
