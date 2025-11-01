import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationUser {
  id: string
  username: string
  fullName?: string | null
  avatar?: string | null
  isVerified?: boolean
}

interface Notification {
  id: string
  type: string
  message?: string | null
  fromUserId?: string | null
  postId?: string | null
  commentId?: string | null
  isRead: boolean
  createdAt: string
  user?: NotificationUser | null
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  addNotification: (notification: Notification) => void
  setNotifications: (notifications: Notification[]) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  setUnreadCount: (count: number) => void
  incrementUnreadCount: () => void
  setIsLoading: (loading: boolean) => void
  clearNotifications: () => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      
      addNotification: (notification) =>
        set((state) => {
          // Duplicate kontrolü - aynı bildirim zaten varsa ekleme
          if (state.notifications.some((n) => n.id === notification.id)) {
            return state
          }
          
          return {
            notifications: [notification, ...state.notifications].slice(0, 50), // Son 50 bildirim
            unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
          }
        }),
      
      setNotifications: (notifications) =>
        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.isRead).length,
        }),
      
      markAsRead: (notificationId) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),
      
      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        })),
      
      setUnreadCount: (count) =>
        set({ unreadCount: count }),
      
      incrementUnreadCount: () =>
        set((state) => ({ unreadCount: state.unreadCount + 1 })),
      
      setIsLoading: (loading) =>
        set({ isLoading: loading }),
      
      clearNotifications: () =>
        set({ notifications: [], unreadCount: 0 }),
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 20), // Sadece son 20 bildirimi sakla
      }),
    }
  )
)

