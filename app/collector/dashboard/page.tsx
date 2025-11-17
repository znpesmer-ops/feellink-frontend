'use client'

import { useAuthStore } from '@/lib/store'
import { Palette, Layers, TrendingUp, Users } from 'lucide-react'
import Link from 'next/link'

export default function CollectorDashboard() {
  const { user } = useAuthStore()

  const stats = [
    { label: 'Koleksiyonlar', value: '0', icon: Layers, color: 'text-blue-500' },
    { label: 'Eserler', value: '0', icon: Palette, color: 'text-purple-500' },
    { label: 'Takipçi', value: '0', icon: Users, color: 'text-green-500' },
    { label: 'Görüntülenme', value: '0', icon: TrendingUp, color: 'text-[#ff7b00]' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-gray-900">
            Koleksiyoner Dashboard
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/collections"
          className="p-6 rounded-xl dark:bg-[#111] bg-white border dark:border-[#1f1f1f] border-gray-200 hover:border-[#ff7b00] transition-colors"
        >
          <Layers className="w-8 h-8 text-[#ff7b00] mb-3" />
          <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-1">
            Koleksiyonlarım
          </h3>
          <p className="text-sm dark:text-gray-400 text-gray-600">
            Koleksiyonlarını görüntüle ve yönet
          </p>
        </Link>

        <div className="p-6 rounded-xl dark:bg-[#111] bg-white border dark:border-[#1f1f1f] border-gray-200">
          <Palette className="w-8 h-8 text-[#ff7b00] mb-3" />
          <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-1">
            Portföy
          </h3>
          <p className="text-sm dark:text-gray-400 text-gray-600">
            Sanat eserlerini sergile ve portföyünü oluştur
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="p-6 rounded-xl dark:bg-[#111] bg-white border dark:border-[#1f1f1f] border-gray-200">
        <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-4">
          Koleksiyoner Özellikleri
        </h2>
        <ul className="space-y-2 text-sm dark:text-gray-400 text-gray-600">
          <li>• Koleksiyon oluştur ve yönet</li>
          <li>• Sanat eserlerini sergile</li>
          <li>• Portföy oluştur ve paylaş</li>
          <li>• Takipçi kazan ve etkileşim kur</li>
        </ul>
      </div>
    </div>
  )
}











