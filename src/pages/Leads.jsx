import { useState, useEffect } from 'react'
import { useCRUD } from '../hooks/useCRUD'
import DataTable from '../components/shared/DataTable'
import DynamicForm from '../components/shared/DynamicForm'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import GlassCard from '../components/layout/GlassCard'
import { FiPlus } from 'react-icons/fi'

export default function Leads() {
  const { data, loading, fetchData, create, update, remove } = useCRUD('leads')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => row.status?.name || row.status
    },
    { 
      key: 'source', 
      label: 'Source',
      render: (row) => row.source?.name || row.source
    },
  ]

  const fields = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'status', label: 'Status', type: 'select', dropdownType: 'status' },
    { name: 'source', label: 'Source', type: 'select', dropdownType: 'source' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ]

  const handleSubmit = async (formData) => {
    setFormLoading(true)
    try {
      if (editingLead) {
        await update(editingLead.id, formData)
      } else {
        await create(formData)
      }
      setModalOpen(false)
      setEditingLead(null)
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (lead) => {
    setEditingLead(lead)
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
        <h1 className="text-2xl font-bold">Leads</h1>
        <Button onClick={() => {
          setEditingLead(null)
          setModalOpen(true)
        }}>
          <FiPlus className="inline mr-2" />
          Add Lead
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
          setEditingLead(null)
        }}
        title={editingLead ? 'Edit Lead' : 'Add Lead'}
      >
        <DynamicForm
          fields={fields}
          initialValues={editingLead || {}}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          loading={formLoading}
        />
      </Modal>
    </div>
  )
}