import { useAuth } from '../../hooks/useAuth'
import { FiLogOut, FiUser } from 'react-icons/fi'

export default function Navbar() {
  const { profile, logout } = useAuth()

  return (
    <header className="glass-card sticky top-0 z-10 px-6 py-3 flex justify-between items-center">
      <div className="text-lg font-semibold">
        Welcome, {profile?.full_name || profile?.email}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FiUser />
          <span className="capitalize">{profile?.role}</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/20 transition"
        >
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </header>
  )
}