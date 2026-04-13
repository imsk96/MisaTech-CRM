import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export const useAuth = () => {
  const { user, profile, login: storeLogin, logout: storeLogout, loadProfile } = useAuthStore()
  const navigate = useNavigate()

  const login = async (email, password) => {
    try {
      await storeLogin(email, password)
      toast.success('Logged in successfully')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.message)
      throw error
    }
  }

  const logout = async () => {
    await storeLogout()
    toast.success('Logged out')
    navigate('/login')
  }

  return {
    user,
    profile,
    login,
    logout,
    loadProfile,
    isAdmin: profile?.role === 'admin',
  }
}