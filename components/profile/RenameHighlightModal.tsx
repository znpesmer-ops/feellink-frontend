'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface RenameHighlightModalProps {
  highlight: {
    id: string
    title: string
  }
  onClose: () => void
}

export function RenameHighlightModal({ highlight, onClose }: RenameHighlightModalProps) {
  const [name, setName] = useState(highlight.title)
  const queryClient = useQueryClient()

  const renameMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      return (await api.patch(`/highlights/${highlight.id}`, { title: newTitle })).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights'] })
      toast.success('Tema adı güncellendi')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Tema adı güncellenirken bir hata oluştu')
    },
  })

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Tema adı boş olamaz')
      return
    }
    renameMutation.mutate(name.trim())
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#0d0d10] dark:bg-gray-900 p-6 rounded-xl w-[350px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-white text-xl font-semibold mb-4">Tema Adını Düzenle</h2>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave()
            }
          }}
          className="w-full px-3 py-2 bg-black/20 dark:bg-gray-800 border border-gray-700 dark:border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-brand-orange transition-colors"
          placeholder="Tema adı"
          autoFocus
        />

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-700 dark:bg-gray-800 text-white hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={renameMutation.isPending || !name.trim()}
            className="px-4 py-2 rounded-lg bg-brand-orange text-black font-semibold hover:bg-[#e67a00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {renameMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}

