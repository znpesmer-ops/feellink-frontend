'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Users, FileText, Heart, MessageCircle, Bell } from 'lucide-react'

interface Stats {
  users: number
  posts: number
  follows: number
  comments: number
  likes: number
  notifications: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        
        // Fetch stats from backend with individual error handling
        const fetchSafely = async (apiCall: () => Promise<any>) => {
          try {
            return await apiCall()
          } catch (err) {
            return { data: [] }
          }
        }

        const [usersRes, postsRes, notificationsRes] = await Promise.all([
          fetchSafely(() => api.get('/users/search?q=')),
          fetchSafely(() => api.get('/explore/recent')),
          fetchSafely(() => api.get('/notifications')),
        ])

        // Calculate stats from responses
        const userCount = usersRes.data?.length || 0
        const postCount = postsRes.data?.length || 0
        const notificationCount = notificationsRes.data?.length || 0

        setStats({
          users: userCount,
          posts: postCount,
          follows: 0, // Would need specific endpoint
          comments: 0, // Would need specific endpoint
          likes: 0, // Would need specific endpoint
          notifications: notificationCount,
        })
      } catch (err: any) {
        console.error('Error fetching stats:', err)
        setError('Veriler yüklenirken bir hata oluştu')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const cardData = [
    {
      title: 'Toplam Kullanıcı',
      value: stats?.users || 0,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Toplam Gönderi',
      value: stats?.posts || 0,
      icon: FileText,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Toplam Takipler',
      value: stats?.follows || 0,
      icon: Users,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Toplam Yorum',
      value: stats?.comments || 0,
      icon: MessageCircle,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    {
      title: 'Toplam Beğeni',
      value: stats?.likes || 0,
      icon: Heart,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
    },
    {
      title: 'Toplam Bildirim',
      value: stats?.notifications || 0,
      icon: Bell,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 text-center">
          <p className="text-lg font-semibold mb-2">Hata</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Genel Bakış</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {cardData.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 ease-in-out border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${card.bgColor}`}>
                  <Icon className={`${card.textColor}`} size={24} />
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-2">{card.title}</h3>
              <p className={`text-4xl font-bold ${card.textColor}`}>{card.value.toLocaleString('tr-TR')}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

