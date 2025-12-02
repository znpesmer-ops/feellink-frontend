'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Bell, Heart, MessageCircle, User, UserPlus } from 'lucide-react'

interface Notification {
  id: string
  userId: string
  type: string
  fromUserId?: string
  postId?: string
  commentId?: string
  isRead: boolean
  createdAt: string
  fromUser?: {
    id: string
    username: string
    fullName?: string
    avatar?: string
  }
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true)
        const response = await api.get('/notifications')
        setNotifications(response.data)
      } catch (err) {
        console.error('Error fetching notifications:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  const formatDate = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = diffInMs / (1000 * 60 * 60)
    const diffInDays = diffInHours / 24

    if (diffInHours < 1) {
      return 'Az önce'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} saat önce`
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)} gün önce`
    } else {
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return { icon: Heart, color: 'text-red-500', bgColor: 'bg-red-50' }
      case 'comment':
        return { icon: MessageCircle, color: 'text-blue-500', bgColor: 'bg-blue-50' }
      case 'follow':
        return { icon: UserPlus, color: 'text-green-500', bgColor: 'bg-green-50' }
      default:
        return { icon: Bell, color: 'text-gray-500', bgColor: 'bg-gray-50' }
    }
  }

  const getNotificationMessage = (notification: Notification) => {
    const fromUser = notification.fromUser?.username || 'Bilinmeyen'
    
    switch (notification.type) {
      case 'like':
        return `${fromUser} gönderinizi beğendi`
      case 'comment':
        return `${fromUser} gönderinize yorum yaptı`
      case 'follow':
        return `${fromUser} sizi takip etmeye başladı`
      case 'follow_request':
        return `${fromUser} sizi takip etmek istiyor`
      case 'follow_accept':
        return `${fromUser} takip isteğinizi kabul etti`
      default:
        return 'Yeni bildirim'
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Bildirimler</h2>
        <p className="text-gray-500">
          Toplam {notifications.length} bildirim • {unreadCount} okunmamış
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {notifications.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <Bell size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Henüz bildirim bulunmuyor</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const { icon: Icon, color, bgColor } = getNotificationIcon(notification.type)
              return (
                <div
                  key={notification.id}
                  className={`px-6 py-4 hover:bg-gray-50 transition-colors duration-150 ${
                    !notification.isRead ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${bgColor}`}>
                      <Icon className={color} size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-800">
                          {getNotificationMessage(notification)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}





















