import { useState, useEffect } from 'react'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

export default function DynamicForm({
  fields,
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  loading,
}) {
  const [formData, setFormData] = useState(initialValues)
  const [dropdownOptions, setDropdownOptions] = useState({})
  const { profile } = useAuthStore()

  useEffect(() => {
    // Fetch dropdown options for fields that use dropdown_master
    fields.forEach(async (field) => {
      if (field.type === 'select' && field.dropdownType) {
        const { data } = await supabase
          .from('dropdown_master')
          .select('*')
          .eq('type', field.dropdownType)
          .eq('company_id', profile.company_id)
        setDropdownOptions(prev => ({
          ...prev,
          [field.name]: data || []
        }))
      }
    })
  }, [fields, profile.company_id])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const renderField = (field) => {
    const value = formData[field.name] || ''
    
    switch (field.type) {
      case 'select':
        const options = dropdownOptions[field.name] || field.options || []
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium mb-1">{field.label}</label>
            <select
              name={field.name}
              value={value}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm"
              required={field.required}
            >
              <option value="">Select {field.label}</option>
              {options.map(opt => (
                <option key={opt.id || opt.value} value={opt.value || opt.id}>
                  {opt.label || opt.name}
                </option>
              ))}
            </select>
          </div>
        )
      case 'textarea':
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium mb-1">{field.label}</label>
            <textarea
              name={field.name}
              value={value}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm"
              rows={field.rows || 3}
              required={field.required}
            />
          </div>
        )
      case 'checkbox':
        return (
          <div key={field.name} className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name={field.name}
                checked={value}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm">{field.label}</span>
            </label>
          </div>
        )
      default:
        return (
          <Input
            key={field.name}
            label={field.label}
            name={field.name}
            type={field.type || 'text'}
            value={value}
            onChange={handleChange}
            required={field.required}
          />
        )
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {fields.map(renderField)}
      <div className="flex justify-end gap-3 mt-6">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}