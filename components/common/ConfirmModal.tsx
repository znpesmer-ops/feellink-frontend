'use client'

import React from 'react'
import { X } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'default' | 'danger'
  showCloseButton?: boolean
}

export default function ConfirmModal({
  open,
  title = 'Emin misiniz?',
  message = 'Bu işlemi gerçekleştirmek istediğinize emin misiniz?',
  confirmText = 'Onayla',
  cancelText = 'İptal',
  onConfirm,
  onCancel,
  variant = 'default',
  showCloseButton = true,
}: ConfirmModalProps) {
  if (!open) return null

  const confirmButtonClass =
    variant === 'danger'
      ? 'px-6 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium'
      : 'px-6 py-2.5 rounded-lg bg-[#ff7a00] text-white hover:bg-[#e96d00] transition-colors font-medium'

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 backdrop-blur-sm animate-fadeIn"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-xl text-center w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {!showCloseButton && (
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {title}
          </h2>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button onClick={onConfirm} className={confirmButtonClass}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}











