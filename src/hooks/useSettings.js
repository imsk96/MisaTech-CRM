import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export const useSettings = () => {
  const { settings, loadSettings, updateSettings, isLoading } = useSettingsStore()
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'

  const saveSettings = async (updates) => {
    try {
      await updateSettings(updates)
      toast.success('Settings saved')
    } catch (error) {
      toast.error('Failed to save settings')
      throw error
    }
  }

  return {
    settings,
    isLoading,
    loadSettings,
    saveSettings,
    isAdmin,
  }
}