import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/src/styles/tokens.css'
import '@/src/styles/global.css'
import App from '@/src/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
