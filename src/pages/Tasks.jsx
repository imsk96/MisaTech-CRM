import { useState, useEffect } from 'react'
import { useCRUD } from '../hooks/useCRUD'
import DataTable from '../components/shared/DataTable'
import DynamicForm from '../components/shared/DynamicForm'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import GlassCard from '../components/layout/GlassCard'
import { FiPlus } from 'react-icons/fi'
import { format } from 'date-fns'

export default function Tasks() {
  const { data, loading, fetchData, create, update, remove } = useCRUD('tasks')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const columns = [
    { key: 'title', label: 'Title' },
    { 
      key: 'due_date', 
      label: 'Due Date',
      render: (row) => row.due_date ? format(new Date(row.due_date), 'MMM dd, yyyy') : '-'
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => row.status?.name || row.status
    },
    { key: 'priority', label: 'Priority' },
  ]

  const fields = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'due_date', label: 'Due Date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', dropdownType: 'status' },
    { 
      name: 'priority', 
      label: 'Priority', 
      type: 'select', 
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ]
    },
    { name: 'assigned_to', label: 'Assigned To', type: 'text' }, // Would be select from profiles in real app
  ]

  const handleSubmit = async (formData) => {
    setFormLoading(true)
    try {
      if (editingTask) {
        await update(editingTask.id, formData)
      } else {
        await create(formData)
      }
      setModalOpen(false)
      setEditingTask(null)
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (task) => {
    setEditingTask(task)
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
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Button onClick={() => {
          setEditingTask(null)
          setModalOpen(true)
        }}>
          <FiPlus className="inline mr-2" />
          Add Task
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
          setEditingTask(null)
        }}
        title={editingTask ? 'Edit Task' : 'Add Task'}
      >
        <DynamicForm
          fields={fields}
          initialValues={editingTask || {}}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          loading={formLoading}
        />
      </Modal>
    </div>
  )
}