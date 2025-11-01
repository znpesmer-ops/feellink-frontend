'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
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
    { href: '/feed', icon: '🏠', label: 'Home' },
    { href: '/explore', icon: '🔍', label: 'Explore' },
    { href: '/articles', icon: '📝', label: 'Articles' },
    { href: '/notifications', icon: '🔔', label: 'Notifications', badge: unreadCount },
    { href: `/profile/${user?.username}`, icon: '👤', label: 'Profile' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-900 z-50 transition-colors">
      <div className="flex justify-around items-center h-16">
        
        {navItems.map((item) => {
          // Profil için özel kontrol
          let isActive = false
          if (item.href.startsWith('/profile/')) {
            isActive = pathname?.startsWith('/profile/')
          } else {
            isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-[#ff7b00] bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900'
              }`}
              title={item.label}
            >
              <span className="text-2xl">{item.icon}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute top-1 right-1 bg-[#ff7b00] rounded-full w-2.5 h-2.5"></span>
              )}
              <span className="text-xs mt-1 hidden md:block">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}


