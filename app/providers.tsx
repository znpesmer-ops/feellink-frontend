'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
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
    const hasHydrated = useAuthStore.persist?.hasHydrated
    const onFinishHydration = useAuthStore.persist?.onFinishHydration

    if (typeof hasHydrated === 'function' && hasHydrated()) {
      setIsHydrated(true)
      return
    }

    const timeout = window.setTimeout(() => {
      setIsHydrated(true)
    }, 0)

    let unsubscribe: (() => void) | undefined

    if (typeof onFinishHydration === 'function') {
      unsubscribe = onFinishHydration(() => {
        window.clearTimeout(timeout)
        setIsHydrated(true)
      })
    }

    return () => {
      window.clearTimeout(timeout)
      if (typeof unsubscribe === 'function') {
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
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1a1a1a',
                color: '#fff',
                borderRadius: '12px',
                padding: '14px 18px',
                fontSize: '14px',
                fontWeight: 500,
                border: '1px solid rgba(255, 123, 0, 0.2)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              },
              className: '',
              success: {
                iconTheme: {
                  primary: '#ff7b00',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </AuthInitializer>
      </QueryClientProvider>
    </ThemeProvider>
  )
}


