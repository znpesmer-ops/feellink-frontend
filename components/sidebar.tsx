'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, User, Bell, Settings, MessageSquare, FileText } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { initSocket } from '@/lib/socket'

export function Sidebar() {
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
    { name: 'Ana Sayfa', href: '/feed', icon: Home },
    { name: 'Keşfet', href: '/explore', icon: Compass },
    { name: 'Mesajlar', href: '/messages', icon: MessageSquare },
    { name: 'Yazılar', href: '/articles', icon: FileText },
    { name: 'Profil', href: `/profile/${user?.username || ''}`, icon: User },
    { name: 'Bildirimler', href: '/notifications', icon: Bell, badge: unreadCount },
    { name: 'Ayarlar', href: '/settings', icon: Settings },
  ]

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-900 shadow-sm flex-col items-start py-8 px-4 z-40 transition-colors">
      {/* Logo */}
      <div className="mb-10 px-3">
        <Link href="/feed" className="block">
          <h1 className="text-2xl font-bold text-[#ff7b00] tracking-wide hover:opacity-80 transition-opacity">
            Feellink
          </h1>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-3 w-full">
        {navItems.map(({ name, href, icon: Icon }) => {
          // Profile için özel kontrol (dinamik username ile)
          let isActive = false
          if (name === 'Profil') {
            isActive = pathname?.startsWith('/profile/')
          } else {
            isActive = pathname === href || pathname?.startsWith(href + '/')
          }
          
          return (
            <Link
              key={name}
              href={href}
              className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20 text-[#ff7b00]'
                  : 'text-[#1f1f1f] dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900'
              }`}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.75}
                className={isActive ? 'text-[#ff7b00]' : 'text-gray-500 dark:text-gray-400'}
              />
              <span>{name}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

