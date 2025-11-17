import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from './api'
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
}

interface AuthState {
  user: User | null
  capabilities: CapabilitySummary | null
  sidebar: SidebarVisibility | null
  accessToken: string | null
  refreshToken: string | null
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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      capabilities: null,
      sidebar: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken, capabilities = null, sidebar = null) => {
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
        set((state) => ({
          accessToken,
          refreshToken: refreshToken || state.refreshToken,
        }))
      },
      clearAuth: () => {
        set({ user: null, capabilities: null, sidebar: null, accessToken: null, refreshToken: null })
        // 🔥 Logout durumunda localStorage'dan rolleri de temizle
        localStorage.removeItem('feellink_roles')
      },
      refreshUser: async () => {
        try {
          const state = get()
          if (!state.accessToken) {
            return
          }

          const response = await api.get('/auth/me')
          const { user: updatedUser, capabilities, sidebar } = response.data

          // User'ı güncelle
          set({ user: updatedUser, capabilities, sidebar: sidebar ?? state.sidebar })
        } catch (error) {
          console.warn('Kullanıcı bilgisi yenilenemedi:', error)
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)

