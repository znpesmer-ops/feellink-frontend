'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from './store'
import api from './api'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { accessToken, user, setAuth } = useAuthStore()

  useEffect(() => {
    const checkAuth = async () => {
      // If no token, redirect to login
      if (!accessToken) {
        router.push('/login')
        return
      }

      // Verify token is valid by calling /auth/me
      try {
        const response = await api.get('/auth/me')
        // Update user info in case role or other fields changed
        const currentRefreshToken = useAuthStore.getState().refreshToken
        if (accessToken && currentRefreshToken) {
          setAuth(response.data, accessToken, currentRefreshToken)
        }
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
            setAuth(
              refreshResponse.data.user,
              refreshResponse.data.accessToken,
              refreshResponse.data.refreshToken
            )
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

    checkAuth()
  }, [accessToken, router, setAuth])

  // Show loading while checking auth
  if (!accessToken || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return <>{children}</>
}

