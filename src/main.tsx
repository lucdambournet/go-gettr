import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.tsx'
import '@/index.css'
import { applyStoredTheme } from '@/lib/applyStoredTheme'

// Apply saved theme immediately before first render so it's consistent on every page
applyStoredTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)