'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'

export default function LogoutPage() {
  const router = useRouter()
  const { clearAuth, refreshToken } = useAuthStore()

  useEffect(() => {
    const performLogout = async () => {
      try {
        if (refreshToken) {
          await api.post('/auth/logout', { refreshToken })
        }
      } catch (error) {
        console.warn('Logout error:', error)
      } finally {
        clearAuth()
        router.push('/login')
      }
    }

    performLogout()
  }, [router, refreshToken, clearAuth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Çıkış yapılıyor...</p>
      </div>
    </div>
  )
}



