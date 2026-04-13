import { useState, useEffect } from 'react'
import { useSettings } from '../hooks/useSettings'
import GlassCard from '../components/layout/GlassCard'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Settings() {
  const { settings, isLoading, saveSettings, isAdmin } = useSettings()
  const [formData, setFormData] = useState({
    dark_mode: false,
    background_image: '',
    background_opacity: 0.1,
    glass_opacity: 0.5,
    primary_color: '#3b82f6',
    text_color: '#1f2937',
    border_radius: 8,
    blur_intensity: 8,
  })

  useEffect(() => {
    if (settings) {
      setFormData(settings)
    }
  }, [settings])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'range' ? parseFloat(value) : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await saveSettings(formData)
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>Only administrators can access settings.</p>
      </div>
    )
  }

  if (isLoading || !settings) {
    return <div className="text-center py-8">Loading settings...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <GlassCard className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="font-medium">Dark Mode</label>
            <input
              type="checkbox"
              name="dark_mode"
              checked={formData.dark_mode}
              onChange={handleChange}
              className="w-5 h-5"
            />
          </div>

          <Input
            label="Background Image URL"
            name="background_image"
            value={formData.background_image}
            onChange={handleChange}
            placeholder="https://example.com/image.jpg"
          />

          <div>
            <label className="block font-medium mb-2">
              Background Opacity: {formData.background_opacity}
            </label>
            <input
              type="range"
              name="background_opacity"
              min="0"
              max="1"
              step="0.05"
              value={formData.background_opacity}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              Glass Opacity: {formData.glass_opacity}
            </label>
            <input
              type="range"
              name="glass_opacity"
              min="0.1"
              max="0.9"
              step="0.05"
              value={formData.glass_opacity}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              Blur Intensity: {formData.blur_intensity}px
            </label>
            <input
              type="range"
              name="blur_intensity"
              min="0"
              max="20"
              step="1"
              value={formData.blur_intensity}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          <Input
            label="Primary Color"
            name="primary_color"
            type="color"
            value={formData.primary_color}
            onChange={handleChange}
          />

          <Input
            label="Text Color"
            name="text_color"
            type="color"
            value={formData.text_color}
            onChange={handleChange}
          />

          <div>
            <label className="block font-medium mb-2">
              Border Radius: {formData.border_radius}px
            </label>
            <input
              type="range"
              name="border_radius"
              min="0"
              max="24"
              step="1"
              value={formData.border_radius}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          <Button type="submit">Save Settings</Button>
        </form>
      </GlassCard>
    </div>
  )
}