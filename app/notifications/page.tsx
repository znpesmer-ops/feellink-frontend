'use client'

import { useEffect, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { initSocket, getSocket, disconnectSocket } from '@/lib/socket'
import { AuthGuard } from '@/lib/auth-guard'

function NotificationsContent() {
  const router = useRouter()
  const { accessToken, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [unreadCount, setUnreadCount] = useState(0)

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
      return response.data
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined
      return allPages.length * 20
    },
    enabled: !!accessToken,
  })

  // Fetch unread count
  useEffect(() => {
    if (accessToken) {
      api.get('/notifications/unread-count').then((response) => {
        setUnreadCount(response.data.count)
      })
    }
  }, [accessToken])

  // Socket connection for real-time notifications
  useEffect(() => {
    if (!accessToken) {
      router.push('/login')
      return
    }

    const socket = initSocket(accessToken)

    socket.on('notification', (notification) => {
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

      // Increment unread count
      setUnreadCount((prev) => prev + 1)
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
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const notifications = data?.pages.flatMap((page) => page) || []

  // Group notifications by date
  const groupedNotifications = notifications.reduce((acc: any, notification: any) => {
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return '❤️'
      case 'comment':
        return '💬'
      case 'follow':
        return '➕'
      case 'follow_request':
        return '📥'
      case 'follow_accept':
        return '✅'
      default:
        return '🔔'
    }
  }

  const getNotificationText = (notification: any) => {
    switch (notification.type) {
      case 'like':
        return `gönderini beğendi`
      case 'comment':
        return `gönderine yorum yaptı`
      case 'follow':
        return `seni takip etti`
      case 'follow_request':
        return `takip isteği gönderdi`
      case 'follow_accept':
        return `takip isteğini kabul etti`
      default:
        return 'yeni bildirim gönderdi'
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
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Tümünü okundu işaretle
          </button>
        )}
      </div>

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
                    className={`p-4 rounded-lg border flex items-start space-x-3 cursor-pointer transition-colors ${
                      !notification.isRead 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead(notification.id)
                      }
                    }}
                  >
                    <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {notification.user?.username || notification.fromUserId || 'Birisi'}
                        </span>
                        <span className="text-gray-900 dark:text-gray-100">{getNotificationText(notification)}</span>
                      </div>
                      {(notification.postId || notification.payload?.postId) && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gönderiyi görüntüle →</p>
                      )}
                      {notification.type === 'follow_request' && notification.fromUserId && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                // Optimistic update: remove notification from UI immediately
                                queryClient.setQueryData(['notifications'], (oldData: any) => {
                                  if (!oldData) return oldData
                                  return {
                                    ...oldData,
                                    pages: oldData.pages.map((page: any) =>
                                      page.filter((n: any) => 
                                        !(n.type === 'follow_request' && n.fromUserId === notification.fromUserId)
                                      )
                                    ),
                                  }
                                })
                                
                                await api.post(`/follow/request/${notification.fromUserId}/accept`)
                                
                                // Refresh data to ensure sync
                                queryClient.invalidateQueries({ queryKey: ['notifications'] })
                                queryClient.invalidateQueries({ queryKey: ['profile'] })
                              } catch (error: any) {
                                // Revert on error
                                queryClient.invalidateQueries({ queryKey: ['notifications'] })
                                console.error('Accept error:', error)
                                alert(error.response?.data?.message || 'İstek kabul edilemedi')
                              }
                            }}
                            className="px-3 py-1.5 bg-[#ff7b00] text-white text-sm rounded-lg hover:bg-[#e36f00] transition-colors font-medium"
                          >
                            Kabul Et
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                // Optimistic update: remove notification from UI immediately
                                queryClient.setQueryData(['notifications'], (oldData: any) => {
                                  if (!oldData) return oldData
                                  return {
                                    ...oldData,
                                    pages: oldData.pages.map((page: any) =>
                                      page.filter((n: any) => 
                                        !(n.type === 'follow_request' && n.fromUserId === notification.fromUserId)
                                      )
                                    ),
                                  }
                                })
                                
                                await api.post(`/follow/request/${notification.fromUserId}/reject`)
                                
                                // Refresh data to ensure sync
                                queryClient.invalidateQueries({ queryKey: ['notifications'] })
                              } catch (error: any) {
                                // Revert on error
                                queryClient.invalidateQueries({ queryKey: ['notifications'] })
                                console.error('Reject error:', error)
                                alert(error.response?.data?.message || 'İstek reddedilemedi')
                              }
                            }}
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                          >
                            Reddet
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(notification.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-[#ff7b00] rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-2">Henüz bildirim yok</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">
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


