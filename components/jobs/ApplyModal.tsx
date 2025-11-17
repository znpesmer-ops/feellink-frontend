'use client'

import { useState } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

interface ApplyModalProps {
  jobListingId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ApplyModal({ jobListingId, open, onClose, onSuccess }: ApplyModalProps) {
  const [coverLetter, setCoverLetter] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await api.post(`/jobs/${jobListingId}/applications`, {
        coverLetter: coverLetter.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
      })
      onSuccess?.()
      onClose()
      // Reset form
      setCoverLetter('')
      setPortfolioUrl('')
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Başvuru gönderilemedi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 w-full max-w-md shadow-lg border border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">İlana Başvur</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Başvuru Mesajı <span className="text-gray-400">(opsiyonel)</span>
            </label>
            <textarea
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/30 focus:border-[#ff7b00] dark:bg-gray-900 dark:text-gray-100"
              placeholder="Kısaca kendinden ve neden başvurduğundan bahset..."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              maxLength={1000}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-400">{coverLetter.length}/1000</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Portfolyo Linki <span className="text-gray-400">(opsiyonel)</span>
            </label>
            <input
              type="url"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/30 focus:border-[#ff7b00] dark:bg-gray-900 dark:text-gray-100"
              placeholder="https://..."
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
              onClick={onClose}
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#ff7b00] text-white hover:bg-[#e96f00] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

