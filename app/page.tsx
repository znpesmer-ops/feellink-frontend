'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { getDashboardRouteFromUser } from '@/lib/role-utils'

export default function Home() {
  const router = useRouter()
  const { user, accessToken, capabilities } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)

  // Zustand persist hydration'ını bekle
  useEffect(() => {
    // Hydration kontrolü
    const checkHydration = () => {
      try {
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
          // Fallback
          setTimeout(() => setIsHydrated(true), 100)
        }
      } catch {
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

  // Hydration sonrası yönlendirme
  useEffect(() => {
    if (!isHydrated) return

    if (!accessToken || !user || !capabilities) {
      router.replace('/login')
    } else {
      if (!capabilities.roles || capabilities.roles.length === 0) {
        router.replace('/select-role')
      } else {
        const route = getDashboardRouteFromUser({
          roles: capabilities.roles,
          isAdmin: user.isAdmin,
          capabilities,
        })
        router.replace(route)
      }
    }
  }, [accessToken, user, capabilities, router, isHydrated])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-500">Yönlendiriliyor...</p>
      </div>
    </div>
  )
}

