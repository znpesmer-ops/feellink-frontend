'use client'

import { useEffect, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { initSocket, getSocket, disconnectSocket } from '@/lib/socket'
import { AuthGuard } from '@/lib/auth-guard'
import { MessageCircle, Heart, CornerDownRight, BellOff, UserPlus, UserCheck, Bell, Calendar, MessageSquare } from 'lucide-react'
import UserBadge from '@/components/UserBadge'
import { ProRoleBadge } from '@/components/ProRoleBadge'

function NotificationsContent() {
  const router = useRouter()
  const { accessToken, user, unreadCount, setUnreadCount, refreshUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'unread' | 'comment' | 'reply'>('all')
  
  // 🔥 Profil güncellemesi sonrası user state'ini yenile
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
  }, [accessToken, refreshUser])

  // 🔥 Bildirimler sayfasına girildiğinde tüm bildirimleri okundu olarak işaretle
  // Kullanıcı bildirime bakana kadar dot gitmesin - sayfa açıldığında okundu olarak işaretle
  useEffect(() => {
    if (!accessToken) return

    let hasMarkedAsRead = false // Sadece bir kez çalışması için flag

    // Sayfa mount olduğunda tüm okunmamış bildirimleri okundu olarak işaretle
    const markAllAsReadOnMount = async () => {
      if (hasMarkedAsRead) return // Zaten işaretlendiyse tekrar çalıştırma
      
      try {
        // Okunmamış bildirim sayısını kontrol et
        const unreadResponse = await api.get('/notifications/unread-count')
        const currentUnreadCount = unreadResponse.data.count || 0
        
        // Sadece okunmamış bildirimler varsa işaretle
        if (currentUnreadCount > 0) {
          await api.put('/notifications/read-all')
          // Store'dan unreadCount'ı güncelle
          setUnreadCount(0)
          // Query'yi invalidate et
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
          hasMarkedAsRead = true
          console.log('[Notifications] ✅ Tüm bildirimler okundu olarak işaretlendi')
        }
      } catch (error) {
        console.warn('[Notifications] Failed to mark all as read on mount:', error)
      }
    }

    // Kısa bir gecikme ile çalıştır (sayfa yüklenmesini bekle)
    const timer = setTimeout(() => {
      markAllAsReadOnMount()
    }, 1000) // 1 saniye bekle (sayfa tam yüklensin)

    return () => {
      clearTimeout(timer)
    }
  }, [accessToken, queryClient, setUnreadCount]) // Sadece sayfa mount olduğunda bir kez çalış

  // Infinite scroll notifications query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      params.append('limit', '20')
      if (pageParam) {
        params.append('offset', pageParam.toString())
      }
      const response = await api.get(`/notifications?${params.toString()}`)
      // Backend artık { notifications, unreadCount } döndürüyor
      const result = response.data
      if (result.unreadCount !== undefined) {
        setUnreadCount(result.unreadCount)
      }
      // Eski format için geriye uyumluluk - direkt notifications array'ini döndür
      return result.notifications || result
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // lastPage artık notifications array'i (veya eski format için direkt array)
      const notifications = Array.isArray(lastPage) ? lastPage : (lastPage.notifications || [])
      if (notifications.length < 20) return undefined
      return allPages.length * 20
    },
    enabled: !!accessToken,
    staleTime: 0, // Her zaman fresh data çek
    refetchOnMount: true, // Mount olduğunda refetch et
    refetchOnWindowFocus: true, // Window focus'ta refetch et
  })

  // ✅ Bildirimler yüklendiğinde unreadCount'ı güncelle
  useEffect(() => {
    if (accessToken && data) {
      // İlk sayfadan unreadCount'ı al
      const firstPage = data.pages[0]
      if (firstPage?.unreadCount !== undefined) {
        setUnreadCount(firstPage.unreadCount)
      } else {
        // Fallback: API'den çek
        api.get('/notifications/unread-count').then((response) => {
          setUnreadCount(response.data.count)
        })
      }
    }
  }, [accessToken, data, setUnreadCount])

  // Socket connection for real-time notifications
  useEffect(() => {
    if (!accessToken) {
      router.push('/login')
      return
    }

    const socket = initSocket(accessToken)

    socket.on('notification', (notification) => {
      // If it's a follow_request_cancelled event, remove the notification from the list
      if (notification.type === 'follow_request_cancelled') {
        queryClient.setQueryData(['notifications'], (old: any) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page: any[]) =>
              page.filter((n: any) =>
                !(n.type === 'follow_request' && n.fromUserId === notification.fromUserId)
              )
            ),
          }
        })
        // Decrement unread count if there was an unread notification (store'dan)
        setUnreadCount(Math.max(0, unreadCount - 1))
        return
      }

      // Add new notification to the beginning of the list
      queryClient.setQueryData(['notifications'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: [
            [notification, ...old.pages[0]],
            ...old.pages.slice(1),
          ],
        }
      })

      // Increment unread count (store'dan)
      setUnreadCount(unreadCount + 1)
    })

    socket.on('connect', () => {
      console.log('Socket connected for notifications')
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    return () => {
      socket.off('notification')
      socket.off('connect')
      socket.off('disconnect')
    }
  }, [accessToken, router, queryClient])

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Mark as read handler
  const markAsRead = async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      // Store'dan güncelle
      setUnreadCount(Math.max(0, unreadCount - 1))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await api.put('/notifications/read-all')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      // Backend'den gelen unreadCount'ı kullan
      if (response.data?.unreadCount !== undefined) {
        setUnreadCount(response.data.unreadCount)
      } else {
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  // Handle accept follow request
  const handleAcceptFollowRequest = async (fromUserId: string) => {
    try {
      await api.post(`/follow/request/${fromUserId}/accept`)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setUnreadCount(Math.max(0, unreadCount - 1))
    } catch (error) {
      console.error('Failed to accept follow request:', error)
      alert('İstek kabul edilemedi. Tekrar deneyin.')
    }
  }

  // Handle reject follow request
  const handleRejectFollowRequest = async (fromUserId: string) => {
    try {
      await api.post(`/follow/request/${fromUserId}/reject`)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setUnreadCount(Math.max(0, unreadCount - 1))
    } catch (error) {
      console.error('Failed to reject follow request:', error)
      alert('İstek reddedilemedi. Tekrar deneyin.')
    }
  }

  // Backend artık { notifications, unreadCount } döndürüyor
  const notifications = data?.pages.flatMap((page) => {
    // Eski format için geriye uyumluluk
    return page.notifications || page
  }) || []

  // Filter notifications (profile_incomplete bildirimini normal listeden çıkar - en üstte sabit gösterilecek)
  const filteredNotifications = notifications.filter((n: any) => {
    // 🔥 KRİTİK: profile_incomplete bildirimini normal listeden çıkar (en üstte gösterilecek)
    // Ayrıca profil tamamlandıysa (profileCompleted: true) veya isRead: true ise hiç gösterme
    if (n.type === 'profile_incomplete') {
      // Profil tamamlandıysa bu bildirimi hiç gösterme
      if (user?.profileCompleted === true) return false
      // isRead: true ise de gösterme (zaten kapatılmış)
      if (n.isRead === true) return false
      return false // Normal listeden çıkar, en üstte gösterilecek
    }
    
    if (filter === 'all') return true
    if (filter === 'unread') return !n.isRead
    if (filter === 'comment') return n.type === 'comment'
    if (filter === 'reply') return n.type === 'reply'
    return true
  })

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((acc: any, notification: any) => {
    const date = new Date(notification.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(notification)
    return acc
  }, {})

  // Format time ago helper
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
      case 'comment_like':
        return <Heart className="w-5 h-5" />
      case 'comment':
        return <MessageCircle className="w-5 h-5" />
      case 'reply':
        return <CornerDownRight className="w-5 h-5" />
      case 'follow':
        return <UserPlus className="w-5 h-5" />
      case 'follow_request':
        return <UserCheck className="w-5 h-5" />
      case 'follow_accept':
        return <UserCheck className="w-5 h-5" />
      case 'event_join':
        return <Calendar className="w-5 h-5" />
      case 'event_comment':
        return <MessageSquare className="w-5 h-5" />
      case 'job_application_received':
      case 'job_application_status_changed':
        return <Bell className="w-5 h-5" />
      case 'profile_incomplete':
        return <Bell className="w-5 h-5" />
      default:
        return <Bell className="w-5 h-5" />
    }
  }
  
  const getNotificationIconColor = (type: string) => {
    switch (type) {
      case 'like':
      case 'comment_like':
        return 'text-brand-orange'
      case 'comment':
        return 'text-blue-500'
      case 'reply':
        return 'text-gray-500'
      case 'follow':
      case 'follow_request':
      case 'follow_accept':
        return 'text-green-500'
      case 'event_join':
      case 'event_comment':
        return 'text-brand-orange'
      case 'profile_incomplete':
        return 'text-orange-500'
      default:
        return 'text-gray-500'
    }
  }
  
  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'like':
      case 'comment_like':
        return 'bg-brand-blue/10 dark:bg-brand-blue/20'
      case 'comment':
        return 'bg-blue-50 dark:bg-blue-500/20'
      case 'reply':
        return 'bg-gray-100 dark:bg-gray-700'
      case 'follow':
      case 'follow_request':
      case 'follow_accept':
        return 'bg-green-50 dark:bg-green-500/20'
      case 'event_join':
      case 'event_comment':
        return 'bg-brand-blue/10 dark:bg-brand-blue/20'
      case 'profile_incomplete':
        return 'bg-orange-50 dark:bg-orange-500/20'
      default:
        return 'bg-gray-50 dark:bg-gray-700'
    }
  }

  const getNotificationBorderColor = (type: string) => {
    switch (type) {
      case 'like':
      case 'comment_like':
        return 'ring-brand-blue/20 border-brand-blue/30 dark:border-brand-blue/40'
      case 'comment':
        return 'ring-blue-500/20 border-blue-500/30 dark:border-blue-500/40'
      case 'reply':
        return 'ring-gray-500/20 border-gray-500/30 dark:border-gray-500/40'
      case 'follow':
      case 'follow_request':
      case 'follow_accept':
        return 'ring-green-500/20 border-green-500/30 dark:border-green-500/40'
      default:
        return 'ring-gray-500/20 border-gray-500/30 dark:border-gray-500/40'
    }
  }

  const getNotificationHoverColor = (type: string) => {
    switch (type) {
      case 'like':
      case 'comment_like':
        return 'hover:bg-brand-blue/10 dark:hover:bg-brand-blue/20'
      case 'comment':
        return 'hover:bg-blue-50/80 dark:hover:bg-blue-500/15'
      case 'reply':
        return 'hover:bg-gray-100/80 dark:hover:bg-gray-800/70'
      case 'follow':
      case 'follow_request':
      case 'follow_accept':
        return 'hover:bg-green-50/80 dark:hover:bg-green-500/15'
      default:
        return 'hover:bg-gray-100/80 dark:hover:bg-gray-800/70'
    }
  }

  const getNotificationText = (notification: any) => {
    switch (notification.type) {
      case 'like':
        return `gönderini beğendi`
      case 'comment_like':
        return `yorumunu beğendi`
      case 'comment':
        return `gönderine yorum yaptı`
      case 'reply':
        return `yorumuna yanıt verdi`
      case 'follow':
        return `seni takip etti`
      case 'follow_request':
        return `takip isteği gönderdi`
      case 'follow_accept':
        return `takip isteğini kabul etti`
      case 'event_join':
        return notification.message || 'etkinliğinize katıldı'
      case 'event_comment':
        return notification.message || 'etkinliğinize yorum yaptı'
      case 'job_application_received':
        return notification.message || 'ilanına başvuru yapıldı'
      case 'job_application_status_changed':
        return notification.message || 'başvuru durumu güncellendi'
      case 'profile_incomplete':
        return notification.message || 'Feellink\'i tam kullanabilmek için bazı bilgilerin eksik.'
      default:
        return notification.message || 'yeni bildirim gönderdi'
    }
  }

  if (!accessToken) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bildirimler</h1>
        <div className="flex gap-2">
          <button
            onClick={markAllAsRead}
            className={`text-sm font-medium px-3 py-1.5 rounded-full transition-all ${
              unreadCount > 0
                ? 'bg-brand-orange text-white hover:bg-brand-orange/90'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
            disabled={unreadCount === 0}
          >
            Tümünü okundu işaretle
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'Tümü' },
          { key: 'unread', label: 'Okunmamış' },
          { key: 'comment', label: 'Yorumlar' },
          { key: 'reply', label: 'Yanıtlar' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
              filter === tab.key
                ? 'bg-brand-orange text-white shadow-md'
                : 'bg-gray-100 dark:bg-[#1b1b1b] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#222]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profil Eksikliği Bildirimi (En Üstte, Sabit) */}
      {/* 🔥 KRİTİK: Sadece profileCompleted false ise göster (tek otorite) */}
      {user && user.profileCompleted === false && (
        <div className="mb-6 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <Bell className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-orange-900 dark:text-orange-200 mb-1">
                🔔 Profilini Tamamla
              </h3>
              <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
                Feellink'i tam kullanabilmek için bazı zorunlu bilgiler eksik.
              </p>
              <button
                onClick={() => router.push('/profile/edit?required=true')}
                className="px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                🧡 Profili Düzenle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, dateNotifications]: [string, any]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase">{date}</h2>
              <div className="space-y-2">
                {dateNotifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border transition-all cursor-pointer animate-fadeIn ${
                      !notification.isRead
                        ? `${getNotificationBgColor(notification.type)} ring-1 ${getNotificationBorderColor(notification.type)} ${getNotificationHoverColor(notification.type)}`
                        : 'bg-gray-50/60 dark:bg-gray-800/50 border-gray-200/70 dark:border-gray-700/40 hover:bg-gray-100/70 dark:hover:bg-gray-800/70'
                    }`}
                    onClick={async () => {
                      if (!notification.isRead) {
                        await markAsRead(notification.id)
                      }
                      
                      // 🔥 KRİTİK: Yönlendirme - öncelik sırası: targetPath > targetUrl > type-based fallback
                      // 1) Eğer bildirimde targetPath varsa → direkt oraya git (EN ÖNCELİKLİ)
                      if (notification.targetPath) {
                        router.push(notification.targetPath)
                        return
                      }
                      
                      // 2) targetUrl varsa onu kullan (geriye uyumluluk)
                      if (notification.targetUrl) {
                        router.push(notification.targetUrl)
                        return
                      }
                      
                      // 3) Fallback - job application bildirimleri için
                      if (notification.type === 'job_application_received') {
                        // targetPath yoksa fallback: public sayfasına git (404 vermez)
                        router.push('/fellink/public')
                        return
                      }
                      
                      if (notification.type === 'job_application_status_changed') {
                        router.push('/fellink/my-applications')
                        return
                      }
                      
                      // 4) Diğer bildirim türleri için mevcut fallback mantığı
                      if (notification.articleId) {
                        const url = `/articles/${notification.articleId}${notification.commentId ? `#cmt-${notification.commentId}` : ""}`
                        router.push(url)
                        return
                      }
                      
                      if (notification.postId) {
                        router.push(`/posts/${notification.postId}`)
                        return
                      }
                      
                      if (notification.sender?.username) {
                        router.push(`/profile/${notification.sender.username}`)
                        return
                      }
                      
                      // 5) En kötü fallback (404 asla vermez)
                      router.push('/fellink/public')
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Kullanıcı Avatar + İkon */}
                      {notification.sender?.username ? (
                        <Link
                          href={`/profile/${notification.sender.username}`}
                          onClick={(e) => e.stopPropagation()}
                          className="relative flex-shrink-0 hover:opacity-80 transition cursor-pointer"
                        >
                          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                            {notification.sender?.avatar ? (
                              <img
                                src={
                                  notification.sender.avatar.startsWith('http')
                                    ? notification.sender.avatar
                                    : `${process.env.NEXT_PUBLIC_CDN}/${notification.sender.avatar}`
                                }
                                alt={notification.sender.username || 'User'}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-600 dark:text-gray-300 font-semibold text-sm">
                                {notification.sender?.username?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            )}
                          </div>
                          {/* İkon - Avatar'ın sağ alt köşesinde */}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${getNotificationBgColor(notification.type)} border-2 border-white dark:border-gray-800 flex items-center justify-center ${getNotificationIconColor(notification.type)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                        </Link>
                      ) : (
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                            <span className="text-gray-600 dark:text-gray-300 font-semibold text-sm">
                              U
                            </span>
                          </div>
                          {/* İkon - Avatar'ın sağ alt köşesinde */}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${getNotificationBgColor(notification.type)} border-2 border-white dark:border-gray-800 flex items-center justify-center ${getNotificationIconColor(notification.type)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>
                      )}

                      {/* İçerik */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1 flex-wrap">
                          {notification.type === 'profile_incomplete' ? (
                            // Sistem bildirimi - sender yok
                            <>
                              <span className="font-semibold text-orange-500 dark:text-orange-400">
                                Profilini Tamamla
                              </span>
                              <span>{getNotificationText(notification)}</span>
                            </>
                          ) : (
                            // Normal bildirim - sender var
                            <>
                              {notification.sender?.username ? (
                                <Link
                                  href={`/profile/${notification.sender.username}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-semibold text-brand-orange dark:text-brand-orange hover:opacity-80 transition cursor-pointer"
                                >
                                  {notification.sender?.fullName || notification.sender?.username || 'Sistem'}
                                </Link>
                              ) : (
                                <span className="font-semibold text-brand-orange dark:text-brand-orange">
                                  {notification.sender?.fullName || notification.sender?.username || 'Sistem'}
                                </span>
                              )}
                              <UserBadge role={notification.sender?.role} />
                              <ProRoleBadge roles={(notification.sender as any)?.roles} plan={(notification.sender as any)?.plan} />
                              <span>{getNotificationText(notification)}</span>
                            </>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                        {/* Profil Tamamlama Butonu */}
                        {notification.type === 'profile_incomplete' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push('/profile/edit?required=true')
                            }}
                            className="mt-2 px-4 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                          >
                            Profili Düzenle
                          </button>
                        )}
                      </div>

                      {/* Action Buttons - Only for follow_request */}
                      {notification.type === 'follow_request' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAcceptFollowRequest(notification.fromUserId)
                            }}
                            className="text-xs bg-brand-orange hover:bg-brand-orange/90 text-white px-4 py-1.5 rounded-lg transition font-medium"
                          >
                            Kabul Et
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRejectFollowRequest(notification.fromUserId)
                            }}
                            className="text-xs bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-1.5 rounded-lg transition font-medium"
                          >
                            Reddet
                          </button>
                        </div>
                      )}

                      {/* Okunmamış göstergesi - Turuncu nokta */}
                      {notification.type !== 'follow_request' && !notification.isRead && (
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-orange flex-shrink-0 mt-2 animate-pulse shadow-sm"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <BellOff className="text-6xl mb-4 opacity-50" />
          <p className="text-lg font-medium">Yeni bildirimin yok</p>
          <p className="text-sm mt-2">
            Beğeni, yorum ve yeni takipçiler geldiğinde burada görünecek.
          </p>
        </div>
      )}

      {/* Load More */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      )}

      {!hasNextPage && notifications.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Tüm bildirimleri gördün! 🎉</p>
        </div>
      )}
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  )
}


