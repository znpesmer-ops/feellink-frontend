'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { useNotificationStore } from '@/lib/store-notifications'
import { SearchResults } from './search-results'
import api from '@/lib/api'
import { useTheme } from '@/lib/theme-context'
import { Heart, MessageCircle, UserPlus, MessageSquare, Bell } from 'lucide-react'
import { initSocket } from '@/lib/socket'

interface SearchUser {
  id: string
  username: string
  fullName?: string | null
  avatar?: string | null
  isVerified?: boolean
}

export function Header() {
  const router = useRouter()
  const { user, accessToken, refreshToken, clearAuth } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const { notifications, unreadCount, markAllAsRead, setIsLoading: setNotificationsLoading, isLoading: notificationsLoading, addNotification, incrementUnreadCount } = useNotificationStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close search, menu and notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Bildirimleri yükle ve socket bağlantısı
  useEffect(() => {
    if (!accessToken) return

    const loadNotifications = async () => {
      try {
        setNotificationsLoading(true)
        const response = await api.get('/notifications', {
          params: { limit: 20, offset: 0 },
        })
        useNotificationStore.getState().setNotifications(response.data)
        
        // Unread count'u da güncelle
        const unreadResponse = await api.get('/notifications/unread-count')
        useNotificationStore.getState().setUnreadCount(unreadResponse.data.count)
      } catch (error) {
        console.error('Failed to load notifications:', error)
      } finally {
        setNotificationsLoading(false)
      }
    }

    loadNotifications()

    // 🔔 Socket bağlantısı - gerçek zamanlı bildirimler
    const socket = initSocket(accessToken)

        socket.on('notification', (notification) => {
          // Bildirim store'a ekle
          addNotification(notification)
          // Unread count'u artır
          incrementUnreadCount()
          console.log('🔔 New notification received:', notification)
        })

        // 🔔 Bildirimin okundu durumunu gerçek zamanlı güncelle
        socket.on('notificationRead', (data: { notificationId: string; userId: string }) => {
          if (data.userId === user?.id) {
            // Store'da bildirimi okundu olarak işaretle
            useNotificationStore.getState().markAsRead(data.notificationId)
            console.log('✅ Notification marked as read via socket:', data.notificationId)
          }
        })

        socket.on('connect', () => {
          console.log('✅ Socket connected for notifications')
        })

        socket.on('disconnect', () => {
          console.log('❌ Socket disconnected')
        })

        return () => {
          socket.off('notification')
          socket.off('notificationRead')
          socket.off('connect')
          socket.off('disconnect')
        }
  }, [accessToken, setNotificationsLoading, addNotification, incrementUnreadCount])

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      markAllAsRead()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'şimdi'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dk önce`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} sa önce`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`
    
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  }

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearchOpen(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await api.get<SearchUser[]>('/search/users', {
          params: { q: searchQuery.trim(), limit: 10 },
        })
        setSearchResults(response.data)
        setIsSearchOpen(true)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleUserSelect = (username: string) => {
    setSearchQuery('')
    setIsSearchOpen(false)
    router.push(`/profile/${username}`)
  }

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken })
      }
    } catch (error) {
      console.warn('Logout error:', error)
    } finally {
      clearAuth()
      setIsMenuOpen(false)
      router.push('/login')
    }
  }

  if (!accessToken) {
    return null
  }

  return (
    <header className="fixed top-0 left-60 right-0 h-16 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 shadow-sm flex items-center justify-between px-6 z-50 transition-colors">
      {/* Sol taraf - Hoş geldin mesajı */}
      <div className="text-base font-medium text-[#1f1f1f] dark:text-gray-100">
        Hoş geldin, <span className="text-[#ff7b00] font-semibold">{user?.username}</span>
      </div>

      {/* Orta - Search Box */}
      <div ref={searchRef} className="relative flex-1 max-w-xl mx-8">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Kullanıcı ara..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchQuery && setIsSearchOpen(true)}
            className="w-full px-4 py-2 pl-10 pr-4 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/20 focus:border-[#ff7b00]/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          {isLoading && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <div className="w-4 h-4 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && (
          <SearchResults
            results={searchResults}
            onSelect={handleUserSelect}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Sağ taraf - Bildirim + Theme Toggle + Profil */}
      <div className="flex items-center gap-4">
          {/* Bildirim Butonu */}
          <div ref={notificationRef} className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsNotificationOpen(!isNotificationOpen)
              }}
              className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors focus:outline-none"
              aria-label="Bildirimler"
            >
              <Bell
                size={24}
                className="text-gray-700 dark:text-gray-300 hover:text-[#ff7b00] transition-colors"
              />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#ff7b00] border-2 border-white dark:border-gray-950 animate-pulse"></span>
              )}
            </button>

            {/* Bildirim Dropdown - Cam Efektli */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-3 w-[320px] bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/70 dark:border-white/10 overflow-hidden z-[9999] flex flex-col animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between bg-white/40 dark:bg-[#1a1a1a]/40">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Bildirimler</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs font-medium text-[#ff7b00] hover:underline transition-colors"
                    >
                      Tümünü okundu işaretle
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto flex-1 max-h-[300px] pr-1">
                  {notificationsLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#ff7b00] mx-auto"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Henüz bildirimin yok.</p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-2">
                      {notifications.map((notification) => {
                        // Bildirim türüne göre ikon, renk ve link belirle
                        let icon, iconColor, link, bgColor
                        
                        switch (notification.type) {
                          case 'like':
                            icon = <Heart className="w-5 h-5" />
                            iconColor = 'text-red-500'
                            bgColor = 'bg-red-50 dark:bg-red-900/20'
                            // Gönderiye yönlendir (eğer postId varsa)
                            if (notification.postId) {
                              link = `/posts/${notification.postId}`
                            } else {
                              link = '/feed'
                            }
                            break
                          case 'comment':
                            icon = <MessageCircle className="w-5 h-5" />
                            iconColor = 'text-blue-500'
                            bgColor = 'bg-blue-50 dark:bg-blue-900/20'
                            // Gönderiye yönlendir
                            if (notification.postId) {
                              link = `/posts/${notification.postId}`
                            } else {
                              link = '/feed'
                            }
                            break
                          case 'follow':
                          case 'follow_request':
                            icon = <UserPlus className="w-5 h-5" />
                            iconColor = 'text-green-500'
                            bgColor = 'bg-green-50 dark:bg-green-900/20'
                            // Profile yönlendir
                            link = `/profile/${notification.user?.username || notification.fromUserId}`
                            break
                          case 'follow_accept':
                            icon = <UserPlus className="w-5 h-5" />
                            iconColor = 'text-green-500'
                            bgColor = 'bg-green-50 dark:bg-green-900/20'
                            // Profil sahibine yönlendir
                            link = `/profile/${notification.user?.username || notification.fromUserId}`
                            break
                          case 'message':
                            icon = <MessageSquare className="w-5 h-5" />
                            iconColor = 'text-[#ff7b00]'
                            bgColor = 'bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20'
                            // Mesajlara yönlendir
                            link = '/messages'
                            break
                          case 'mention':
                            icon = <MessageCircle className="w-5 h-5" />
                            iconColor = 'text-[#ff7b00]'
                            bgColor = 'bg-orange-50 dark:bg-orange-500/20'
                            // Gönderiye yönlendir (mention yorumu olduğu için)
                            if (notification.postId) {
                              link = `/posts/${notification.postId}`
                            } else {
                              link = '/feed'
                            }
                            break
                          default:
                            icon = <Bell className="w-5 h-5" />
                            iconColor = 'text-gray-500'
                            bgColor = 'bg-gray-50 dark:bg-gray-700'
                            link = '#'
                        }

                        return (
                          <div
                            key={notification.id}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              
                              console.log('📬 Bildirim tıklandı:', {
                                type: notification.type,
                                postId: notification.postId,
                                link,
                                fromUserId: notification.fromUserId,
                              })
                              
                              // Bildirimi okundu işaretle
                              if (!notification.isRead) {
                                useNotificationStore.getState().markAsRead(notification.id)
                                api.put(`/notifications/${notification.id}/read`).catch(console.error)
                              }
                              
                              // Dropdown'u kapat
                              setIsNotificationOpen(false)
                              
                              // Yönlendirme - küçük bir gecikme ile (dropdown animasyonu için)
                              if (link && link !== '#') {
                                console.log('🔄 Yönlendiriliyor:', link)
                                setTimeout(() => {
                                  router.push(link)
                                }, 100)
                              } else {
                                console.warn('⚠️ Geçersiz link:', link)
                              }
                            }}
                            className={`p-3 rounded-lg border transition-all cursor-pointer ${
                              !notification.isRead
                                ? `${bgColor} ring-1 ring-[#ff7b00]/20 border-[#ff7b00]/30 dark:border-[#ff7b00]/40 hover:bg-orange-50/80 dark:hover:bg-orange-500/15`
                                : 'bg-gray-50/60 dark:bg-gray-800/50 border-gray-200/70 dark:border-gray-700/40 hover:bg-gray-100/70 dark:hover:bg-gray-800/70'
                            }`}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                e.currentTarget.click()
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              {/* Kullanıcı Avatar + İkon */}
                              <div className="relative flex-shrink-0">
                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                  {notification.user?.avatar ? (
                                    <img
                                      src={notification.user.avatar}
                                      alt={notification.user.username || 'User'}
                                      className="w-full h-full rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-gray-600 dark:text-gray-300 font-semibold text-sm">
                                      {notification.user?.username?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                  )}
                                </div>
                                {/* İkon - Avatar'ın sağ alt köşesinde */}
                                <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${bgColor} border-2 border-white dark:border-gray-800 flex items-center justify-center ${iconColor}`}>
                                  {icon}
                                </div>
                              </div>

                              {/* İçerik */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 dark:text-gray-100">
                                  <span className="font-semibold">
                                    {notification.user?.fullName || notification.user?.username || 'Birisi'}
                                  </span>{' '}
                                      {notification.message || 
                                        (notification.type === 'like' ? 'gönderini beğendi' :
                                         notification.type === 'comment' ? 'yorum yaptı' :
                                         notification.type === 'mention' ? 'seni bir yorumda etiketledi' :
                                         notification.type === 'follow' ? 'seni takip etti' :
                                         notification.type === 'follow_request' ? 'seni takip etmek istiyor' :
                                         notification.type === 'follow_accept' ? 'takip isteğini kabul etti' :
                                         notification.type === 'message' ? 'sana mesaj gönderdi' : 'bir etkinlik gerçekleştirdi')}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {formatTimeAgo(notification.createdAt)}
                                </p>
                              </div>

                                  {/* Okunmamış göstergesi - Turuncu nokta */}
                                  {!notification.isRead && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff7b00] flex-shrink-0 mt-2 animate-pulse shadow-sm"></div>
                                  )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                {/* Alt link - Tüm bildirimleri gör */}
                {notifications.length > 0 && (
                  <div className="px-4 py-3 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/40 dark:bg-[#1a1a1a]/40 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsNotificationOpen(false)
                        router.push('/notifications')
                      }}
                      className="text-xs font-semibold text-[#ff7b00] hover:underline transition-colors"
                    >
                      Tüm bildirimleri gör →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          {/* Profile Menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center space-x-2 group hover:opacity-80 transition-opacity focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-[#ff7b00] flex items-center justify-center text-white font-semibold text-sm overflow-hidden ring-2 ring-transparent group-hover:ring-[#ff7b00]/20 transition-all">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <Link
                  href={`/profile/${user?.username || ''}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span>Profilim</span>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Çıkış Yap</span>
                </button>
              </div>
            )}
          </div>
      </div>
    </header>
  )
}

