import { NavLink } from 'react-router-dom'
import { 
  FiGrid, 
  FiUsers, 
  FiCheckSquare, 
  FiMapPin, 
  FiTruck, 
  FiTarget, 
  FiSettings,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi'
import { useState } from 'react'
import clsx from 'clsx'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: FiGrid },
  { path: '/leads', label: 'Leads', icon: FiUsers },
  { path: '/tasks', label: 'Tasks', icon: FiCheckSquare },
  { path: '/visits', label: 'Visits', icon: FiMapPin },
  { path: '/dispatch', label: 'Dispatch', icon: FiTruck },
  { path: '/prospects', label: 'Prospects', icon: FiTarget },
  { path: '/settings', label: 'Settings', icon: FiSettings },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside 
      className={clsx(
        "glass-card h-screen sticky top-0 transition-all duration-300 flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-white/20">
        {!collapsed && <h1 className="text-xl font-bold text-primary">MisaTech CRM</h1>}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-full hover:bg-white/20"
        >
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
      </div>
      <nav className="flex-1 py-4">
        <ul className="space-y-2 px-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                className={({ isActive }) => clsx(
                  "flex items-center px-4 py-3 rounded-lg transition-colors",
                  isActive 
                    ? "bg-primary text-white" 
                    : "hover:bg-white/20 text-current"
                )}
              >
                <Icon className="text-xl flex-shrink-0" />
                {!collapsed && <span className="ml-3">{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}