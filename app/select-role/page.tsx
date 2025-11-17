'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Palette,
  Building2,
  KeyRound,
  Brush,
  CheckCircle,
  Sparkles,
  Check,
  Plus,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import type { CapabilitySummary, SidebarVisibility } from '@/types/capabilities'

type PlanKey = 'free' | 'pro'

type RoleConfig = {
  id: string
  title: string
  subtitle: string
  icon: React.ElementType
  plans: Record<PlanKey, string[]>
  highlights: Record<PlanKey, string>
  pricing: Record<PlanKey, number>
  allowedExtras?: string[]
}

type ExtraPackage = {
  id: string
  label: string
  cta: string
  summary: string
  features: string[]
}

const priceFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 0,
})

const formatPrice = (amount: number) => {
  if (amount <= 0) return 'Ücretsiz'
  return `${priceFormatter.format(amount)} / ay`
}

const ROLE_CONFIG: RoleConfig[] = [
  {
    id: 'art_lover',
    title: 'Sanat Sever',
    subtitle: 'Sanat dünyasını keşfet, beğen ve ilham al.',
    icon: Palette,
    plans: {
      free: ['Ayda 1 etkinlik', 'Topluluk etkileşimi', 'Temel öneriler'],
      pro: ['Sınırsız etkinlik katılımı', 'Derin analiz ve raporlar', 'Feellink Pro Rozeti'],
    },
    highlights: {
      free: 'Başlangıç için ideal.',
      pro: 'Sınırsız etkileşim ve ileri analizler.',
    },
    pricing: {
      free: 0,
      pro: 49,
    },
  },
  {
    id: 'corporate',
    title: 'Kurumsal',
    subtitle: 'Etkinlik düzenle, ziyaretçi verilerini analiz et.',
    icon: Building2,
    plans: {
      free: ['Ayda 30 etkinlik', 'Temel analiz paneli', 'Standart raporlama'],
      pro: ['Sınırsız etkinlik oluşturma', 'Özel raporlama & dashboard', 'Turuncu doğrulama tiki'],
    },
    highlights: {
      free: 'Etkinlik yönetimine giriş.',
      pro: 'Profesyonel kurum yönetim araçları.',
    },
    pricing: {
      free: 99,
      pro: 149,
    },
  },
  {
    id: 'collector',
    title: 'Koleksiyoner',
    subtitle: 'Koleksiyonunu dijital olarak yönet ve paylaş.',
    icon: KeyRound,
    plans: {
      free: ['Ayda 5 koleksiyon', 'Koleksiyon yönetim aracı', 'Temel ziyaretçi görüntüleme'],
      pro: ['Sınırsız koleksiyon & eser ekleme', 'Ziyaretçi analitiği ve içgörü', 'Feellink Pro Rozeti'],
    },
    highlights: {
      free: 'Koleksiyonlarını temel seviyede yönet.',
      pro: 'Koleksiyonunuzu profesyonelce vitrine çıkarın.',
    },
    pricing: {
      free: 79,
      pro: 119,
    },
    allowedExtras: ['artist'],
  },
  {
    id: 'artist',
    title: 'Sanatçı',
    subtitle: 'Eserlerini paylaş, kitlene ulaş, ilan aç.',
    icon: Brush,
    plans: {
      free: ['Ayda 5 etkinlik/ilan', 'Temel analizler', 'Topluluk etkileşimi'],
      pro: ['Sınırsız sergi & etkinlik', 'İlan açma ve bilet yönetimi', 'Pro panel erişimi'],
    },
    highlights: {
      free: 'Kitlenle tanışmaya başla.',
      pro: 'Sanat kariyerini ölçeklendir.',
    },
    pricing: {
      free: 79,
      pro: 119,
    },
    allowedExtras: ['collector'],
  },
]

const PLAN_LABELS: Record<PlanKey, { title: string; tag: string; accent: string }> = {
  free: {
    title: 'Standart Üyelik',
    tag: 'STANDART',
    accent: 'bg-gray-900/5 text-gray-700 dark:bg-white/10 dark:text-gray-100',
  },
  pro: {
    title: 'Profesyonel Üyelik',
    tag: 'PRO',
    accent: 'bg-orange-500 text-white dark:bg-orange-500',
  },
}

const EXTRA_PACKAGES: Record<string, ExtraPackage> = {
  collector: {
    id: 'collector',
    label: 'Koleksiyoner Paketini Ekleyin',
    cta: 'Koleksiyon yönetimi, portföy ve analitik modüllerini açar.',
    summary: 'Koleksiyon Yönetimi, Portföy, Analiz modülleri',
    features: ['Koleksiyon Yönetimi', 'Portföy', 'Analizler'],
  },
  artist: {
    id: 'artist',
    label: 'Sanatçı Paketini Ekleyin',
    cta: 'Etkinlik oluşturma, ilan açma ve bilet yönetimini etkinleştirir.',
    summary: 'Etkinlik Oluşturma, Bilet Oluşturma, İlan Açma',
    features: ['Etkinlik Oluşturma', 'Bilet Oluşturma', 'İlan Açma'],
  },
}

const EXTRA_PACKAGE_PRICING: Record<string, number> = {
  collector: 49,
  artist: 49,
}

const ROLE_MODULES: Record<string, string[]> = {
  art_lover: ['Keşfet', 'Topluluk Etkileşimi', 'Öneriler'],
  corporate: ['Etkinlik Oluştur', 'Etkinliklerim', 'Analizler', 'Bilet Yönetimi'],
  collector: ['Koleksiyonlarım', 'Koleksiyon Yönetimi', 'Portföy', 'Analizler'],
  artist: ['Etkinlik Oluştur', 'Bilet Oluştur', 'İlan Aç', 'Analizler'],
}

const COMBO_FEATURES: Record<string, string[]> = {
  'artist+collector': ['Koleksiyon Yönetimi', 'Portföy', 'Analizler'],
  'collector+artist': ['Etkinlik Oluştur', 'Bilet Oluştur', 'İlan Aç'],
}

export default function SelectRolePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const setUser = useAuthStore((state) => state.setUser)
  const setCapabilities = useAuthStore((state) => state.setCapabilities)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null)
  const [selectedExtra, setSelectedExtra] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const activeRole = useMemo(
    () => ROLE_CONFIG.find((role) => role.id === selectedRoleId) ?? null,
    [selectedRoleId]
  )

  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleId(roleId)
    setSelectedPlan(null)
    setSelectedExtra(null)
    setMutationError(null)
    setIsProcessing(false)
  }

  const handlePlanSelect = (plan: PlanKey) => {
    setSelectedPlan(plan)
    setMutationError(null)
    if (plan !== 'pro') {
      setSelectedExtra(null)
    }
  }

  const handleExtraToggle = (extraId: string) => {
    if (selectedPlan !== 'pro') {
      return
    }
    setSelectedExtra((prev) => (prev === extraId ? null : extraId))
    setMutationError(null)
  }

  const computeModules = useMemo(() => {
    if (!selectedRoleId) return []
    const baseModules = ROLE_MODULES[selectedRoleId] ?? []
    if (!selectedExtra) return [...baseModules]

    const comboKey = `${selectedRoleId}+${selectedExtra}`
    const comboModules = COMBO_FEATURES[comboKey] ?? []
    return Array.from(new Set([...baseModules, ...comboModules]))
  }, [selectedRoleId, selectedExtra])

  const handleConfirm = async () => {
    if (!activeRole || !selectedPlan) return

    setMutationError(null)

    const rolesPayload = Array.from(
      new Set([activeRole.id, ...(selectedExtra ? [selectedExtra] : [])]),
    )

    const extrasPayload: string[] = []
    if (selectedExtra === 'collector') {
      extrasPayload.push('koleksiyoner-extra')
    } else if (selectedExtra === 'artist') {
      extrasPayload.push('sanatci-extra')
    } else if (selectedExtra) {
      extrasPayload.push(selectedExtra)
    }
    const planCode = selectedPlan === 'pro' ? 'PRO' : 'FREE'

    if (!user?.id) {
      router.push('/login')
      return
    }

    try {
      setIsProcessing(true)

      const response = await api.patch('/users/me/roles', {
        roles: rolesPayload,
        plan: planCode,
        extras: extrasPayload,
      })

      const { user: updatedUser, capabilities, sidebar } = response.data as {
        user?: ReturnType<typeof useAuthStore>['user']
        capabilities?: CapabilitySummary
        sidebar?: SidebarVisibility
      }

      if (updatedUser) {
        setUser(updatedUser, capabilities ?? null, sidebar ?? null)
      } else if (capabilities) {
        setCapabilities(capabilities, sidebar ?? null)
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('[SelectRole] Rol güncellemesi başarısız:', error)
      setMutationError('Rol seçiminiz kaydedilemedi. Lütfen tekrar deneyin.')
    } finally {
      setIsProcessing(false)
    }
  }

  const hasExtraPackages = Boolean(activeRole?.allowedExtras?.length)
  const gridColsClass = hasExtraPackages ? 'lg:grid-cols-3' : 'lg:grid-cols-2'

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-start px-4 py-8 bg-gradient-to-b from-white via-orange-50/20 to-white dark:from-[#0a0a0a] dark:via-[#141414] dark:to-[#0a0a0a] transition-all duration-500">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,123,0,0.08),_transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,123,0,0.12),_transparent_65%)]" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 mt-10 w-full max-w-5xl text-center space-y-8"
      >
        <div className="space-y-2">
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold tracking-tight text-orange-500 md:text-5xl"
          >
            Feellink
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="text-sm font-medium text-gray-600 dark:text-gray-400 md:text-base"
          >
            Duyguların teknolojiyle buluştuğu yer.
          </motion.p>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white md:text-4xl">
            Feellink Deneyimini Kişiselleştir
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-gray-600 dark:text-gray-400 md:text-base">
            Dijital sanat dünyasında rolünü seç. Kombinasyonlarını özgürce oluştur ve yaratıcı deneyimini genişlet.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {ROLE_CONFIG.map((role) => {
            const Icon = role.icon
            const isActive = role.id === selectedRoleId
            return (
              <motion.button
                key={role.id}
                layout
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoleSelect(role.id)}
                className={`group relative overflow-hidden rounded-2xl border px-6 py-7 text-left transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 ${
                  isActive
                    ? 'border-orange-400 bg-gradient-to-b from-orange-50/80 to-orange-100/60 shadow-lg shadow-orange-500/20 dark:border-orange-400/70 dark:from-orange-500/20 dark:to-transparent'
                    : 'border-gray-200 bg-white shadow-sm hover:border-orange-300/70 hover:shadow-lg hover:shadow-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]'
                }`}
              >
                <span className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                  <span className="absolute inset-x-0 -top-20 h-40 bg-gradient-to-b from-orange-200/40 to-transparent blur-3xl" />
                </span>

                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-xl p-3 text-lg transition-colors ${
                      isActive
                        ? 'bg-orange-500 text-white'
                        : 'bg-orange-100 text-orange-500 dark:bg-orange-500/15 dark:text-orange-200'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">{role.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{role.subtitle}</p>
                  </div>
                </div>

                {isActive && (
                  <CheckCircle className="absolute right-5 top-5 h-5 w-5 text-orange-500" />
                )}

                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-orange-500 dark:text-orange-300">
                  {isActive ? 'Rol seçildi' : 'Detayları görmek için seç'}
                </div>
              </motion.button>
            )
          })}
        </div>

        <div className="mx-auto mt-10 w-full max-w-4xl">
          <AnimatePresence mode="wait">
            {activeRole && (
              <motion.div
                key={activeRole.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-3xl border border-orange-200/60 bg-white/90 p-6 shadow-xl shadow-orange-500/10 backdrop-blur dark:border-orange-500/30 dark:bg-[#1a1a1a]/90"
              >
                <div className="flex flex-col gap-2 text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{activeRole.title} için üyelik seç</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Standart veya Profesyonel üyeliği seçerek rolünüz için özellikleri açın.
                  </p>
                </div>

                <div className={`mt-6 grid grid-cols-1 gap-8 ${gridColsClass}`}>
                  {(Object.keys(activeRole.plans) as PlanKey[]).map((planKey) => {
                    const isSelected = selectedPlan === planKey
                    const plan = PLAN_LABELS[planKey]
                    const isPro = planKey === 'pro'
                    const priceLabel = formatPrice(activeRole.pricing[planKey])

                    const cardClasses = `plan-card ${isSelected ? 'active' : ''}`

                    const buttonClasses = isSelected
                      ? 'bg-feellink-blue text-white'
                      : 'bg-feellink-white text-feellink-blue border border-feellink-blue hover:bg-feellink-blue hover:text-white'

                    return (
                      <motion.div
                        key={planKey}
                        layout
                        role="button"
                        tabIndex={0}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePlanSelect(planKey)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            handlePlanSelect(planKey)
                          }
                        }}
                        className={`relative p-6 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-feellink-blue ${cardClasses}`}
                      >
                        {isSelected && (
                          <div className="check-icon">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                        <div className="price-badge">{priceLabel}</div>
                        <span
                          className="mt-10 inline-flex rounded-full bg-feellink-light px-3 py-1 text-xs font-semibold uppercase tracking-wide text-feellink-dark"
                        >
                          {plan.tag}
                        </span>

                        <h4 className="mt-4 text-xl font-semibold text-feellink-dark">
                          {plan.title}
                        </h4>
                        <p className="mt-2 text-sm text-feellink-dark/70">
                          {activeRole.highlights[planKey]}
                        </p>

                        <ul className="mt-4 space-y-2 text-sm text-feellink-dark">
                          {activeRole.plans[planKey].map((item) => (
                            <li key={item} className="flex items-center gap-2">
                              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-feellink-light text-[10px] font-semibold text-feellink-dark">
                                ✔
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-6 flex items-center justify-between">
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              handlePlanSelect(planKey)
                            }}
                            disabled={isSelected}
                            className={`w-full rounded-lg py-2 text-sm font-semibold transition ${buttonClasses} ${
                              isSelected ? 'cursor-default opacity-95' : ''
                            }`}
                          >
                            {isSelected ? 'Seçildi' : 'Bu Planı Seç'}
                          </button>
                        </div>

                        {isSelected && (
                          <CheckCircle
                            className={`absolute right-4 top-4 h-5 w-5 ${
                              isPro ? 'text-feellink-orange' : 'text-feellink-blue'
                            }`}
                          />
                        )}
                      </motion.div>
                    )
                  })}

                  {hasExtraPackages &&
                    activeRole.allowedExtras!.map((extraId) => {
                      const extra = EXTRA_PACKAGES[extraId]
                      const isActiveExtra = selectedExtra === extraId
                      const partnerRole = ROLE_CONFIG.find((role) => role.id === extraId)?.title ?? ''
                      const extraPrice = EXTRA_PACKAGE_PRICING[extraId] ?? 0
                      const extraPriceLabel = formatPrice(extraPrice)

                      return (
                        <motion.div
                          key={extraId}
                          layout
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleExtraToggle(extraId)}
                          className={`relative rounded-2xl border border-dashed border-orange-400 bg-gradient-to-b from-white via-gray-50 to-orange-50 p-6 text-left transition-all duration-300 hover:shadow-md ${
                            isActiveExtra ? 'ring-2 ring-orange-400/60 shadow-orange-200/40 dark:ring-orange-500/40 dark:shadow-orange-900/40' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-300">
                              Ek Paket
                            </span>
                            <span className="rounded-full px-3 py-1 text-sm font-semibold bg-orange-100 text-orange-700">
                              {extraPriceLabel}
                            </span>
                          </div>
                          <h4 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {extra.label.replace(' Ekleyin', '')}
                          </h4>
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            {partnerRole} modüllerini panonuza ekleyin. {extra.cta}
                          </p>

                          <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                            {extra.features.map((feature) => (
                              <li key={feature} className="flex items-center gap-2">
                                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-100 text-[10px] font-semibold text-orange-600 dark:bg-orange-500/30 dark:text-orange-100">
                                  ✨
                                </span>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>

                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              handleExtraToggle(extraId)
                            }}
                            className={`mt-6 w-full rounded-lg py-2 text-sm font-semibold transition ${
                              isActiveExtra
                                ? 'bg-orange-500 text-white hover:bg-orange-600 dark:hover:bg-orange-500/90'
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            }`}
                          >
                            {isActiveExtra ? 'Paketi Kaldır' : `+ ${partnerRole} Paketini Aktifleştir`}
                          </button>

                          {isActiveExtra && (
                            <span className="absolute right-4 top-4 rounded-full bg-orange-500 px-2 py-1 text-xs font-semibold text-white shadow-md">
                              Aktif Paket
                            </span>
                          )}
                        </motion.div>
                      )
                    })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mx-auto mt-10 w-full max-w-3xl">
          <AnimatePresence>
            {activeRole && (
              <motion.div
                key={`${activeRole.id}-${selectedPlan ?? 'none'}-${selectedExtra ?? 'solo'}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex w-full flex-col gap-6 rounded-3xl border border-orange-200/70 bg-white/90 p-6 text-center shadow-xl shadow-orange-500/10 backdrop-blur dark:border-orange-500/30 dark:bg-[#1a1a1a]/90"
              >
                {mutationError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-200">
                    {mutationError}
                  </div>
                )}
                <button
                  onClick={handleConfirm}
                  disabled={!selectedPlan || isProcessing}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 ${
                    selectedPlan && !isProcessing
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:from-orange-500/90 hover:to-orange-600/90'
                      : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {isProcessing
                    ? 'Ödeme sayfasına yönlendiriliyor...'
                    : selectedPlan
                      ? 'Seçimi Onayla ve Devam Et'
                      : 'Lütfen bir plan seçin'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </main>
  )
}