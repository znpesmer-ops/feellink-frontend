'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { containsBadWord } from '@/lib/utils/containsBadWord'

interface EditPostModalProps {
  post: {
    id: string
    caption?: string | null
  }
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function EditPostModal({ post, open, onClose, onSuccess }: EditPostModalProps) {
  const [caption, setCaption] = useState(post.caption || '')
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  // Reset form when post changes
  useEffect(() => {
    if (open && post) {
      setCaption(post.caption || '')
    }
  }, [open, post])

  // Küfür kontrolü
  const hasBadWord = containsBadWord(caption)

  const handleSave = async () => {
    if (!post.id) return

    if (hasBadWord) {
      toast.error('Bu içerik Feellink topluluk kurallarına uygun değil.')
      return
    }

    try {
      setSaving(true)
      await api.patch(`/posts/${post.id}`, {
        caption: caption.trim() || null,
      })

      toast.success('Gönderi başarıyla güncellendi')
      
      // Sadece ilgili query'leri invalidate et (profil query'sine dokunma - redirect'i engelle)
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      // Profil query'sini invalidate etme - kullanıcı profil sayfasında kalmalı

      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Update error:', error)
      toast.error(error.response?.data?.message || 'Gönderi güncellenirken bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

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
            Gönderiyi Düzenle
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            disabled={saving}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Açıklama */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Açıklama
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Açıklama"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/30 focus:border-[#ff7b00] dark:bg-gray-800 dark:text-gray-100 resize-none"
              disabled={saving}
            />
            {hasBadWord && (
              <p className="text-xs text-orange-500 mt-1">
                Bu içerik Feellink topluluk kurallarına uygun değil.
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving || hasBadWord}
            className="flex-1 px-4 py-2 bg-[#ff7b00] hover:bg-[#e36f00] text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              'Kaydet'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

