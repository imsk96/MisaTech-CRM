import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useSettingsStore = create((set, get) => ({
  settings: null,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) return

      const { data: settings } = await supabase
        .from('settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .single()

      set({ settings: settings || defaultSettings, isLoading: false })
    } catch (error) {
      console.error('Error loading settings:', error)
      set({ isLoading: false })
    }
  },

  updateSettings: async (updates) => {
    const { profile } = useAuthStore.getState()
    if (!profile?.company_id) return

    const { data, error } = await supabase
      .from('settings')
      .update(updates)
      .eq('company_id', profile.company_id)
      .select()
      .single()

    if (error) throw error
    set({ settings: data })
    return data
  },
}))

const defaultSettings = {
  dark_mode: false,
  background_image: '',
  background_opacity: 0.1,
  glass_opacity: 0.5,
  primary_color: '#3b82f6',
  text_color: '#1f2937',
  border_radius: 8,
  blur_intensity: 8,
}