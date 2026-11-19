import { createElement, lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
// Huruf bawaan Kebun Air (juga dipakai Tanah & Lumut dan angka Panel Instrumen); tema lain dimuat lewat loadThemeFonts.
import '@fontsource-variable/plus-jakarta-sans/wght.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/jetbrains-mono/latin-600.css'
import './app/styles/index.css'
import { TampilanProvider } from './shared/theme/TampilanProvider.jsx'

// /pilot → UI pilot backend (Sprint 1). Semua jalur lain → SmartDashboard Aquaponik.
const isPilot = window.location.pathname === '/pilot' || window.location.pathname.startsWith('/pilot/')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TampilanProvider>
      <Suspense fallback={<p role="status">Memuat JagoFarm…</p>}>
        {createElement(lazy(() => (isPilot ? import('./pilot/PilotApp.jsx') : import('./app/SmartApp.jsx'))))}
      </Suspense>
    </TampilanProvider>
  </StrictMode>,
)
