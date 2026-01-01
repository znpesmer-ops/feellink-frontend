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
}

interface AuthState {
  user: User | null
  capabilities: CapabilitySummary | null
  sidebar: SidebarVisibility | null
  accessToken: string | null
  refreshToken: string | null
  unreadCount: number
  unreadMessageCount: number
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
      setAuth: (user, accessToken, refreshToken, capabilities = null, sidebar = null) => {
        // Token'ı localStorage'a kaydet (middleware ve diğer kontroller için)
        if (typeof window !== 'undefined' && accessToken) {
          localStorage.setItem('access_token', accessToken)
        }
        set({ user, accessToken, refreshToken, capabilities, sidebar })
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
        set({ user: null, capabilities: null, sidebar: null, accessToken: null, refreshToken: null, unreadCount: 0, unreadMessageCount: 0 })
        // 🔥 Logout durumunda localStorage'dan rolleri ve token'ı temizle
        if (typeof window !== 'undefined') {
          localStorage.removeItem('feellink_roles')
          localStorage.removeItem('access_token')
        }
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
    }
  )
)

