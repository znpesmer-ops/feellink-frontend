'use client'

import React from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface DeleteModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  user: {
    id: string
    username: string
    email?: string
  } | null
  title?: string
  message?: string
}

export default function DeleteModal({
  open,
  onClose,
  onConfirm,
  user,
  title = 'Kullanıcıyı Sil',
  message,
}: DeleteModalProps) {
  if (!open) return null

  const handleConfirm = () => {
    onConfirm()
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl w-[420px] max-w-[90vw] animate-modalSlide">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {message ? (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {message}
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                <span className="font-medium text-[#ff7b00] dark:text-[#ff9500]">
                  {user?.username}
                </span>
                {user?.email && (
                  <>
                    {' '}
                    <span className="text-gray-400">({user.email})</span>
                  </>
                )}{' '}
                adlı kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz?
              </p>
              <p className="text-xs text-red-500 dark:text-red-400 font-medium mb-1">
                ⚠️ Bu işlem geri alınamaz!
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Kullanıcının tüm gönderileri, yorumları ve verileri silinecektir.
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white transition-colors font-medium shadow-sm"
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  )
}








