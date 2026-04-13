import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export const useCRUD = (tableName, options = {}) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { profile } = useAuthStore()

  const fetchData = async (filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from(tableName)
        .select(options.select || '*')
        .eq('company_id', profile.company_id)

      // Apply role-based filtering for staff
      if (profile.role === 'staff') {
        query = query.or(`assigned_to.eq.${profile.id},created_by.eq.${profile.id}`)
      }

      // Apply custom filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })

      const { data: result, error: err } = await query
      if (err) throw err
      setData(result || [])
      return result
    } catch (err) {
      setError(err.message)
      toast.error(`Failed to fetch ${tableName}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const create = async (record) => {
    setLoading(true)
    try {
      const payload = {
        ...record,
        company_id: profile.company_id,
        created_by: profile.id,
      }
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      setData(prev => [result, ...prev])
      toast.success('Created successfully')
      return result
    } catch (err) {
      toast.error(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const update = async (id, updates) => {
    setLoading(true)
    try {
      const { data: result, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      setData(prev => prev.map(item => item.id === id ? result : item))
      toast.success('Updated successfully')
      return result
    } catch (err) {
      toast.error(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
      if (error) throw error
      setData(prev => prev.filter(item => item.id !== id))
      toast.success('Deleted successfully')
    } catch (err) {
      toast.error(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    data,
    loading,
    error,
    fetchData,
    create,
    update,
    remove,
  }
}