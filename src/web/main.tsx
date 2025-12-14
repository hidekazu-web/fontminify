import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserCheck } from './components/BrowserCheck'
import { App } from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserCheck>
      <App />
    </BrowserCheck>
  </React.StrictMode>
)
