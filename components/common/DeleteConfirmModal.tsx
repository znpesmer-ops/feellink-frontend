"use client"
import React from "react"
import { X } from "lucide-react"

interface DeleteConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
}

export default function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Silmek Üzeresiniz",
  message = "Bu işlemi geri alamazsınız. Emin misiniz?",
  confirmText = "Sil",
  cancelText = "İptal",
}: DeleteConfirmModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[9999] animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0d0e10] border border-gray-200 dark:border-white/10 shadow-xl rounded-xl p-6 w-[90%] max-w-[420px] animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors font-medium"
          >
            {cancelText}
          </button>

          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="px-4 py-2 rounded-lg bg-[#ff7b00] hover:bg-[#e36f00] transition-colors text-white font-medium"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}




