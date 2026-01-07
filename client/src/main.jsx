import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Global Styles
import './index.css'
import { AuthContextProvider } from "./context/AuthContext";
import { SocketContextProvider } from "./context/SocketContext";
import { ThemeContextProvider } from './context/ThemeContext.jsx'

import { ErrorBoundary } from './components/ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <AuthContextProvider>
      <SocketContextProvider>
        <ThemeContextProvider>
          <App />
        </ThemeContextProvider>
      </SocketContextProvider>
    </AuthContextProvider>
  </ErrorBoundary>,
)
