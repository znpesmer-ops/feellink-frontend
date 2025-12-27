'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface SettingsModalProps {
  title: string
  value: string
  onSave: (value: string) => Promise<void>
  onClose: () => void
  type?: 'text' | 'email' | 'textarea'
  placeholder?: string
}

export function SettingsModal({ 
  title, 
  value, 
  onSave, 
  onClose,
  type = 'text',
  placeholder 
}: SettingsModalProps) {
  const [input, setInput] = useState(value)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (input.trim() === '') {
      return
    }
    
    try {
      setIsSaving(true)
      // 🔒 KRİTİK: onSave başarılı olursa modal kapanır
      await onSave(input.trim())
      // ✅ Sadece başarılı olursa modal kapanır
      onClose()
    } catch (error) {
      console.error('Ayar kaydedilemedi:', error)
      // ❌ Hata durumunda modal açık kalır, kullanıcı tekrar deneyebilir
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-neutral-900 rounded-xl p-6 w-[420px] max-w-[90vw] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {type === 'textarea' ? (
          <textarea
            className="w-full rounded-md bg-neutral-800 text-white p-3 mb-4 border border-neutral-700 focus:border-[#ff7b00] focus:outline-none resize-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            rows={4}
            autoFocus
          />
        ) : (
          <input
            type={type}
            className="w-full rounded-md bg-neutral-800 text-white p-3 mb-4 border border-neutral-700 focus:border-[#ff7b00] focus:outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            autoFocus
          />
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-800 text-gray-300 hover:bg-neutral-700 transition-colors text-sm font-medium"
            disabled={isSaving}
          >
            İptal
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-[#ff7b00] text-white hover:bg-[#e36f00] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={isSaving || input.trim() === ''}
          >
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}

