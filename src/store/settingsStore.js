import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'

// Helper to map DB row to frontend settings object
const mapDbToFrontend = (dbRow) => {
  if (!dbRow) return defaultSettings
  return {
    dark_mode: dbRow.theme_mode === 'dark',
    background_image: dbRow.bg_image_url || '',
    background_opacity: dbRow.bg_opacity ?? 0.1,
    glass_opacity: dbRow.glass_opacity ?? 0.5,
    primary_color: dbRow.primary_color || '#3b82f6',
    text_color: dbRow.text_color || '#1f2937',
    border_radius: parseInt(dbRow.border_radius) || 8,
    blur_intensity: parseInt(dbRow.blur_intensity) || 8,
  }
}

// Helper to map frontend updates to DB column format
const mapFrontendToDb = (updates) => {
  const dbUpdates = {}
  if (updates.dark_mode !== undefined) dbUpdates.theme_mode = updates.dark_mode ? 'dark' : 'light'
  if (updates.background_image !== undefined) dbUpdates.bg_image_url = updates.background_image
  if (updates.background_opacity !== undefined) dbUpdates.bg_opacity = updates.background_opacity
  if (updates.glass_opacity !== undefined) dbUpdates.glass_opacity = updates.glass_opacity
  if (updates.primary_color !== undefined) dbUpdates.primary_color = updates.primary_color
  if (updates.text_color !== undefined) dbUpdates.text_color = updates.text_color
  if (updates.border_radius !== undefined) dbUpdates.border_radius = String(updates.border_radius)
  if (updates.blur_intensity !== undefined) dbUpdates.blur_intensity = String(updates.blur_intensity)
  return dbUpdates
}

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

      // Map the DB row to frontend format (or use default if null)
      set({ 
        settings: settings ? mapDbToFrontend(settings) : defaultSettings, 
        isLoading: false 
      })
    } catch (error) {
      console.error('Error loading settings:', error)
      set({ isLoading: false })
    }
  },

  updateSettings: async (updates) => {
    const { profile } = useAuthStore.getState()
    if (!profile?.company_id) return

    // Convert frontend property names to DB column names
    const dbUpdates = mapFrontendToDb(updates)

    const { data, error } = await supabase
      .from('settings')
      .update(dbUpdates)
      .eq('company_id', profile.company_id)
      .select()
      .single()

    if (error) throw error

    // Map the returned DB row back to frontend format
    const updatedSettings = mapDbToFrontend(data)
    set({ settings: updatedSettings })
    return updatedSettings
  },
}))