'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [password, setPassword] = useState('')
  const router = useRouter()
  const { clearAuth } = useAuthStore()

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/users/account')
    },
    onSuccess: () => {
      toast.success('Hesabınız başarıyla silindi.')
      // Auth state'i temizle (logout)
      clearAuth()
      // Ana sayfaya yönlendir
      router.push('/')
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Hesap silinirken bir hata oluştu'
      toast.error(errorMessage)
    },
  })

  const handleDelete = () => {
    if (!isConfirmed) {
      toast.error('Lütfen onay kutusunu işaretleyin')
      return
    }

    deleteMutation.mutate()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // ESC ile iptal et
    if (e.key === 'Escape') {
      onClose()
    }
    // Enter ile silme (disabled)
    if (e.key === 'Enter') {
      e.preventDefault()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-[#0f172a] to-[#020617] border border-white/10 shadow-2xl p-6">
        {/* Başlık */}
        <h3 className="text-xl font-bold text-white mb-2">
          Hesabınızı Silmek Üzeresiniz
        </h3>

        {/* Açıklama */}
        <div className="space-y-3 mb-6">
          <p className="text-sm text-gray-400 leading-relaxed">
            Hesabınızı sildiğinizde:
          </p>
          <ul className="text-sm text-gray-400 space-y-2 ml-4 list-disc">
            <li>Tüm eserleriniz, temalarınız ve etkileşimleriniz kalıcı olarak silinir</li>
            <li>Bu işlem geri alınamaz</li>
            <li>Aynı e-posta ile tekrar kayıt olabilirsiniz, ancak verileriniz geri gelmez</li>
          </ul>
          <p className="text-xs text-gray-500 mt-4">
            Yasal gereklilikler kapsamında bazı kayıtlar anonimleştirilerek saklanabilir.
          </p>
        </div>

        {/* Onay Checkbox */}
        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-2 focus:ring-red-500 focus:ring-offset-0 focus:ring-offset-gray-900"
            />
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
              Hesabımı kalıcı olarak silmek istediğimi anlıyorum
            </span>
          </label>
        </div>

        {/* Butonlar */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white border border-white/10 rounded-lg hover:border-white/20 transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={handleDelete}
            disabled={!isConfirmed || deleteMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleteMutation.isPending ? 'Siliniyor...' : 'Hesabımı Sil'}
          </button>
        </div>
      </div>
    </div>
  )
}

