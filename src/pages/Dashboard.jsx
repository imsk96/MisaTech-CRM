import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import GlassCard from '../components/layout/GlassCard'
import { FiUsers, FiCheckSquare, FiMapPin, FiTruck, FiTarget } from 'react-icons/fi'

export default function Dashboard() {
  const [counts, setCounts] = useState({
    leads: 0,
    tasks: 0,
    visits: 0,
    dispatch: 0,
    prospects: 0,
  })
  const [loading, setLoading] = useState(true)
  const { profile } = useAuthStore()

  useEffect(() => {
    const fetchCounts = async () => {
      if (!profile?.company_id) return
      
      const tables = ['leads', 'tasks', 'visits', 'dispatch', 'prospects']
      const results = await Promise.all(
        tables.map(async (table) => {
          let query = supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
            .eq('company_id', profile.company_id)
          
          if (profile.role === 'staff') {
            query = query.or(`assigned_to.eq.${profile.id},created_by.eq.${profile.id}`)
          }
          
          const { count, error } = await query
          return error ? 0 : count
        })
      )
      
      setCounts({
        leads: results[0],
        tasks: results[1],
        visits: results[2],
        dispatch: results[3],
        prospects: results[4],
      })
      setLoading(false)
    }
    
    fetchCounts()
  }, [profile])

  const cards = [
    { title: 'Leads', count: counts.leads, icon: FiUsers, color: 'bg-blue-500' },
    { title: 'Tasks', count: counts.tasks, icon: FiCheckSquare, color: 'bg-green-500' },
    { title: 'Visits', count: counts.visits, icon: FiMapPin, color: 'bg-purple-500' },
    { title: 'Dispatch', count: counts.dispatch, icon: FiTruck, color: 'bg-orange-500' },
    { title: 'Prospects', count: counts.prospects, icon: FiTarget, color: 'bg-pink-500' },
  ]

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map(({ title, count, icon: Icon, color }) => (
          <GlassCard key={title} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-3xl font-bold">{count}</p>
              </div>
              <div className={`p-3 rounded-full ${color} bg-opacity-20`}>
                <Icon className={`text-2xl ${color.replace('bg-', 'text-')}`} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}