import { create } from 'zustand'
import { persist } from 'zustand/middleware'
// 🔥 Lazy import - circular dependency'yi önlemek için
// import api from './api'
import { CapabilitySummary, SidebarVisibility, SubscriptionPlanCode, UserRoleCode } from '@/types/capabilities'

interface User {
  id: string
  username: string
  email: string
  fullName?: string
  avatar?: string
  coverImage?: string
  bio?: string
  roles?: UserRoleCode[]
  extras?: string[]
  plan?: SubscriptionPlanCode
  badges?: string[]
  isPrivate?: boolean
  isVerified?: boolean
  isAdmin?: boolean
  superAdmin?: boolean // 🔥 GOD-MODE
  profileCompleted?: boolean
  dateOfBirth?: string | null
  country?: string | null
  city?: string | null
  gender?: string | null
  activeRole?: string | null // 🎯 Aktif rol (profil header'da gösterilecek, onboarding kontrolü için)
  usernameLastChangedAt?: string | null // 🔒 Kullanıcı adı son değiştirilme tarihi (14 günlük limit için)
  website?: string | null // 🔗 Website URL
}

interface AuthState {
  user: User | null
  capabilities: CapabilitySummary | null
  sidebar: SidebarVisibility | null
  accessToken: string | null
  refreshToken: string | null
  unreadCount: number
  unreadMessageCount: number
  isAuthenticated: boolean // ✅ Backend doğrulaması ile set edilir
  loading: boolean // ✅ Auth kontrolü yapılırken true
  hasInitialized: boolean // ✅ Backend doğrulaması yapıldı mı?
  setAuth: (
    user: User,
    accessToken: string,
    refreshToken: string,
    capabilities?: CapabilitySummary | null,
    sidebar?: SidebarVisibility | null
  ) => void
  setUser: (user: User, capabilities?: CapabilitySummary | null, sidebar?: SidebarVisibility | null) => void
  setCapabilities: (capabilities: CapabilitySummary | null, sidebar?: SidebarVisibility | null) => void
  setSidebar: (sidebar: SidebarVisibility | null) => void
  updateTokens: (accessToken: string, refreshToken?: string) => void
  clearAuth: () => void
  refreshUser: () => Promise<void> // Kullanıcı bilgilerini backend'den yenile
  setUnreadCount: (count: number) => void // Bildirim okunmamış sayısını güncelle
  setUnreadMessageCount: (count: number) => void // Mesaj okunmamış sayısını güncelle
  setLoading: (loading: boolean) => void // ✅ Loading state kontrolü
  setAuthenticated: (isAuthenticated: boolean) => void // ✅ Auth state kontrolü
  setHasInitialized: (hasInitialized: boolean) => void // ✅ Initialization state kontrolü
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      capabilities: null,
      sidebar: null,
      accessToken: null,
      refreshToken: null,
      unreadCount: 0,
      unreadMessageCount: 0,
      isAuthenticated: false, // ✅ Backend doğrulaması ile set edilir - persist edilmez
      loading: false, // ✅ AuthGuard başladığında true olacak - persist edilmez
      hasInitialized: false, // ✅ Backend doğrulaması yapıldı mı? - persist edilmez
      setAuth: (user, accessToken, refreshToken, capabilities = null, sidebar = null) => {
        // Token'ı localStorage'a kaydet (middleware ve diğer kontroller için)
        if (typeof window !== 'undefined' && accessToken) {
          localStorage.setItem('access_token', accessToken)
        }
        set({ user, accessToken, refreshToken, capabilities, sidebar, isAuthenticated: true, loading: false })
      },
      setUser: (user, capabilities = null, sidebar = null) => {
        set((state) => ({
          ...state,
          user,
          capabilities: capabilities ?? state.capabilities,
          sidebar: sidebar ?? state.sidebar,
        }))
      },
      setCapabilities: (capabilities, sidebar = null) => {
        set((state) => ({ ...state, capabilities, sidebar: sidebar ?? state.sidebar }))
      },
      setSidebar: (sidebar) => {
        set((state) => ({ ...state, sidebar }))
      },
      updateTokens: (accessToken, refreshToken) => {
        // Token'ı localStorage'a kaydet (API interceptor için)
        if (typeof window !== 'undefined' && accessToken) {
          localStorage.setItem('access_token', accessToken)
        }
        set((state) => ({
          accessToken,
          refreshToken: refreshToken || state.refreshToken,
        }))
      },
      clearAuth: () => {
        set({ user: null, capabilities: null, sidebar: null, accessToken: null, refreshToken: null, unreadCount: 0, unreadMessageCount: 0, isAuthenticated: false, loading: false, hasInitialized: true })
        if (typeof window !== 'undefined') {
          localStorage.removeItem('feellink_roles')
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('auth-storage')
          sessionStorage.removeItem('access_token')
          sessionStorage.removeItem('refresh_token')
        }
      },
      setLoading: (loading: boolean) => {
        set({ loading })
      },
      setAuthenticated: (isAuthenticated: boolean) => {
        set({ isAuthenticated, loading: false })
      },
      setHasInitialized: (hasInitialized: boolean) => {
        set({ hasInitialized })
      },
      refreshUser: async () => {
        try {
          const state = get()
          if (!state.accessToken) {
            return
          }

          // 🔥 Lazy import - circular dependency'yi önlemek için
          const { default: api } = await import('./api')
          const response = await api.get('/auth/me')
          const { user: updatedUser, capabilities, sidebar } = response.data

          // User'ı güncelle
          set({ user: updatedUser, capabilities, sidebar: sidebar ?? state.sidebar })
        } catch (error) {
          console.warn('Kullanıcı bilgisi yenilenemedi:', error)
        }
      },
      setUnreadCount: (count: number) => {
        set({ unreadCount: count })
      },
      setUnreadMessageCount: (count: number) => {
        set({ unreadMessageCount: count })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // ⛔️ loading ve isAuthenticated persist edilmez - her mount'ta backend doğrulaması yapılır
        user: state.user,
        capabilities: state.capabilities,
        sidebar: state.sidebar,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        unreadCount: state.unreadCount,
        unreadMessageCount: state.unreadMessageCount,
      }),
      // axios / login sayfası `access_token` anahtarını da okuyor; rehydrate sonrası senkron tut
      onRehydrateStorage: () => (state) => {
        if (typeof window === 'undefined' || !state) return
        try {
          if (state.accessToken) localStorage.setItem('access_token', state.accessToken)
          else localStorage.removeItem('access_token')
          if (state.refreshToken) localStorage.setItem('refresh_token', state.refreshToken)
          else localStorage.removeItem('refresh_token')
        } catch {
          /* ignore */
        }
      },
    }
  )
)
