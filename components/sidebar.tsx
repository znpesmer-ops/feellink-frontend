'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Compass,
  MessageSquare,
  User,
  Bell,
  Settings,
  Calendar,
  Layers,
  BarChart3,
  Sparkles,
  Shield,
  FileText,
  Bookmark,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { ROLE_METADATA, normalizeRole } from '@/lib/role-utils'
import { CapabilitySummary, SidebarVisibility } from '@/types/capabilities'
import api from '@/lib/api'
import { initSocket, initChatSocket } from '@/lib/socket'

interface NavItem {
  key: string
  label: string
  href: string
  icon: React.ElementType
  flag?: keyof SidebarVisibility
  badgeCount?: number
  highlight?: boolean
}

interface SidebarProps {
  forceVisible?: boolean
  onLinkClick?: () => void
}

export function Sidebar({ forceVisible = false, onLinkClick }: SidebarProps = {}) {
  const pathname = usePathname()
  const { user, capabilities, accessToken, sidebar, unreadCount, setUnreadCount, unreadMessageCount, setUnreadMessageCount, refreshUser } = useAuthStore()
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  
  // 🔥 Admin kontrolü için kullanıcı bilgilerini yenile (ilk yüklemede ve profil güncellemesi sonrası)
  useEffect(() => {
    if (accessToken && user) {
      // Kullanıcı bilgilerini backend'den yenile (admin durumu veya profil tamamlama durumu değişmiş olabilir)
      refreshUser().catch(() => {})
    }
  }, [accessToken])
  
  // 🔥 Profil güncellemesi sonrası user state'ini yenile (window event ile)
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (accessToken) {
        refreshUser().catch(() => {})
      }
    }
    
    window.addEventListener('profileUpdated', handleProfileUpdate)
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate)
    }
  }, [accessToken, refreshUser]) // Sadece accessToken değiştiğinde çalış (ilk yüklemede)

  useEffect(() => {
    if (!accessToken) return

    // ✅ Store'dan unreadCount'ı güncelle
    api
      .get('/notifications/unread-count')
      .then((response) => setUnreadCount(response.data.count))
      .catch(() => {})

    const socket = initSocket(accessToken)
    socket.on('notification', () => {
      // ✅ Yeni bildirim geldiğinde store'u güncelle
      api
        .get('/notifications/unread-count')
        .then((response) => setUnreadCount(response.data.count))
        .catch(() => {})
    })

    return () => {
      socket.off('notification')
    }
  }, [accessToken, setUnreadCount])

  // 🔥 OKUNMAMIŞ MESAJ SAYISI (Bildirimler gibi)
  useEffect(() => {
    if (!accessToken) return

    // ✅ İlk yüklemede okunmamış mesaj sayısını çek
    api
      .get('/chat/unread-count')
      .then((response) => setUnreadMessageCount(response.data.count))
      .catch(() => {})

    const chatSocket = initChatSocket(accessToken)
    
    // ✅ Yeni mesaj geldiğinde sayıyı güncelle
    chatSocket.on('new_message', () => {
      if (pathname !== '/messages') {
        setHasUnreadMessages(true)
      }
      // Okunmamış mesaj sayısını güncelle
      api
        .get('/chat/unread-count')
        .then((response) => setUnreadMessageCount(response.data.count))
        .catch(() => {})
    })

    // ✅ Mesaj okunduğunda sayıyı güncelle
    chatSocket.on('receive_message', () => {
      api
        .get('/chat/unread-count')
        .then((response) => setUnreadMessageCount(response.data.count))
        .catch(() => {})
    })

    return () => {
      chatSocket.off('new_message')
      chatSocket.off('receive_message')
    }
  }, [accessToken, pathname, setUnreadMessageCount])

  useEffect(() => {
    if (pathname === '/messages') {
      setHasUnreadMessages(false)
      // Mesajlar sayfasına girildiğinde sayıyı güncelle (okundu olarak işaretlenmiş olabilir)
      if (accessToken) {
        api
          .get('/chat/unread-count')
          .then((response) => setUnreadMessageCount(response.data.count))
          .catch(() => {})
      }
    }
  }, [pathname, accessToken, setUnreadMessageCount])

  const navItems = useMemo<NavItem[]>(() => {
    if (!user || !capabilities) return []

    const sidebarFlags: SidebarVisibility =
      sidebar ??
      (capabilities
        ? {
            showFeed: Boolean(capabilities.sidebar?.home),
            showExplore: Boolean(capabilities.sidebar?.explore),
            showProfile: Boolean(capabilities.sidebar?.profile),
            showMessages: Boolean(capabilities.sidebar?.messages),
            showListings: Boolean(capabilities.sidebar?.listings),
            showAnalytics: Boolean(capabilities.sidebar?.analytics),
            showEvents: Boolean(
              capabilities.sidebar?.myEvents || capabilities.sidebar?.createEvent
            ),
            showCollections: Boolean(
              capabilities.sidebar?.collections ||
                capabilities.sidebar?.manageCollections
            ),
            showTickets: true,
          }
        : {
            showFeed: true,
            showExplore: true,
            showProfile: true,
            showMessages: true,
            showListings: true,
            showAnalytics: true,
            showEvents: true,
            showCollections: true,
            showTickets: true,
          })

    const profileHref = '/profile/me'

    const items: NavItem[] = [
      { key: 'home', label: 'Ana Sayfa', href: '/feed', icon: Home },
      { key: 'explore', label: 'Keşfet', href: '/explore', icon: Compass },
      {
        key: 'listings',
        label: 'Feellink',
        href: '/fellink',
        icon: Sparkles,
      },
      {
        key: 'messages',
        label: 'Mesajlar',
        href: '/messages',
        icon: MessageSquare,
        badgeCount: unreadMessageCount,
        highlight: hasUnreadMessages || unreadMessageCount > 0,
      },
      { key: 'profile', label: 'Profil', href: profileHref, icon: User },
      { key: 'articles', label: 'Yazılar', href: '/articles', icon: FileText },
      // { key: 'saved', label: 'Kaydedilenler', href: '/saved', icon: Bookmark }, // Gizlendi - sayfa ve backend çalışmaya devam ediyor
      { key: 'analytics', label: 'Analizler', href: '/analytics', icon: BarChart3 },
      {
        key: 'collections',
        label: 'Koleksiyonlar',
        href: '/collections',
        icon: Layers,
        // 🔥 Her zaman görünür - flag kontrolü yok
      },
      { key: 'events', label: 'Etkinlikler', href: '/events', icon: Calendar },
      // Biletlerim geçici olarak gizlendi (route ve backend korunuyor)
      // { key: 'tickets', label: 'Biletlerim', href: '/my-tickets', icon: Ticket, flag: 'showTickets' },
      { 
        key: 'notifications', 
        label: 'Bildirimler', 
        href: '/notifications', 
        icon: Bell, 
        badgeCount: unreadCount,
        // 🔥 highlight kaldırıldı - sadece badgeCount kullanılıyor (tek dot)
      },
      { key: 'settings', label: 'Ayarlar', href: '/settings', icon: Settings },
    ]

    // Admin menüsünü ekle (eğer kullanıcı admin veya superAdmin ise)
    if (user.isAdmin || user.superAdmin) {
      items.push({
        key: 'admin',
        label: 'Admin Paneli',
        href: '/admin',
        icon: Shield,
      })
    }

    // 🔥 Tüm linkler her zaman görünür - flag kontrolü kaldırıldı
    return items
  }, [user, capabilities, sidebar, unreadCount, unreadMessageCount, hasUnreadMessages])

  if (!accessToken || !user || !capabilities) {
    return null
  }

  if (pathname === '/select-role') {
    return null
  }

  const activeRoute = pathname
  
  // Admin kontrolü - profesyonel SaaS mantığı
  const isAdmin = user?.isAdmin === true || user?.superAdmin === true
  
  // Plan etiketi kaldırıldı - artık sadece rol gösteriliyor
  
  // Rol etiketi - Admin için özel gösterim
  const resolvedRoles =
    (capabilities.roles && capabilities.roles.length > 0
      ? capabilities.roles
      : user?.roles) ?? []
  const normalizedRoles = resolvedRoles.map((role) => normalizeRole(role))
  const roleLabels = normalizedRoles
    .map((role) => ROLE_METADATA[role]?.label)
    .filter(Boolean) as string[]
  
  const primaryRoleLabel = isAdmin
    ? 'Admin'
    : roleLabels[0] ?? ROLE_METADATA.art_lover.label

  return (
    <aside className="w-full h-full bg-white dark:bg-gray-950 border-r border-gray-200/70 dark:border-white/10 shadow-sm flex flex-col">

      {/* LOGO */}
      <div className="w-full flex items-center justify-start px-4 pt-0 pb-0 -mt-2">
        <img
          src="/logo.png"
          alt="Feellink Logo"
          className="h-8 w-auto object-contain pl-3"
        />
      </div>

      {/* MENU */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <ul className="flex flex-col gap-3">
          {navItems.map((item) => {
            const isActive =
              activeRoute === item.href ||
              activeRoute.startsWith(`${item.href}/`)
            const Icon = item.icon
            const baseClasses =
              'sidebar-item group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors'
            const inactiveClasses =
              'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'

            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={onLinkClick}
                  className={`${baseClasses} ${
                    isActive ? 'bg-brand-blue/10 text-brand-orange' : inactiveClasses
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>

                  {/* 🔥 Tek dot kuralı: badgeCount varsa onu göster, yoksa highlight dot'u göster */}
                  {item.badgeCount !== undefined && item.badgeCount > 0 ? (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand-orange text-white text-xs font-semibold">
                      {item.badgeCount > 99 ? '99+' : item.badgeCount}
                    </span>
                  ) : item.highlight ? (
                    <span className="inline-flex h-2 w-2 rounded-full bg-brand-orange"></span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* ROLE / PLAN */}
      <div className="border-t border-gray-200/70 dark:border-white/10 px-6 py-5 text-sm text-gray-500 dark:text-gray-400">
        <p className="font-medium text-gray-900 dark:text-white">Aktif Rol</p>

        <div className="mt-3 text-gray-900 dark:text-white font-semibold tracking-wide">
          {isAdmin ? (
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#ff7b00]" />
              <span>Admin</span>
            </span>
          ) : (
            primaryRoleLabel
          )}
        </div>

        {!isAdmin && roleLabels.length > 1 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {roleLabels.slice(1).join(' • ')}
          </p>
        )}
        
        {isAdmin && (
          <p className="mt-2 text-xs text-[#ff7b00] dark:text-[#ff9500] leading-relaxed font-medium">
            Tüm özelliklere erişim
          </p>
        )}
      </div>
    </aside>
  )
}
