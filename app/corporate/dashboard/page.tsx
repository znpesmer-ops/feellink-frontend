'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { Calendar, Ticket, Users, TrendingUp, Plus } from 'lucide-react'
import Link from 'next/link'
import CreateEventModal from '@/components/events/CreateEventModal'

export default function CorporateDashboard() {
  const { user } = useAuthStore()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const stats = [
    { label: 'Toplam Etkinlik', value: '0', icon: Calendar, color: 'text-blue-500' },
    { label: 'Satılan Bilet', value: '0', icon: Ticket, color: 'text-green-500' },
    { label: 'Katılımcı', value: '0', icon: Users, color: 'text-purple-500' },
    { label: 'Gelir', value: '₺0', icon: TrendingUp, color: 'text-[#ff7b00]' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-gray-900">
            Kurumsal Dashboard
          </h1>
          <p className="text-sm mt-1 dark:text-gray-400 text-gray-600">
            Hoş geldin, {user?.fullName || user?.username}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#ff7b00] hover:bg-[#ff9500] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Yeni Etkinlik
          </button>
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
        <button
          onClick={() => setShowCreateModal(true)}
          className="p-6 rounded-xl dark:bg-[#111] bg-white border dark:border-[#1f1f1f] border-gray-200 hover:border-[#ff7b00] transition-colors text-left w-full"
        >
          <Calendar className="w-8 h-8 text-[#ff7b00] mb-3" />
          <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-1">
            Etkinlik Oluştur
          </h3>
          <p className="text-sm dark:text-gray-400 text-gray-600">
            Yeni bir etkinlik oluştur ve bilet satışına başla
          </p>
        </button>

        <Link
          href="/corporate/tickets/new"
          className="p-6 rounded-xl dark:bg-[#111] bg-white border dark:border-[#1f1f1f] border-gray-200 hover:border-[#ff7b00] transition-colors"
        >
          <Ticket className="w-8 h-8 text-[#ff7b00] mb-3" />
          <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-1">
            Bilet Yönetimi
          </h3>
          <p className="text-sm dark:text-gray-400 text-gray-600">
            Biletlerini görüntüle ve yönet
          </p>
        </Link>
      </div>

      {/* Recent Events */}
      <div className="p-6 rounded-xl dark:bg-[#111] bg-white border dark:border-[#1f1f1f] border-gray-200">
        <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-4">
          Son Etkinlikler
        </h2>
        <p className="text-sm dark:text-gray-400 text-gray-600">
          Henüz etkinlik oluşturmadınız. İlk etkinliğinizi oluşturmak için yukarıdaki butona tıklayın.
        </p>
      </div>

      {/* Etkinlik Oluşturma Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          // Sayfayı yenile veya etkinlik listesini güncelle
          window.location.reload()
        }}
      />
    </div>
  )
}



















