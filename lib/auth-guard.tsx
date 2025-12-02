'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from './store'
import api from './api'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { accessToken, user, capabilities, setAuth, setUser, setCapabilities } = useAuthStore()

  useEffect(() => {
    const checkAuth = async () => {
      // Wait for store hydration
      if (accessToken === undefined || user === undefined) {
        return // Still hydrating
      }

      // If no token, redirect to login
      if (!accessToken) {
        router.push('/login')
        return
      }

      // If no user but have token, verify token
      if (!user) {
        try {
          const response = await api.get('/auth/me')
          const { user: currentUser, capabilities: caps, sidebar } = response.data
          setUser(currentUser, caps, sidebar ?? null)
          setCapabilities(caps, sidebar ?? null)
          // Token is valid, user is authenticated
        } catch (error: any) {
          // Token invalid, try to refresh
          const state = useAuthStore.getState()
          const refreshToken = state.refreshToken
          
          if (refreshToken) {
            try {
              const refreshResponse = await api.post('/auth/refresh', {
                refreshToken,
              })
              const {
                user: refreshedUser,
                accessToken: newAccess,
                refreshToken: newRefresh,
                capabilities: caps,
                sidebar,
              } = refreshResponse.data
              setAuth(refreshedUser, newAccess, newRefresh, caps ?? null, sidebar ?? null)
              // Retry the original request after refresh
              return
            } catch (refreshError) {
              // Refresh failed, logout
              useAuthStore.getState().clearAuth()
              router.push('/login')
              return
            }
          } else {
            // No refresh token, logout
            useAuthStore.getState().clearAuth()
            router.push('/login')
            return
          }
        }
      }
    }

    checkAuth()
  }, [accessToken, user, router, setAuth, setUser, setCapabilities])

  // Show loading while checking auth or waiting for capabilities
  if (!accessToken || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Capabilities are optional - don't block if they're not loaded yet
  // Some routes might not need capabilities

  return <>{children}</>
}

