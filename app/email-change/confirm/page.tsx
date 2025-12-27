'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { AuthGuard } from '@/lib/auth-guard'

function EmailChangeConfirmContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Geçersiz bağlantı.')
      return
    }

    const confirmEmailChange = async () => {
      try {
        const response = await api.get(`/email-change/confirm?token=${token}`)
        setStatus('success')
        setMessage(response.data.message || 'E-posta adresiniz başarıyla değiştirildi.')
        toast.success('E-posta adresiniz başarıyla değiştirildi.')
        
        // 3 saniye sonra ayarlar sayfasına yönlendir
        setTimeout(() => {
          router.push('/settings')
        }, 3000)
      } catch (error: any) {
        setStatus('error')
        setMessage(error.response?.data?.message || 'E-posta değişikliği onaylanırken bir hata oluştu.')
        toast.error(error.response?.data?.message || 'E-posta değişikliği onaylanırken bir hata oluştu.')
      }
    }

    confirmEmailChange()
  }, [token, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              E-posta Değişikliği Onaylanıyor
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Lütfen bekleyin...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Başarılı!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {message}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Ayarlar sayfasına yönlendiriliyorsunuz...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Hata
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {message}
            </p>
            <button
              onClick={() => router.push('/settings')}
              className="px-4 py-2 bg-brand-orange text-white rounded-lg hover:bg-brand-orange/90 transition-colors text-sm font-medium"
            >
              Ayarlara Dön
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function EmailChangeConfirmPage() {
  return (
    <AuthGuard>
      <EmailChangeConfirmContent />
    </AuthGuard>
  )
}








