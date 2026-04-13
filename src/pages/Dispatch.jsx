import { useState, useEffect } from 'react'
import { useCRUD } from '../hooks/useCRUD'
import DataTable from '../components/shared/DataTable'
import DynamicForm from '../components/shared/DynamicForm'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import GlassCard from '../components/layout/GlassCard'
import { FiPlus } from 'react-icons/fi'
import { format } from 'date-fns'

export default function Dispatch() {
  const { data, loading, fetchData, create, update, remove } = useCRUD('dispatch')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'driver', label: 'Driver' },
    { 
      key: 'dispatch_date', 
      label: 'Date',
      render: (row) => row.dispatch_date ? format(new Date(row.dispatch_date), 'MMM dd, yyyy') : '-'
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => row.status?.name || row.status
    },
  ]

  const fields = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'driver', label: 'Driver', type: 'text' },
    { name: 'dispatch_date', label: 'Date', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
    { name: 'status', label: 'Status', type: 'select', dropdownType: 'status' },
  ]

  const handleSubmit = async (formData) => {
    setFormLoading(true)
    try {
      if (editingItem) {
        await update(editingItem.id, formData)
      } else {
        await create(formData)
      }
      setModalOpen(false)
      setEditingItem(null)
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      await remove(id)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dispatch</h1>
        <Button onClick={() => {
          setEditingItem(null)
          setModalOpen(true)
        }}>
          <FiPlus className="inline mr-2" />
          Add Dispatch
        </Button>
      </div>

      <GlassCard>
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </GlassCard>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingItem(null)
        }}
        title={editingItem ? 'Edit Dispatch' : 'Add Dispatch'}
      >
        <DynamicForm
          fields={fields}
          initialValues={editingItem || {}}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          loading={formLoading}
        />
      </Modal>
    </div>
  )
}