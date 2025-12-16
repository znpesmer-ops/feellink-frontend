'use client'

import { Fragment } from 'react'
import { X } from 'lucide-react'

interface DeleteConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
}

export function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'İlanı silmek istiyor musunuz?',
  message = 'Bu işlem geri alınamaz. İlan sistemden kalıcı olarak silinecektir.',
}: DeleteConfirmModalProps) {
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 pointer-events-auto transform transition-all duration-200 scale-100 opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Başlık */}
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mesaj */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {message}
          </p>

          {/* Butonlar */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              İptal
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-sm font-medium"
            >
              Sil
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

