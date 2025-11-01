'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { useNotificationStore } from '@/lib/store-notifications'
import { ThemeProvider } from '@/lib/theme-context'
import { initSocket, disconnectSocket } from '@/lib/socket'
import api from '@/lib/api'

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false)
  const { user, accessToken } = useAuthStore()
  const { addNotification, setUnreadCount } = useNotificationStore()

  useEffect(() => {
    // Zustand persist middleware'inin hydration'ını bekle
    // persist API'si farklı olabilir, bu yüzden hem onFinishHydration hem de direkt kontrol yapıyoruz
    const checkHydration = () => {
      try {
        // Zustand persist v4+ için
        if (typeof useAuthStore.persist?.hasHydrated === 'function') {
          if (useAuthStore.persist.hasHydrated()) {
            setIsHydrated(true)
            return
          }
          
          const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
            setIsHydrated(true)
          })
          return unsubscribe
        } else {
          // Fallback: Basit timeout ile hydration'ın tamamlanmasını bekle
          setTimeout(() => {
            setIsHydrated(true)
          }, 100)
        }
      } catch (error) {
        // Hata durumunda direkt geç
        setIsHydrated(true)
      }
    }

    const unsubscribe = checkHydration()
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  // Socket bağlantısı ve bildirim dinleme
  useEffect(() => {
    if (!user?.id || !accessToken || !isHydrated) return

    // Socket bağlantısını başlat
    const socket = initSocket(accessToken)

    // Bildirim event'ini dinle
    socket.on('notification', (notification: any) => {
      console.log('📬 Yeni bildirim alındı:', notification)
      addNotification(notification)
    })

    // İlk yüklemede okunmamış bildirim sayısını al
    const loadUnreadCount = async () => {
      try {
        const response = await api.get('/notifications/unread-count')
        setUnreadCount(response.data.count || 0)
      } catch (error) {
        console.error('Failed to load unread count:', error)
      }
    }

    loadUnreadCount()

    // Cleanup
    return () => {
      socket.off('notification')
      disconnectSocket()
    }
  }, [user?.id, accessToken, isHydrated, addNotification, setUnreadCount])

  // Hydration tamamlanana kadar loading göster
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-500">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer>
          {children}
        </AuthInitializer>
      </QueryClientProvider>
    </ThemeProvider>
  )
}


