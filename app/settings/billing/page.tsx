'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AuthGuard } from '@/lib/auth-guard'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'

const roleLabels: Record<string, string> = {
  art_lover: 'Sanat Sever',
  corporate: 'Kurumsal',
  collector: 'Koleksiyoner',
  artist: 'Sanatçı',
}

const planLabels: Record<string, string> = {
  FREE: 'Ücretsiz',
  PRO: 'PRO',
}

interface PlanInfo {
  id: string
  name: string
  description: string
  price: string
  role: string
}

function BillingSettingsContent() {
  const router = useRouter()
  const { user, refreshUser } = useAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        await refreshUser()
      } catch (error) {
        console.error('Failed to load user data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [refreshUser])

  const currentRoles = user?.roles || []
  const currentPlan = user?.plan || 'FREE'

  const plans: PlanInfo[] = [
    {
      id: 'artist-pro',
      name: 'Sanatçı PRO',
      description: 'Detaylı analizler, Feellink ilan açma ve gelişmiş görünürlük.',
      price: '₺XXX / ay',
      role: 'artist',
    },
    {
      id: 'corporate-pro',
      name: 'Kurumsal PRO',
      description: 'Kurumsal dashboard, çoklu sanatçı yönetimi ve özel destek.',
      price: '₺YYY / ay',
      role: 'corporate',
    },
    {
      id: 'collector-pro',
      name: 'Koleksiyoner PRO',
      description: 'Gelişmiş koleksiyon yönetimi ve özel etkinlik erişimi.',
      price: '₺ZZZ / ay',
      role: 'collector',
    },
  ]

  const handlePlanRequest = (planId: string) => {
    // İleride ödeme entegrasyonu eklendiğinde buraya Stripe/iyzico/Shopier linki gelecek
    alert(`"${plans.find((p) => p.id === planId)?.name}" planı için ödeme sayfasına yönlendirileceksiniz. (Ödeme entegrasyonu yakında eklenecek)`)
  }

  if (loading) {
    return (
      <main className="flex justify-center items-center min-h-screen pt-24 pb-16 px-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7b00]"></div>
      </main>
    )
  }

  return (
    <main className="flex justify-center pt-24 pb-16 px-6 min-h-screen bg-white dark:bg-[#0a0a0a]">
      <div className="w-full max-w-[720px]">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-[#111] dark:text-white">Üyelik & Ücretler</h1>
        </div>

        {/* Content Card */}
        <div className="bg-white/80 dark:bg-[#1a1a1a]/70 backdrop-blur-md border border-gray-200 dark:border-gray-700/40 rounded-2xl p-6 shadow-sm space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Mevcut rolünüz ve ücretli plan seçeneklerini bu alandan görüntüleyebilirsiniz.
          </p>

          {/* Current Role & Plan */}
          <div className="rounded-2xl border border-white/10 dark:border-gray-700/40 bg-white/5 dark:bg-gray-800/50 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Mevcut Rolünüz</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {currentRoles.length > 0 ? (
                currentRoles.map((role) => (
                  <span
                    key={role}
                    className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-brand-orange/10 text-brand-orange border border-brand-orange/20"
                  >
                    {roleLabels[role] || role}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">Rol atanmamış</span>
              )}
            </div>
            <div className="pt-3 border-t border-white/10 dark:border-gray-700/40">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mevcut Planınız</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {planLabels[currentPlan] || currentPlan}
              </p>
            </div>
          </div>

          {/* Available Plans */}
          <div>
            <h2 className="text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100">
              Ücretli Rol Değişikliği
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((plan) => {
                const isCurrentRole = currentRoles.includes(plan.role as any)
                const isCurrentPlan = currentPlan === 'PRO'

                return (
                  <div
                    key={plan.id}
                    className="rounded-2xl border border-white/10 dark:border-gray-700/40 bg-white/5 dark:bg-gray-800/50 p-4"
                  >
                    <p className="text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">
                      {plan.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{plan.description}</p>
                    <p className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                      {plan.price}
                    </p>
                    {isCurrentRole && isCurrentPlan ? (
                      <div className="px-3 py-1.5 text-xs rounded-xl bg-green-500/10 text-green-500 border border-green-500/20 text-center">
                        Aktif Plan
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePlanRequest(plan.id)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-gray-700 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors font-medium"
                      >
                        Planı Talep Et
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Info Note */}
          <div className="pt-4 border-t border-white/10 dark:border-gray-700/40">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Not: Rol değişiklikleri ödeme sonrasında sistem tarafından otomatik tanımlanır. Şu an
              panel üzerinden manuel rol değiştirme seçeneği bulunmamaktadır.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function BillingSettingsPage() {
  return (
    <AuthGuard>
      <BillingSettingsContent />
    </AuthGuard>
  )
}

