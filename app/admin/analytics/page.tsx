'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { initAdminSocket } from '@/lib/socket'
import {
  BarChart3,
  Users,
  FileText,
  MessageCircle,
  Ticket,
  TrendingUp,
  Globe,
} from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import for RealtimeMap (SSR disabled for Leaflet)
const RealtimeMap = dynamic(() => import('@/components/admin/RealtimeMap'), {
  ssr: false,
})
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// Country flag emojis
const countryFlags: Record<string, string> = {
  Türkiye: '🇹🇷',
  Almanya: '🇩🇪',
  Fransa: '🇫🇷',
  İngiltere: '🇬🇧',
  Diğer: '🌍',
}

interface AnalyticsData {
  totalUsers: number
  activeUsers: number
  totalPosts: number
  totalComments: number
  totalTickets: number
  totalRevenue: number
  topCountries: Array<{ country: string; count: number }>
  engagementTrend: Array<{ date: string; posts: number; comments: number }>
  growthTrend: Array<{ date: string; users: number }>
}

export default function AdminAnalyticsPage() {
  const { accessToken } = useAuthStore()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()

    if (!accessToken) return

    // Setup socket connection for real-time updates
    const adminSocket = initAdminSocket(accessToken)

    adminSocket.on('admin:analytics', (analyticsData: AnalyticsData) => {
      setData(analyticsData)
      setLoading(false)
    })

    adminSocket.on('connect', () => {
      console.log('Admin analytics socket connected')
    })

    adminSocket.on('disconnect', () => {
      console.log('Admin analytics socket disconnected')
    })

    return () => {
      adminSocket.disconnect()
    }
  }, [accessToken])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/admin/analytics')
      setData(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Veriler yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7a00]"></div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-800/40 shadow-sm p-6 bg-red-50 dark:bg-red-900/10">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (!data) return null

  const statCards = [
    {
      label: 'Toplam Kullanıcılar',
      value: data.totalUsers.toLocaleString('tr-TR'),
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Aktif Kullanıcılar (24s)',
      value: data.activeUsers.toLocaleString('tr-TR'),
      icon: Users,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Gönderiler',
      value: data.totalPosts.toLocaleString('tr-TR'),
      icon: FileText,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Yorumlar',
      value: data.totalComments.toLocaleString('tr-TR'),
      icon: MessageCircle,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    },
    {
      label: 'Biletler',
      value: data.totalTickets.toLocaleString('tr-TR'),
      icon: Ticket,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
    {
      label: 'Gelir (₺)',
      value: `₺${data.totalRevenue.toLocaleString('tr-TR')}`,
      icon: TrendingUp,
      color: 'text-[#ff7a00] dark:text-[#ff7a00]',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ]

  // Format dates for charts (show only day/month)
  const formattedEngagementTrend = data.engagementTrend.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
  }))

  const formattedGrowthTrend = data.growthTrend.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="text-[#ff7a00]" />
            Analitik
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Platform genelinde gerçek zamanlı istatistikler ve metrikler
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm p-6 dark:bg-[#111] bg-white hover:scale-105 transition-transform duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Trend */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm p-6 dark:bg-[#111] bg-white">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="text-[#ff7a00]" />
            30 Günlük Etkileşim Trendi
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={formattedEngagementTrend}>
              <defs>
                <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff7a00" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ff7a00" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
              />
              <YAxis tick={{ fontSize: 12 }} className="text-gray-600 dark:text-gray-400" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                className="dark:bg-gray-800 dark:border-gray-700"
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="posts"
                stroke="#ff7a00"
                fillOpacity={1}
                fill="url(#colorPosts)"
                name="Gönderiler"
              />
              <Area
                type="monotone"
                dataKey="comments"
                stroke="#8b5cf6"
                fillOpacity={1}
                fill="url(#colorComments)"
                name="Yorumlar"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Growth Trend */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm p-6 dark:bg-[#111] bg-white">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="text-[#ff7a00]" />
            30 Günlük Kullanıcı Artışı
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedGrowthTrend}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
              />
              <YAxis tick={{ fontSize: 12 }} className="text-gray-600 dark:text-gray-400" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                className="dark:bg-gray-800 dark:border-gray-700"
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#ff7a00"
                strokeWidth={2}
                dot={{ fill: '#ff7a00', r: 4 }}
                activeDot={{ r: 6 }}
                name="Yeni Kullanıcılar"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Countries Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm dark:bg-[#111] bg-white overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Globe className="text-[#ff7a00]" />
            Ülkelere Göre Kullanıcı Dağılımı
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ülke
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kullanıcı Sayısı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Yüzde
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Grafik
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.topCountries.map((item, index) => {
                const percentage = ((item.count / data.totalUsers) * 100).toFixed(1)
                return (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{countryFlags[item.country] || '🌍'}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.country}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {item.count.toLocaleString('tr-TR')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        %{percentage}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-[#ff7a00] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                )
          })}
        </tbody>
      </table>
    </div>
      </div>

      {/* Realtime Visitor Map */}
      <div className="mt-8">
        <RealtimeMap />
      </div>
    </div>
  )
}
