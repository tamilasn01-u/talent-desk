import React, { Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('TalentAI failed to render:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <main className="app-error-screen"><div className="app-error-card"><div className="brand-mark">!</div><h1>TalentAI couldn’t load this page</h1><p>Your current page is saved in the address bar. Reload to try again.</p>{import.meta.env.DEV && <pre>{this.state.error.message}</pre>}<button onClick={() => window.location.reload()}>Reload page</button></div></main>
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(<React.StrictMode><AppErrorBoundary><App /></AppErrorBoundary></React.StrictMode>)
