import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { useSettingsStore } from './store/settingsStore'
import { useEffect } from 'react'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Tasks from './pages/Tasks'
import Visits from './pages/Visits'
import Dispatch from './pages/Dispatch'
import Prospects from './pages/Prospects'
import Settings from './pages/Settings'
import Layout from './components/layout'

function App() {
  const { user, loadProfile } = useAuthStore()
  const { settings, loadSettings } = useSettingsStore()

  useEffect(() => {
    loadProfile()
    loadSettings()
  }, [])

  useEffect(() => {
    if (settings) {
      const root = document.documentElement
      root.style.setProperty('--primary', settings.primary_color || '#3b82f6')
      root.style.setProperty('--text', settings.text_color || '#1f2937')
      root.style.setProperty('--bg-image', settings.background_image ? `url(${settings.background_image})` : 'none')
      root.style.setProperty('--bg-opacity', settings.background_opacity || '0.1')
      root.style.setProperty('--glass-opacity', settings.glass_opacity || '0.5')
      root.style.setProperty('--blur', `${settings.blur_intensity || 8}px`)
      root.style.setProperty('--radius', `${settings.border_radius || 8}px`)
      if (settings.dark_mode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [settings])

  if (!user) {
    return (
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    )
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/visits" element={<Visits />} />
          <Route path="/dispatch" element={<Dispatch />} />
          <Route path="/prospects" element={<Prospects />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
      <Toaster position="top-right" />
    </Router>
  )
}

export default App