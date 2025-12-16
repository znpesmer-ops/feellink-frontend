'use client'

import { useAuthStore } from '@/lib/store'
import { Landmark, Users, TrendingUp, Calendar, FileText, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function MuseumAnalyticsPage() {
  const { user } = useAuthStore()

  const stats = [
    { label: 'Ziyaretçi', value: '0', icon: Users, color: 'text-blue-500' },
    { label: 'Koleksiyon', value: '0', icon: Landmark, color: 'text-purple-500' },
    { label: 'Etkinlik', value: '0', icon: Calendar, color: 'text-green-500' },
    { label: 'Gelir', value: '₺0', icon: TrendingUp, color: 'text-[#ff7b00]' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-gray-900">
            Müze Dashboard
          </h1>
          <p className="text-sm mt-1 dark:text-gray-400 text-gray-600">
            Hoş geldin, {user?.fullName || user?.username}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div
              key={idx}
              className="p-6 rounded-xl dark:bg-[#111] bg-white border dark:border-[#1f1f1f] border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-8 h-8 ${stat.color}`} />
              </div>
              <h3 className="text-2xl font-bold dark:text-white text-gray-900 mb-1">
                {stat.value}
              </h3>
              <p className="text-sm dark:text-gray-400 text-gray-600">
                {stat.label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl dark:bg-[#111] bg-white border dark:border-[#1f1f1f] border-gray-200 hover:border-[#ff7b00] transition-colors">
          <Landmark className="w-8 h-8 text-[#ff7b00] mb-3" />
          <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-1">
            Koleksiyon Yönetimi
          </h3>
          <p className="text-sm dark:text-gray-400 text-gray-600">
            Müze koleksiyonlarını yönet
          </p>
        </div>

        <div className="p-6 rounded-xl dark:bg-[#111] bg-white border dark:border-[#1f1f1f] border-gray-200 hover:border-[#ff7b00] transition-colors">
          <Users className="w-8 h-8 text-[#ff7b00] mb-3" />
          <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-1">
            Ziyaretçi Analizi
          </h3>
          <p className="text-sm dark:text-gray-400 text-gray-600">
            Ziyaretçi istatistiklerini görüntüle
          </p>
        </div>

        <div className="p-6 rounded-xl dark:bg-[#111] bg-white border dark:border-[#1f1f1f] border-gray-200 hover:border-[#ff7b00] transition-colors">
          <FileText className="w-8 h-8 text-[#ff7b00] mb-3" />
          <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-1">
            Raporlar
          </h3>
          <p className="text-sm dark:text-gray-400 text-gray-600">
            Detaylı raporları görüntüle
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="p-6 rounded-xl dark:bg-[#111] bg-white border dark:border-[#1f1f1f] border-gray-200">
        <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-4">
          Müze Sahibi Özellikleri
        </h2>
        <ul className="space-y-2 text-sm dark:text-gray-400 text-gray-600">
          <li>• Ziyaretçi analizi ve istatistikler</li>
          <li>• Koleksiyon yönetimi</li>
          <li>• Etkinlik düzenleme</li>
          <li>• Detaylı raporlar ve analizler</li>
        </ul>
      </div>
    </div>
  )
}





































