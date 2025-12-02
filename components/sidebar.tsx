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
  Ticket,
  Sparkles,
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
  const { user, capabilities, accessToken, sidebar } = useAuthStore()
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)

  useEffect(() => {
    if (!accessToken) return

    api
      .get('/notifications/unread-count')
      .then((response) => setUnreadCount(response.data.count))
      .catch(() => {})

    const socket = initSocket(accessToken)
    socket.on('notification', () => {
      api
        .get('/notifications/unread-count')
        .then((response) => setUnreadCount(response.data.count))
        .catch(() => {})
    })

    return () => {
      socket.off('notification')
    }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    const chatSocket = initChatSocket(accessToken)
    chatSocket.on('new_message', () => {
      if (pathname !== '/messages') {
        setHasUnreadMessages(true)
      }
    })
    return () => {
      chatSocket.off('new_message')
    }
  }, [accessToken, pathname])

  useEffect(() => {
    if (pathname === '/messages') {
      setHasUnreadMessages(false)
    }
  }, [pathname])

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
            showEvents: Boolean(capabilities.sidebar?.myEvents || capabilities.sidebar?.createEvent),
            showCollections: Boolean(
              capabilities.sidebar?.collections || capabilities.sidebar?.manageCollections
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
    
    // 🔥 KRİTİK: Her zaman /profile/me kullan - user.id undefined sorununu önler
    // Backend otomatik olarak authenticated user'ı bulur
    const profileHref = '/profile/me'

    const items: NavItem[] = [
      { key: 'home', label: 'Ana Sayfa', href: '/feed', icon: Home, flag: 'showFeed' },
      { key: 'explore', label: 'Keşfet', href: '/explore', icon: Compass, flag: 'showExplore' },
      {
        key: 'listings',
        label: 'Feellink',
        href: '/fellink/public',
        icon: Sparkles,
        // ❗ FEELLINK her zaman görünür - flag yok, rol kontrolü yok
      },
      {
        key: 'messages',
        label: 'Mesajlar',
        href: '/messages',
        icon: MessageSquare,
        flag: 'showMessages',
        highlight: hasUnreadMessages,
      },
      { key: 'profile', label: 'Profil', href: profileHref, icon: User, flag: 'showProfile' },
      { key: 'analytics', label: 'Analizler', href: '/analytics', icon: BarChart3 },
      { key: 'collections', label: 'Koleksiyonlar', href: '/collections', icon: Layers, flag: 'showCollections' },
      { key: 'events', label: 'Etkinlikler', href: '/events', icon: Calendar }, // Her zaman görünür - flag yok
      { key: 'tickets', label: 'Biletlerim', href: '/my-tickets', icon: Ticket, flag: 'showTickets' },
      { key: 'notifications', label: 'Bildirimler', href: '/notifications', icon: Bell, badgeCount: unreadCount },
      { key: 'settings', label: 'Ayarlar', href: '/settings', icon: Settings },
    ]

    // FEELLINK her zaman görünür - diğer menüler flag kontrolünden geçer
    return items.filter((item) => {
      // FEELLINK menüsü her zaman görünür (flag yok)
      if (item.key === 'listings') return true
      if (!item.flag) return true
      return sidebarFlags[item.flag]
    })
  }, [user, capabilities, sidebar, unreadCount, hasUnreadMessages])

  if (!accessToken || !user || !capabilities) {
    return null
  }

  if (pathname === '/select-role') {
    return null
  }

  const activeRoute = pathname
  const planLabel =
    capabilities.plan === 'PRO' ? 'Pro' : capabilities.plan === 'ORI' ? 'Ori' : 'Free'
  const resolvedRoles =
    (capabilities.roles && capabilities.roles.length > 0
      ? capabilities.roles
      : user?.roles) ?? []
  const normalizedRoles = resolvedRoles.map((role) => normalizeRole(role))
  const roleLabels = normalizedRoles
    .map((role) => ROLE_METADATA[role]?.label)
    .filter(Boolean) as string[]
  const primaryRoleLabel = roleLabels[0] ?? ROLE_METADATA.art_lover.label
  return (
    <aside className={`${forceVisible ? 'flex' : 'hidden lg:flex'} ${forceVisible ? '' : 'fixed'} inset-y-0 left-0 w-64 bg-white dark:bg-gray-950 border-r border-gray-200/70 dark:border-white/10 shadow-sm`}>
      <div className="flex flex-col h-full w-full">
        {!forceVisible && (
          <div className="flex items-center h-16 border-b border-gray-100 dark:border-gray-800 px-6">
            <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Feellink</p>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeRoute === item.href || activeRoute.startsWith(`${item.href}/`)
              const Icon = item.icon
              const baseClasses =
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors'
              const defaultState =
                'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'
              const feellinkState =
                'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              const inactiveClasses = item.key === 'listings' ? feellinkState : defaultState

              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={onLinkClick}
                    className={`${baseClasses} ${
                      isActive
                        ? 'bg-brand-blue/10 text-brand-orange'
                        : inactiveClasses
                    }`}
                  >
                    <Icon 
                      className={`h-4 w-4 ${
                        item.key === 'notifications' && 
                        item.badgeCount !== undefined && 
                        item.badgeCount > 0 && 
                        !isActive
                          ? 'text-brand-orange animate-pulse'
                          : ''
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.highlight && (
                      <span className="inline-flex h-2 w-2 rounded-full bg-brand-orange"></span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-gray-200/70 dark:border-white/10 px-6 py-5 text-sm text-gray-500 dark:text-gray-400">
          <p className="font-medium text-gray-900 dark:text-white">Aktif Rol</p>
          <div className="mt-3 text-gray-900 dark:text-white font-semibold tracking-wide">
            {primaryRoleLabel} — {planLabel.toUpperCase()} PLAN
          </div>
          {roleLabels.length > 1 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {roleLabels.slice(1).join(' • ')}
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}

