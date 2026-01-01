'use client'

import React from 'react'
import { X, Loader2 } from 'lucide-react'

interface ApproveParticipantModalProps {
  open: boolean
  participantName: string
  eventTitle: string
  onConfirm: () => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function ApproveParticipantModal({
  open,
  participantName,
  eventTitle,
  onConfirm,
  onCancel,
  isLoading = false,
}: ApproveParticipantModalProps) {
  if (!open) return null

  const handleConfirm = async () => {
    try {
      await onConfirm()
    } catch (error) {
      // Hata yönetimi parent component'te yapılıyor
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 animate-fadeIn"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Katılım Talebini Onayla
          </h2>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
            <strong className="text-gray-900 dark:text-white">{participantName}</strong> adlı kullanıcıyı bu etkinliğe katılımcı olarak onaylamak üzeresiniz.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Onaylanan katılımcılara etkinlik öncesinde bilgilendirme e-postası gönderilecektir.
          </p>
        </div>

        {/* Optional Info */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 dark:text-gray-500 italic">
            Bu işlem geri alınabilir.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Vazgeç
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-[#ff7b00] text-white hover:bg-[#e96d00] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Onaylanıyor...
              </>
            ) : (
              'Onayla'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}






