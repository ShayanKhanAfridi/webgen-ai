import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1a1a24', color: '#f1f0f5', border: '1px solid rgba(255,255,255,0.08)' }
      }} />
    </BrowserRouter>
  </React.StrictMode>
)
