'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import {
  LogOut,
  Users,
  Bell,
  FileText,
  Home,
  Settings,
  Calendar,
  Ticket,
  Flag,
  BarChart3,
  BookOpen,
  Shield,
  Activity,
  MessageCircle,
  Palette,
  AlertTriangle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { clearAuth, user, accessToken, refreshToken, refreshUser } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [hasRefreshed, setHasRefreshed] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      // Wait for store to hydrate from localStorage
      if (accessToken === undefined || user === undefined) {
        return // Still hydrating
      }

      // Not logged in
      if (!accessToken || !user) {
        router.replace('/login')
        return
      }

      // Admin kontrolü - isAdmin veya superAdmin olmalı (profesyonel SaaS mantığı)
      const isAdmin = user.isAdmin === true || user.superAdmin === true

      // If user is not admin, try refreshing user data once
      if (!isAdmin && !hasRefreshed) {
        try {
          setHasRefreshed(true)
          await refreshUser()
          // Effect will re-run with updated user from store
          return
        } catch (error) {
          console.error('Failed to refresh user:', error)
        }
      }

      // Final admin check (after potential refresh)
      const currentUser = useAuthStore.getState().user
      const finalIsAdmin = currentUser?.isAdmin === true || currentUser?.superAdmin === true

      if (!finalIsAdmin) {
        alert('Bu sayfaya erişim yetkiniz yok! Lütfen çıkış yapıp tekrar giriş yapın.')
        router.push('/feed')
        return
      }

      // Is admin, can proceed
      setIsChecking(false)
    }

    checkAdmin()
  }, [accessToken, user, router, refreshUser, hasRefreshed])

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken })
      }
    } catch (error) {
      console.warn('Logout error:', error)
    } finally {
      clearAuth()
      // replace kullanarak geri butonuna basınca geri dönmesin
      router.replace('/login')
    }
  }

  const navItems = [
    { href: '/admin', icon: Home, label: 'Dashboard' },
    { href: '/admin/users', icon: Users, label: 'Kullanıcılar' },
    { href: '/admin/posts', icon: FileText, label: 'Gönderiler' },
    { href: '/admin/artworks', icon: Palette, label: 'Eserler' },
    { href: '/admin/comments', icon: MessageCircle, label: 'Yorumlar' },
    { href: '/admin/articles', icon: BookOpen, label: 'Makaleler' },
    { href: '/admin/events', icon: Calendar, label: 'Etkinlikler' },
    { href: '/admin/tickets', icon: Ticket, label: 'Biletler' },
    { href: '/admin/moderation', icon: Shield, label: 'Moderasyon' },
    { href: '/admin/reports', icon: AlertTriangle, label: 'Şikayetler' },
    { href: '/admin/analytics', icon: BarChart3, label: 'Analitik' },
    { href: '/admin/feature-flags', icon: Flag, label: 'Feature Flags' },
    { href: '/admin/audit-logs', icon: Activity, label: 'Audit Logs' },
    { href: '/admin/settings', icon: Settings, label: 'Ayarlar' },
  ]

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname?.startsWith(href)
  }

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex w-full min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Sidebar - Genişletilmiş */}
      <aside className="w-72 bg-[var(--panel)] border-r border-[var(--border)] shadow-sm flex flex-col justify-between">
        <div>
          <div className="px-6 py-4">
            <h1 className="text-xl font-bold text-[var(--accent)]">Feellink Admin</h1>
          </div>
          <nav className="mt-4 flex flex-col space-y-1 px-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ease-in-out ${
                    active
                      ? 'bg-[var(--muted)] text-[var(--accent)] font-medium'
                      : 'text-[var(--sub)] hover:bg-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="border-t border-[var(--border)] p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 ease-in-out"
          >
            <LogOut size={20} />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main Content - Genişletilmiş ve optimize edilmiş */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 bg-[var(--panel)] shadow-sm px-4 lg:px-6 py-4 flex justify-between items-center z-50 border-b border-[var(--border)]">
          <h1 className="text-2xl font-semibold text-[var(--text)]">
            Hoş geldin, {user?.username}
          </h1>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center">
              <span className="text-[var(--accent)] font-semibold text-lg">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>
        <div className="w-full bg-[var(--bg)]">
          {children}
        </div>
      </main>
    </div>
  )
}
