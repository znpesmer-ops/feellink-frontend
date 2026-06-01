'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AppLogo } from '@/components/common/AppLogo'
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
    <aside
      className="w-full h-full flex flex-col relative overflow-hidden
                 bg-white dark:bg-[#080810]
                 border-r border-gray-200/60 dark:border-white/[0.06]"
      style={{
        background: 'linear-gradient(180deg, #080810 0%, #0a0a14 60%, #08080f 100%)',
      }}
    >
      {/* Subtle ambient glow top-left */}
      <div
        className="pointer-events-none absolute -top-20 -left-10 w-48 h-48 rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #ff7b00 0%, transparent 70%)' }}
      />

      {/* LOGO */}
      <div className="relative z-10 w-full flex items-center justify-start px-4 pt-1 pb-3 pl-3 border-b border-white/[0.04]">
        <AppLogo width={168} height={44} />
      </div>

      {/* MENU */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5
                      scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item, idx) => {
            const isActive =
              activeRoute === item.href ||
              activeRoute.startsWith(`${item.href}/`)
            const Icon = item.icon

            return (
              <li key={item.key} style={{ animationDelay: `${idx * 30}ms` }} className="premium-card-enter">
                <Link
                  href={item.href}
                  onClick={onLinkClick}
                  className={`
                    group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
                    transition-all duration-200 ease-out overflow-hidden
                    ${isActive
                      ? 'text-[#ff8f20] bg-gradient-to-r from-[#ff7b00]/14 to-[#ff7b00]/4'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                    }
                  `}
                >
                  {/* Active left-bar accent */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full"
                      style={{ background: 'linear-gradient(180deg, #ff9a30, #ff5500)', boxShadow: '0 0 8px #ff7b00aa' }}
                    />
                  )}

                  {/* Hover shimmer sweep */}
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)' }} />

                  <span className={`transition-all duration-200 flex-shrink-0
                    ${isActive ? 'text-[#ff8030]' : 'text-gray-500 group-hover:text-gray-300 group-hover:scale-110'}`}
                    style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(255,123,0,0.5))' } : {}}>
                    <Icon className="h-[17px] w-[17px]" />
                  </span>

                  <span className="flex-1 tracking-[0.01em]">{item.label}</span>

                  {item.badgeCount !== undefined && item.badgeCount > 0 ? (
                    <span
                      className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-white text-[11px] font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #ff7b00, #ff4500)',
                        boxShadow: '0 0 10px rgba(255,100,0,0.45)',
                      }}
                    >
                      {item.badgeCount > 99 ? '99+' : item.badgeCount}
                    </span>
                  ) : item.highlight ? (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff7b00] opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff7b00]" />
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* ROLE / PLAN */}
      <div className="relative z-10 px-4 py-4">
        <div
          className="rounded-xl px-4 py-3.5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,123,0,0.08) 0%, rgba(124,58,237,0.06) 100%)',
            border: '1px solid rgba(255,123,0,0.15)',
            boxShadow: '0 2px 16px rgba(255,100,0,0.08)',
          }}
        >
          {/* Subtle gradient blob */}
          <div className="pointer-events-none absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-20"
               style={{ background: 'radial-gradient(circle, #ff7b00, transparent 70%)' }} />

          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">Aktif Rol</p>

          <div className="text-white font-semibold text-sm tracking-wide">
            {isAdmin ? (
              <span className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full"
                      style={{ background: 'linear-gradient(135deg,#ff7b00,#ff4500)', boxShadow: '0 0 8px rgba(255,100,0,0.4)' }}>
                  <Shield className="w-3 h-3 text-white" />
                </span>
                <span>Admin</span>
              </span>
            ) : (
              <span className="bg-gradient-to-r from-[#ffaa55] to-[#ff6600] bg-clip-text text-transparent">
                {primaryRoleLabel}
              </span>
            )}
          </div>

          {!isAdmin && roleLabels.length > 1 && (
            <p className="mt-1.5 text-[11px] text-gray-500 leading-relaxed">
              {roleLabels.slice(1).join(' • ')}
            </p>
          )}

          {isAdmin && (
            <p className="mt-1.5 text-[11px] font-medium leading-relaxed"
               style={{ color: '#ff9040' }}>
              Tüm özelliklere erişim
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}
