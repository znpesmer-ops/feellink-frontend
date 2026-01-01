'use client'

import { useQuery } from '@tanstack/react-query'
import { Lock, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'

/**
 * 🔒 Hesap Askıya Alma Banner'ı
 * 
 * Askıya alınan kullanıcılar için header'ın altında görünen banner.
 * İzole component - mevcut sistemi bozmaz.
 */
interface AccountSuspendedBannerProps {
  onVisibilityChange?: (visible: boolean) => void
}

export function AccountSuspendedBanner({ onVisibilityChange }: AccountSuspendedBannerProps = {}) {
  const { user } = useAuthStore()
  const [dismissed, setDismissed] = useState(false)

  // ✅ Kullanıcı bilgilerini çek (accountStatus için)
  const { data: userData } = useQuery({
    queryKey: ['user-me'],
    queryFn: async () => {
      const response = await api.get('/users/me')
      return response.data
    },
    enabled: !!user && !dismissed,
    staleTime: 30 * 1000, // 30 saniye cache
  })

  const accountStatus = userData?.accountStatus || user?.accountStatus
  const suspendedUntil = userData?.suspendedUntil || user?.suspendedUntil
  const suspensionReason = userData?.suspensionReason || user?.suspensionReason

  // ✅ Banner görünürlüğünü hesapla
  const isVisible = !dismissed && 
    !!user && 
    accountStatus === 'SUSPENDED' && 
    (!suspendedUntil || new Date(suspendedUntil) >= new Date())

  // ✅ Visibility değişikliklerini useEffect ile parent'a bildir (render sırasında state güncelleme hatası önlemek için)
  useEffect(() => {
    if (onVisibilityChange) {
      onVisibilityChange(isVisible)
    }
  }, [isVisible, onVisibilityChange])

  // ✅ Banner'ı göster/gizle kontrolü
  if (!isVisible) {
    return null
  }

  // ✅ Kaç gün kaldığını hesapla
  const getDaysRemaining = () => {
    if (!suspendedUntil) return null
    const now = new Date()
    const until = new Date(suspendedUntil)
    const diff = until.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days > 0 ? days : null
  }

  const daysRemaining = getDaysRemaining()

  return (
    <div className="w-full bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <Lock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">
              Hesabınız askıya alındı
            </p>
            <div className="flex items-center gap-2 mt-1">
              {suspensionReason && (
                <p className="text-xs text-orange-800 dark:text-orange-300">
                  Neden: {suspensionReason}
                </p>
              )}
              {daysRemaining !== null && (
                <>
                  <span className="text-orange-600 dark:text-orange-400">•</span>
                  <p className="text-xs text-orange-800 dark:text-orange-300">
                    {daysRemaining === 1 
                      ? '1 gün kaldı' 
                      : `${daysRemaining} gün kaldı`}
                  </p>
                </>
              )}
              {!suspendedUntil && (
                <p className="text-xs text-orange-800 dark:text-orange-300">
                  Süresiz askıya alındı
                </p>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
          aria-label="Banner'ı kapat"
        >
          <X className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </button>
      </div>
    </div>
  )
}

