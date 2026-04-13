import { useState } from 'react'
import { FiEdit2, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import Button from '../ui/Button'
import clsx from 'clsx'

export default function DataTable({
  columns,
  data,
  onEdit,
  onDelete,
  loading,
  emptyMessage = 'No data found',
}) {
  const [page, setPage] = useState(1)
  const rowsPerPage = 10
  const totalPages = Math.ceil(data.length / rowsPerPage)
  const paginatedData = data.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (!data.length) {
    return <div className="text-center py-8 text-gray-500">{emptyMessage}</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/20">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left text-sm font-medium">
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, idx) => (
            <tr key={row.id || idx} className="border-b border-white/10 hover:bg-white/5">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3 text-right space-x-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(row)}
                      className="p-2 rounded hover:bg-white/20"
                    >
                      <FiEdit2 />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(row.id)}
                      className="p-2 rounded hover:bg-red-500/20 text-red-500"
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/20">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <FiChevronLeft />
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <FiChevronRight />
          </Button>
        </div>
      )}
    </div>
  )
}