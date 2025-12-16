'use client'

import Link from 'next/link'
import { Search, FileText, ClipboardList, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/lib/store'

export function WelcomeFeellink() {
  const { user } = useAuthStore()

  const actionCards = [
    {
      icon: Search,
      title: 'Keşfet',
      description: 'Topluluk ilanlarını incele, sana uygun fırsatları keşfet.',
      buttonText: 'İlanları Gör',
      buttonLink: '/fellink',
      buttonVariant: 'secondary' as const,
    },
    {
      icon: FileText,
      title: 'İlan Oluştur',
      description: 'Kendi ilanını paylaş, toplulukla bağlantı kur.',
      buttonText: 'İlan Oluştur',
      buttonLink: '/jobs/new',
      buttonVariant: 'primary' as const,
    },
    {
      icon: ClipboardList,
      title: 'Başvurularım',
      description: 'Yaptığın başvuruların durumunu tek yerden takip et.',
      buttonText: 'Başvurularım',
      buttonLink: '/fellink?tab=applications',
      buttonVariant: 'secondary' as const,
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 py-8">
      {/* Hero Card */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] p-8 shadow-sm">
        <div className="border-l-4 border-brand-orange pl-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Feellink'e hoş geldin, {user?.fullName || user?.username || 'Kullanıcı'} 👋
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            Sanat, topluluk ve fırsatların buluştuğu alandasın.
            <br />
            Feellink'te ilanları keşfedebilir, başvurabilir ya da kendi fırsatlarını paylaşabilirsin.
          </p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {actionCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div
              key={idx}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] p-6 shadow-sm hover:shadow-md hover:border-brand-orange/30 transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-brand-orange/10 dark:bg-brand-orange/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-brand-orange" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {card.title}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                {card.description}
              </p>
              <Link
                href={card.buttonLink}
                className={`inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  card.buttonVariant === 'primary'
                    ? 'bg-brand-orange text-white hover:bg-brand-orange/90 shadow-sm'
                    : 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {card.buttonText}
              </Link>
            </div>
          )
        })}
      </div>

      {/* Trust Note */}
      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Feellink'te tüm ilanlar şeffaf, başvurular takip edilebilir ve geri bildirimlidir.
        </p>
      </div>
    </div>
  )
}
