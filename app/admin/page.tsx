'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import { initAdminSocket } from '@/lib/socket'
import { Users, FileText, MessageCircle, Calendar, TrendingUp, Activity, Wifi, WifiOff } from 'lucide-react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Summary {
  totalUsers: number
  newUsers24h: number
  onlineUsers: number
  postsToday: number
  commentsToday: number
  ticketsToday: number
  revenue: number
  totalPosts: number
  totalComments: number
  totalEvents: number
  totalTickets: number
  traffic30d: Array<{ date: Date; count: number }>
}

export default function AdminDashboard() {
  const { accessToken } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected' | 'polling'>('polling')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return

    // Fetch initial summary
    const fetchSummary = async () => {
      try {
        const response = await api.get('/admin/summary')
        setSummary(response.data)
        setLoading(false)
      } catch (err: any) {
        setError(err.response?.data?.message || 'Veriler yüklenirken bir hata oluştu')
        setLoading(false)
      }
    }

    fetchSummary()

    // Setup socket connection
    const adminSocket = initAdminSocket(accessToken)

    adminSocket.on('connect', () => {
      setSocketStatus('connected')
      console.log('Admin socket connected')
    })

    adminSocket.on('disconnect', () => {
      setSocketStatus('disconnected')
      console.log('Admin socket disconnected')
    })

    adminSocket.on('admin:metrics', (data: Summary) => {
      setSummary(data)
      setSocketStatus('connected')
    })

    adminSocket.on('admin:moderation', (event: any) => {
      console.log('Moderation event:', event)
      // You can show toast notifications here
    })

    adminSocket.on('admin:system', (event: any) => {
      console.log('System event:', event)
      // You can show system alerts here
    })

    // Fallback polling if socket fails
    const pollInterval = setInterval(() => {
      if (socketStatus === 'disconnected') {
        fetchSummary()
      }
    }, 10000) // Poll every 10 seconds if socket is down

    return () => {
      adminSocket.disconnect()
      clearInterval(pollInterval)
    }
  }, [accessToken, socketStatus])

  const statCards = [
    {
      label: 'Online Kullanıcılar',
      value: summary?.onlineUsers || 0,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Yeni Kayıt (24s)',
      value: summary?.newUsers24h || 0,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Post/Comment (bugün)',
      value: `${summary?.postsToday || 0}/${summary?.commentsToday || 0}`,
      icon: FileText,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ]

  // Traffic chart data
  const trafficData = {
    labels: summary?.traffic30d.map((d) => new Date(d.date).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' })) || [],
    datasets: [
      {
        label: 'Yeni Kullanıcılar',
        data: summary?.traffic30d.map((d) => d.count) || [],
        borderColor: '#ff7b00',
        backgroundColor: 'rgba(255, 123, 0, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7b00]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 dark:text-red-400 text-center">
          <p className="text-lg font-semibold mb-2">Hata</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 lg:px-6 py-4">
      {/* Header with socket status */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold dark:text-white text-gray-900">Dashboard</h2>
        <div className="flex items-center gap-2">
          {socketStatus === 'connected' ? (
            <>
              <Wifi className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">Canlı</span>
            </>
          ) : socketStatus === 'polling' ? (
            <>
              <WifiOff className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-yellow-600 dark:text-yellow-400">Polling</span>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div
              key={idx}
              className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm p-6 dark:bg-[#111] bg-white transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${card.bgColor}`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
              <h3 className="text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">
                {card.label}
              </h3>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Traffic Chart */}
        <div className="xl:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm p-6 dark:bg-[#111] bg-white">
          <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-4">
            30 Günlük Trafik
          </h3>
          {summary?.traffic30d && summary.traffic30d.length > 0 ? (
            <Line data={trafficData} options={{
              responsive: true,
              plugins: {
                legend: { display: false },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: 'rgba(0,0,0,0.1)' },
                },
              },
            }} />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Veri yok</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm p-6 dark:bg-[#111] bg-white">
          <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-4">
            Genel İstatistikler
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm dark:text-gray-400 text-gray-600">Toplam Kullanıcı</span>
              <span className="font-semibold dark:text-white text-gray-900">{summary?.totalUsers || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm dark:text-gray-400 text-gray-600">Toplam Gönderi</span>
              <span className="font-semibold dark:text-white text-gray-900">{summary?.totalPosts || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm dark:text-gray-400 text-gray-600">Toplam Yorum</span>
              <span className="font-semibold dark:text-white text-gray-900">{summary?.totalComments || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm dark:text-gray-400 text-gray-600">Toplam Etkinlik</span>
              <span className="font-semibold dark:text-white text-gray-900">{summary?.totalEvents || 0}</span>
            </div>
            <div className="flex items-center justify-between">
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
