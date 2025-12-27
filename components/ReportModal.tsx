'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export enum ReportReason {
  HATE = 'HATE',
  SPAM = 'SPAM',
  HARASSMENT = 'HARASSMENT',
  OTHER = 'OTHER',
}

const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  [ReportReason.HATE]: 'Nefret / Hakaret',
  [ReportReason.SPAM]: 'Spam',
  [ReportReason.HARASSMENT]: 'Taciz',
  [ReportReason.OTHER]: 'Diğer',
}

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  contentType: 'post' | 'comment'
  contentId: string
}

export function ReportModal({ isOpen, onClose, contentType, contentId }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error('Lütfen bir rapor nedeni seçin')
      return
    }

    try {
      setSubmitting(true)
      await api.post('/reports', {
        contentType,
        contentId,
        reason: selectedReason,
        note: note.trim() || undefined,
      })

      toast.success('Raporunuz alındı. Teşekkür ederiz.')
      onClose()
      setSelectedReason(null)
      setNote('')
    } catch (error: any) {
      console.error('Report error:', error)
      toast.error(error.response?.data?.message || 'Rapor gönderilirken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Raporla
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            disabled={submitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Rapor Nedenleri */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Rapor nedeni
            </label>
            <div className="space-y-2">
              {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={value}
                    checked={selectedReason === value}
                    onChange={() => setSelectedReason(value as ReportReason)}
                    className="mr-3"
                    disabled={submitting}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Not (opsiyonel) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ek bilgi (opsiyonel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Eklemek istediğiniz bilgiler..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/30 focus:border-[#ff7b00] dark:bg-gray-800 dark:text-gray-100 resize-none"
              disabled={submitting}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedReason}
            className="flex-1 px-4 py-2 bg-[#ff7b00] hover:bg-[#e36f00] text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Gönderiliyor...' : 'Raporla'}
          </button>
        </div>
      </div>
    </div>
  )
}






