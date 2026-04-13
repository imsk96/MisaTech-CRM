import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import GlassCard from '../components/layout/GlassCard'
import toast from 'react-hot-toast'

export default function Signup() {
  const navigate = useNavigate()
  const { setUser, setProfile } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const newErrors = {}
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required'
    if (!formData.email) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'
    if (!formData.password) newErrors.password = 'Password is required'
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error on change
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      // Step 1: Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company_name: formData.companyName,
          },
        },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('User creation failed')

      const userId = authData.user.id

      // Step 2: Create company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({ name: formData.companyName })
        .select('id')
        .single()
      if (companyError) throw companyError
      const companyId = companyData.id

      // Step 3: Create profile (admin)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          company_id: companyId,
          email: formData.email,
          full_name: formData.fullName,
          role: 'admin',
        })
      if (profileError) throw profileError

      // Step 4: Create default settings
      const { error: settingsError } = await supabase
        .from('settings')
        .insert({
          company_id: companyId,
          dark_mode: false,
          background_opacity: 0.1,
          glass_opacity: 0.5,
          primary_color: '#3b82f6',
          text_color: '#1f2937',
          border_radius: 8,
          blur_intensity: 8,
        })
      if (settingsError) {
        console.warn('Settings creation failed but continuing:', settingsError)
        // Not critical, proceed
      }

      // Step 5: Fetch the newly created profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (fetchError) throw fetchError

      // Step 6: Update Zustand store
      setUser(authData.user)
      setProfile(profile)

      toast.success('Account created successfully! Welcome aboard.')
      navigate('/dashboard')
    } catch (error) {
      console.error('Signup error:', error)
      toast.error(error.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">Create Account</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
          Start your free CRM trial
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            error={errors.fullName}
            required
          />
          <Input
            label="Company Name"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            error={errors.companyName}
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
          />
          <Button type="submit" isLoading={loading} className="w-full">
            Sign Up
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </GlassCard>
    </div>
  )
}