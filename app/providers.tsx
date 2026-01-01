'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/lib/store'
import { useNotificationStore } from '@/lib/store-notifications'
import { ThemeProvider } from '@/lib/theme-context'
import { initSocket, disconnectSocket } from '@/lib/socket'
// 🔥 Lazy import - server-side render sorunlarını önlemek için
// import api from '@/lib/api'
import { LayoutConditional } from '@/components/layout-conditional'
import { AccountSuspendedModal } from '@/components/AccountSuspendedModal'
// 🔥 Lazy import - server-side render sorunlarını önlemek için
// import '@/lib/avatar-cleanup' // ✅ Avatar cleanup'ı otomatik çalıştır

// Global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Suppress network errors
    const error = event.reason
    if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
      event.preventDefault()
      return
    }
    // Only log in development for other errors
    if (process.env.NODE_ENV === 'development') {
      console.warn('Unhandled promise rejection:', error)
    }
  })
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useAuthStore()
  const { addNotification, setUnreadCount } = useNotificationStore()

  // Hydration kontrolünü kaldırdık - direkt render et

  // Socket bağlantısı ve bildirim dinleme
  useEffect(() => {
    if (!user?.id || !accessToken) return

    // Socket bağlantısını başlat
    const socket = initSocket(accessToken)

    // Bildirim event'ini dinle
    socket.on('notification', (notification: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('📬 Yeni bildirim alındı:', notification)
      }
      addNotification(notification)
    })

    // İlk yüklemede okunmamış bildirim sayısını al
    const loadUnreadCount = async () => {
      // 🔥 Client-side kontrolü
      if (typeof window === 'undefined') return
      
      try {
        // 🔥 Lazy import - server-side render sorunlarını önlemek için
        const { default: api } = await import('@/lib/api')
        const response = await api.get('/notifications/unread-count')
        setUnreadCount(response.data.count || 0)
      } catch (error: any) {
        // Only log non-network errors
        if (error?.response || (error?.code !== 'ERR_NETWORK' && process.env.NODE_ENV === 'development')) {
          console.warn('Failed to load unread count:', error)
        }
      }
    }

    loadUnreadCount()

    // Cleanup
    return () => {
      socket.off('notification')
      disconnectSocket()
    }
  }, [user?.id, accessToken, addNotification, setUnreadCount])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  // 🔥 Avatar cleanup'ı client-side'da çalıştır
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/avatar-cleanup').catch(() => {})
    }
  }, [])
  // QueryClient'i en üstte oluştur - her zaman hazır olmalı
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        // Suppress network errors in console
        retry: (failureCount, error: any) => {
          // Don't retry on network errors
          if (!error?.response && error?.code === 'ERR_NETWORK') {
            return false
          }
          return failureCount < 2
        },
        // onError removed - React Query v5+ doesn't support onError in defaultOptions
        // Error handling should be done in individual queries or error boundaries
      },
      mutations: {
        // onError removed - React Query v5+ doesn't support onError in defaultOptions
        // Error handling should be done in individual mutations or error boundaries
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthInitializer>
          <LayoutConditional>{children}</LayoutConditional>
        </AuthInitializer>
        <AccountSuspendedModal />
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
      </ThemeProvider>
    </QueryClientProvider>
  )
}


