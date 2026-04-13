import { useState, useEffect } from 'react'
import { useCRUD } from '../hooks/useCRUD'
import DataTable from '../components/shared/DataTable'
import DynamicForm from '../components/shared/DynamicForm'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import GlassCard from '../components/layout/GlassCard'
import { FiPlus } from 'react-icons/fi'
import { format } from 'date-fns'

export default function Visits() {
  const { data, loading, fetchData, create, update, remove } = useCRUD('visits')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVisit, setEditingVisit] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'location', label: 'Location' },
    { 
      key: 'visit_date', 
      label: 'Date',
      render: (row) => row.visit_date ? format(new Date(row.visit_date), 'MMM dd, yyyy HH:mm') : '-'
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => row.status?.name || row.status
    },
  ]

  const fields = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'visit_date', label: 'Date & Time', type: 'datetime-local' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
    { name: 'status', label: 'Status', type: 'select', dropdownType: 'status' },
  ]

  const handleSubmit = async (formData) => {
    setFormLoading(true)
    try {
      if (editingVisit) {
        await update(editingVisit.id, formData)
      } else {
        await create(formData)
      }
      setModalOpen(false)
      setEditingVisit(null)
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (visit) => {
    setEditingVisit(visit)
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
        <h1 className="text-2xl font-bold">Visits</h1>
        <Button onClick={() => {
          setEditingVisit(null)
          setModalOpen(true)
        }}>
          <FiPlus className="inline mr-2" />
          Add Visit
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
          setEditingVisit(null)
        }}
        title={editingVisit ? 'Edit Visit' : 'Add Visit'}
      >
        <DynamicForm
          fields={fields}
          initialValues={editingVisit || {}}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          loading={formLoading}
        />
      </Modal>
    </div>
  )
}