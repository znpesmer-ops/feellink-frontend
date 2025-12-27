'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from './store'
import api from './api'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { accessToken, user, capabilities, setAuth, setUser, setCapabilities } = useAuthStore()
  const [isInitializing, setIsInitializing] = useState(true)

  // ✅ Public routes - logout sonrası bu sayfalarda kalınabilir
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/onboarding',   // Onboarding sayfası public
    '/posts',        // Eser detay sayfaları public
    '/artwork',      // Eser sayfaları public (alternatif route)
  ]

  const isPublicRoute = publicRoutes.some((route) =>
    pathname?.startsWith(route)
  )

  useEffect(() => {
    const checkAuth = async () => {
      // localStorage'dan token kontrolü (store hydration'dan önce)
      const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      const hasToken = accessToken || tokenFromStorage

      // Debug (sadece development)
      if (process.env.NODE_ENV === 'development') {
        console.log('[AuthGuard] Token check:', {
          accessToken: accessToken ? 'exists' : 'null',
          tokenFromStorage: tokenFromStorage ? 'exists' : 'null',
          hasToken,
          pathname,
        })
      }

      // Wait for store hydration - ama token varsa bekleme
      if (accessToken === undefined && !tokenFromStorage && user === undefined) {
        // İlk render'da store henüz hydrate olmamış olabilir
        // Kısa bir süre bekle
        setTimeout(() => {
          setIsInitializing(false)
        }, 100)
        return // Still hydrating and no token
      }

      // Store hydrate oldu, initialization tamamlandı
      setIsInitializing(false)

      // 🔥 KRİTİK: Profil sayfasındayken login'e redirect yapma (sadece token kontrolü yap)
      // Profil sayfasında token yoksa bile redirect yapma, sadece loading göster
      if (pathname?.startsWith('/profile')) {
        // Profil sayfasında token yoksa bile redirect yapma
        // Profil sayfası kendi auth kontrolünü yapacak
        return
      }

      // ✅ Public route ise redirect yapma
      if (isPublicRoute) {
        return
      }

      // If no token (neither from store nor localStorage), redirect to login
      if (!hasToken) {
        router.replace('/login')
        return
      }

      // Token var ama store'da yok - store'u güncelle
      if (tokenFromStorage && !accessToken) {
        // Token localStorage'da var ama store'da yok - store'u güncelle
        // Bu durumda /auth/me çağrısı yapıp user bilgisini al
        // Retry mekanizması ile network error'ları handle et
        let retryCount = 0
        const maxRetries = 3
        
        const fetchUserData = async (): Promise<void> => {
          try {
            // Debug
            if (process.env.NODE_ENV === 'development') {
              console.log(`[AuthGuard] Token found in localStorage, fetching user data... (attempt ${retryCount + 1}/${maxRetries})`)
            }
            
            const response = await api.get('/auth/me')
            const { user: currentUser, capabilities: caps, sidebar } = response.data
            // Refresh token'ı store'dan al (varsa)
            const state = useAuthStore.getState()
            setAuth(currentUser, tokenFromStorage, state.refreshToken || '', caps ?? null, sidebar ?? null)
            
            // Debug
            if (process.env.NODE_ENV === 'development') {
              console.log('[AuthGuard] User data fetched successfully')
            }
          } catch (error: any) {
            // Debug
            if (process.env.NODE_ENV === 'development') {
              console.error('[AuthGuard] Failed to fetch user data:', {
                error: error?.message,
                code: error?.code,
                response: error?.response?.status,
                retryCount,
              })
            }
            
            // Network error ise retry yap
            if ((error?.code === 'ERR_NETWORK' || !error?.response) && retryCount < maxRetries) {
              retryCount++
              const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 4000) // Exponential backoff
              
              if (process.env.NODE_ENV === 'development') {
                console.log(`[AuthGuard] Network error, retrying in ${delay}ms...`)
              }
              
              await new Promise(resolve => setTimeout(resolve, delay))
              return fetchUserData() // Retry
            }
            
            // Max retry sayısına ulaşıldı veya network error değil
            // Token geçersiz - temizle ve login'e yönlendir
            if (typeof window !== 'undefined') {
              localStorage.removeItem('access_token')
            }
            
            // Sadece auth error ise login'e yönlendir (network error değilse)
            if (error?.response?.status === 401 || error?.response?.status === 403) {
              router.replace('/login')
            }
            // Network error ise sessizce devam et (belki backend başlatılıyor)
          }
        }
        
        await fetchUserData()
        return
      }

      // If no user but have token, verify token
      if (!user && hasToken) {
        // Retry mekanizması ile network error'ları handle et
        let retryCount = 0
        const maxRetries = 3
        
        const verifyToken = async (): Promise<void> => {
          try {
            const response = await api.get('/auth/me')
            const { user: currentUser, capabilities: caps, sidebar } = response.data
            setUser(currentUser, caps, sidebar ?? null)
            setCapabilities(caps, sidebar ?? null)
            // Token is valid, user is authenticated
          } catch (error: any) {
            // Network error ise retry yap
            if ((error?.code === 'ERR_NETWORK' || !error?.response) && retryCount < maxRetries) {
              retryCount++
              const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 4000)
              
              if (process.env.NODE_ENV === 'development') {
                console.log(`[AuthGuard] Network error during token verification, retrying in ${delay}ms...`)
              }
              
              await new Promise(resolve => setTimeout(resolve, delay))
              return verifyToken() // Retry
            }
            
            // Network error değil veya max retry sayısına ulaşıldı
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
              } catch (refreshError: any) {
                // Refresh failed, logout
                // Network error ise sessizce devam et
                if (refreshError?.code === 'ERR_NETWORK' || !refreshError?.response) {
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('[AuthGuard] Network error during refresh, will retry later...')
                  }
                  return // Network error, retry later
                }
                
                // Auth error ise logout
                useAuthStore.getState().clearAuth()
                // ✅ Public route ise redirect yapma
                if (!isPublicRoute && !pathname?.startsWith('/profile')) {
                  router.replace('/login')
                }
                return
              }
            } else {
              // No refresh token, logout
              // Sadece auth error ise logout (network error değilse)
              if (error?.response?.status === 401 || error?.response?.status === 403) {
                useAuthStore.getState().clearAuth()
                // ✅ Public route ise redirect yapma
                if (!isPublicRoute && !pathname?.startsWith('/profile')) {
                  router.replace('/login')
                }
              }
              return
            }
          }
        }
        
        await verifyToken()
      }
    }

    checkAuth()
  }, [accessToken, user, router, pathname, setAuth, setUser, setCapabilities, isPublicRoute])

  // Token kontrolü - localStorage'dan da kontrol et
  const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const hasToken = accessToken || tokenFromStorage

  // İlk initialization sırasında loading göster
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  // Show loading while checking auth or waiting for capabilities (sadece protected route'larda)
  // Token varsa loading gösterme - user bilgisi yüklenene kadar bekle
  if ((!hasToken || !user) && !isPublicRoute && !pathname?.startsWith('/profile')) {
    // Token yoksa login'e yönlendir (zaten useEffect'te yapılıyor ama loading göster)
    if (!hasToken) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )
    }
    // Token var ama user yok - user yüklenene kadar bekle
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // 🔒 Profile Required Fields Check - Zorunlu alanlar eksikse bildirim oluştur (kullanıcıyı kilitleme)
  // Kullanıcı eksik profil ile giriş yapabilir, sadece bildirim gösterilir
  // Bu kontrol artık yapılmıyor - bildirim sistemi kullanılacak

  // Capabilities are optional - don't block if they're not loaded yet
  // Some routes might not need capabilities

  return <>{children}</>
}

