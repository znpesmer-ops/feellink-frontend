'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface DeleteHighlightModalProps {
  highlight: {
    id: string
    title: string
  }
  onClose: () => void
  onDelete: (id: string) => void
}

export function DeleteHighlightModal({ highlight, onClose, onDelete }: DeleteHighlightModalProps) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await api.delete(`/highlights/${highlight.id}`)
        // Boş response veya null durumunda güvenli fallback
        return response?.data || { success: true }
      } catch (error: any) {
        // JSON parse hatası durumunda
        if (error.message?.includes('JSON') || error.message?.includes('Unexpected')) {
          // Backend başarıyla sildi ama boş response döndü
          return { success: true }
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights'] })
      toast.success('Tema başarıyla silindi')
      onDelete(highlight.id)
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Tema silinirken bir hata oluştu')
    },
  })

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0d0d10] dark:bg-gray-900 p-6 rounded-xl w-[350px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl text-white font-semibold mb-4">Temayı Sil</h2>

        <p className="text-gray-300 dark:text-gray-400 mb-6 leading-relaxed">
          <span className="text-brand-orange font-semibold">{highlight.title}</span> temasını silmek
          istediğinizden emin misiniz? Eserler silinmeyecek, sadece tema kaldırılacaktır.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 rounded-lg bg-gray-700 dark:bg-gray-800 text-white hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            İptal
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
          </button>
        </div>
      </div>
    </div>
  )
}

