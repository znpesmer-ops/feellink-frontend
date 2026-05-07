'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from './store'
import api, { performForcedLogout } from './api'
import { getDashboardRouteFromUser } from './role-utils'

const publicRoutes = [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/onboarding',
  '/select-role',
  '/posts',
  '/artwork',
  '/profile',
]

// Route değişiminde AuthGuard yeniden mount olsa bile aynı token zaten doğrulandıysa tekrar /me çağrılmasın
let lastValidatedToken: string | null = null

// Login sayfasından çağrılır: başarılı login sonrası /auth/me tekrar çağrılmasın
export function markTokenAsValidated(token: string) {
  lastValidatedToken = token
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const {
    accessToken,
    user,
    isAuthenticated,
    loading,
    hasInitialized,
    setAuth,
    setLoading,
    setHasInitialized,
    clearAuth,
  } = useAuthStore()
  const hasRunRef = useRef(false)

  const currentPathname = pathname || ''
  const isPublicRoute = publicRoutes.some((r) => currentPathname.startsWith(r))

  // Optimistic: kullanıcı store'da varsa hemen "authenticated" say — backend doğrulaması arka planda devam eder
  const hasStoredAuth = !!accessToken && !!user

  // Login/register'da token yoksa hemen resolved yap - loader takılmadan form gösterilsin
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (currentPathname !== '/login' && currentPathname !== '/register') return
    if (localStorage.getItem('access_token')) return
    setLoading(false)
    setHasInitialized(true)
    clearAuth()
    lastValidatedToken = null
  }, [currentPathname, setLoading, setHasInitialized, clearAuth])

  // Tek karar noktası: token varsa /me ile doğrula; yoksa resolved = not authenticated
  // Aynı token zaten doğrulandıysa (navigasyon) tekrar /me çağırma, flicker/loop önlenir
  useEffect(() => {
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const currentToken = accessToken || tokenFromStorage

    // Login/register'da localStorage'da token yoksa initAuth hiç çalıştırma
    if (typeof window !== 'undefined' && (currentPathname === '/login' || currentPathname === '/register') && !tokenFromStorage) {
      clearAuth()
      setLoading(false)
      setHasInitialized(true)
      hasRunRef.current = false
      lastValidatedToken = null
      return
    }

    if (!currentToken) {
      lastValidatedToken = null
      clearAuth()
      setLoading(false)
      setHasInitialized(true)
      hasRunRef.current = false
      return
    }

    // Token zaten bu session'da doğrulandıysa tekrar /me atma (navigasyonda remount'ta hasInitialized/isAuthenticated bazen gecikmeli; sadece lastValidatedToken'a güven)
    if (currentToken === lastValidatedToken) {
      setLoading(false)
      setHasInitialized(true)
      hasRunRef.current = true
      return
    }

    if (hasRunRef.current) {
      setLoading(false)
      setHasInitialized(true)
      return
    }
    hasRunRef.current = true

    const initAuth = async () => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      // Optimistik modda arka planda çalışıyor — timeout uzun olabilir
      timeoutId = setTimeout(() => {
        setLoading(false)
        setHasInitialized(true)
        hasRunRef.current = false
      }, 20000)

      try {
        setLoading(true)
        const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
        const tokenToUse = tokenFromStorage || accessToken || currentToken
        const response = await api.get('/auth/me', {
          headers: tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : undefined,
        })
        const { user: currentUser, capabilities, sidebar } = response.data
        const currentRefreshToken = useAuthStore.getState().refreshToken
        setAuth(
          currentUser,
          tokenToUse || '',
          currentRefreshToken || '',
          capabilities ?? null,
          sidebar ?? null
        )
        lastValidatedToken = currentToken
      } catch (err: any) {
        const status = err?.response?.status
        if (status === 401 || status === 403) {
          lastValidatedToken = null
          performForcedLogout()
          hasRunRef.current = false
          return
        }
        const state = useAuthStore.getState()
        if (state.isAuthenticated && state.user) {
          lastValidatedToken = currentToken
        } else {
          lastValidatedToken = null
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
        setLoading(false)
        setHasInitialized(true)
        hasRunRef.current = false
      }
    }

    initAuth()
  }, [accessToken, currentPathname, setAuth, setLoading, setHasInitialized, clearAuth])

  // Redirect: sadece loading bittikten ve init tamamlandıktan sonra
  useEffect(() => {
    if (loading || !hasInitialized) return

    // Ana sayfa (pathname bazen '' olabiliyor, tek karar noktası)
    const isRoot = currentPathname === '/' || currentPathname === ''
    if (isRoot) {
      if (isAuthenticated) router.replace('/feed')
      else router.replace('/login')
      return
    }

    // Public route + doğrulanmış oturum → login/register'dan çık (feed değil; rol / select-role ile uyumlu)
    if (isPublicRoute && isAuthenticated && (currentPathname === '/login' || currentPathname === '/register')) {
      const { user: authedUser, capabilities: authedCaps } = useAuthStore.getState()
      if (!authedUser?.id) {
        router.replace('/feed')
        return
      }
      const rolesFromCaps = authedCaps?.roles?.length ? authedCaps.roles : []
      const rolesFromUser = authedUser.roles ?? []
      const effectiveRoles = rolesFromCaps.length > 0 ? rolesFromCaps : rolesFromUser
      if (effectiveRoles.length === 0) {
        router.replace('/select-role')
        return
      }
      const route =
        getDashboardRouteFromUser({
          roles: effectiveRoles,
          isAdmin: authedUser.isAdmin,
          capabilities: authedCaps ?? undefined,
        }) || '/feed'
      if (currentPathname !== route) {
        router.replace(route)
      }
      return
    }

    // Korunan route + giriş yok → login
    if (!isPublicRoute && !isAuthenticated) {
      router.replace('/login')
      return
    }
  }, [loading, hasInitialized, isAuthenticated, isPublicRoute, currentPathname, router])

  if (!mounted) return null

  const isLoginOrRegister = currentPathname === '/login' || currentPathname === '/register'
  const noTokenInStorage = typeof window !== 'undefined' && !localStorage.getItem('access_token')

  // Login/register + token yok → form direkt göster (spinner yok)
  if (isLoginOrRegister && noTokenInStorage) {
    return <>{children}</>
  }

  // Oturumlu kullanıcı: store'da user+token varsa içeriği hemen göster, doğrulama arka planda
  // (Token geçersizse initAuth → performForcedLogout → login'e yönlendirir)
  if (hasStoredAuth) {
    // Login/register'a gitmeye çalışıyorsa feed'e yönlendir
    if (isLoginOrRegister) return null
    return <>{children}</>
  }

  // Stored auth yok ama henüz kontrol bitmediyse küçük spinner
  if (loading || !hasInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-orange" />
      </div>
    )
  }

  // Korunan sayfadayız ama auth yok → redirect yukarıda tetiklenir
  if (!isPublicRoute && !isAuthenticated) return null
  // Login/register'dayız ama giriş var → redirect
  if (isLoginOrRegister && isAuthenticated) return null

  return <>{children}</>
}
