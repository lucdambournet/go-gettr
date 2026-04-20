import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from '@/App.tsx'
import '@/index.css'
import { applyStoredTheme } from '@/lib/applyStoredTheme'

// Apply saved theme immediately before first render so it's consistent on every page
applyStoredTheme()

const sentryDsn = import.meta.env.VITE_SENTRY_DSN

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
