'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface LinkModalProps {
  isOpen: boolean
  initialUrl?: string
  onClose: () => void
  onSubmit: (url: string) => void
  title?: string
}

export default function LinkModal({
  isOpen,
  initialUrl = '',
  onClose,
  onSubmit,
  title = 'Link Ekle / Düzenle',
}: LinkModalProps) {
  const [url, setUrl] = useState(initialUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  // Modal açıldığında input'a focus ve URL'i set et
  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl)
      // Input'a focus için kısa bir delay (modal animasyonu için)
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen, initialUrl])

  // ESC tuşu ile kapatma
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Enter tuşu ile submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && url.trim()) {
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return

    // URL validation - http:// veya https:// ile başlamıyorsa ekle
    let finalUrl = trimmedUrl
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      finalUrl = `https://${trimmedUrl}`
    }

    onSubmit(finalUrl)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 shadow-2xl p-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            URL
          </label>
          <input
            ref={inputRef}
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-3 rounded-xl bg-transparent border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] transition-all"
            autoFocus
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            http:// veya https:// ile başlamıyorsa otomatik eklenir
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!url.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#ff7b00] text-white font-semibold hover:bg-[#e36f00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#ff7b00]"
          >
            {initialUrl ? 'Güncelle' : 'Ekle'}
          </button>
        </div>
      </div>
    </div>
  )
}

