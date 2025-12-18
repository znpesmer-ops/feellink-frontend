'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Home, Compass, FileText, Bell, User } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import { initSocket } from '@/lib/socket'

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, accessToken } = useAuthStore()
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread notification count and setup socket
  useEffect(() => {
    if (!accessToken) return

    // Fetch initial count
    api.get('/notifications/unread-count')
      .then((response) => setUnreadCount(response.data.count))
      .catch(() => {})

    // Setup socket connection for real-time notifications
    const socket = initSocket(accessToken)

    socket.on('notification', () => {
      setUnreadCount((prev) => prev + 1)
      api.get('/notifications/unread-count')
        .then((response) => setUnreadCount(response.data.count))
        .catch(() => {})
    })

    return () => {
      socket.off('notification')
    }
  }, [accessToken])

  if (!accessToken) {
    return null
  }

  const navItems = [
    { href: '/feed', icon: Home, label: 'Ana Sayfa' },
    { href: '/explore', icon: Compass, label: 'Keşfet' },
    { href: '/articles', icon: FileText, label: 'Yazılar' },
    { href: '/notifications', icon: Bell, label: 'Bildirimler', hasNotification: unreadCount > 0 },
    { href: '/profile/me', icon: User, label: 'Profil' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-t border-gray-200/70 dark:border-white/10 z-50 transition-colors shadow-lg">
      <div className="flex justify-around items-center h-16 px-4 py-2">
        {navItems.map((item) => {
          // Profil için özel kontrol
          let isActive = false
          if (item.href.startsWith('/profile/')) {
            isActive = pathname?.startsWith('/profile/')
          } else {
            isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          }
          const Icon = item.icon
          const hasNotification = item.hasNotification || false
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all min-w-[44px] ${
                isActive
                  ? 'text-[#ff7b00] bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900'
              }`}
              title={item.label}
            >
              <Icon 
                size={24} 
                strokeWidth={isActive ? 2.5 : 2}
                className={hasNotification && !isActive ? 'text-[#ff7b00] animate-pulse' : ''}
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}


