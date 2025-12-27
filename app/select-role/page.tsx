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
  Moon,
  Sun,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useTheme } from '@/lib/theme-context'
import type { CapabilitySummary, SidebarVisibility } from '@/types/capabilities'

type PlanKey = 'free' | 'pro'

type RoleConfig = {
  id: string
  title: string
  subtitle: string
  description: string
  features: string[]
  targetAudience: string
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
    subtitle: 'Sanat Sever rolünü seç',
    description: 'Sanatı keşfetmek, duygularını ifade etmek ve dijital sanat dünyasının parçası olmak isteyenler için.',
    features: [
      'Dijital sanat eserlerini keşfet, beğen ve koleksiyonları incele',
      'Eserlere yorum yaparak duygu ve düşüncelerini paylaş',
      'Sergileri, etkinlikleri ve sanatçıları takip et',
      'İlgi alanlarına göre kişiselleştirilmiş içerikler keşfet',
    ],
    targetAudience: 'Sanatla ilgilenen, ilham almak isteyen, üretimden çok keşif ve etkileşime odaklanan herkes için ideal.',
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
    subtitle: 'Kurumsal rolünü seç',
    description: 'Sergi, etkinlik ve koleksiyonlarını dijital ortamda profesyonel şekilde yönet.',
    features: [
      'Müze, galeri veya kurum profili oluştur',
      'Ziyaretçi ve etkileşim analizlerini görüntüle',
      'Dijital sergi ve etkinlikleri yönet',
      'Kurumsal koleksiyonlarını düzenle',
    ],
    targetAudience: 'Müze, galeri, sanat inisiyatifi veya kültür-sanat alanında kurumsal üretim yapan yapılar.',
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
    subtitle: 'Koleksiyoner rolünü seç',
    description: 'Dijital koleksiyonlarını oluştur, yönet ve sanat arşivini büyüt.',
    features: [
      'Kendi dijital sanat koleksiyonlarını oluştur',
      'Farklı sanatçılardan eserleri bir araya getir',
      'Koleksiyonlarını kategorilere ayır ve düzenle',
      'Dijital sanat hafızanı kalıcı hale getir',
    ],
    targetAudience: 'Sanat eserlerini bir araya getirmeyi, arşivlemeyi ve kürasyon yapmayı seven kullanıcılar için.',
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
    subtitle: 'Sanatçı rolünü seç',
    description: 'Eserlerini sergile, görünürlüğünü artır ve izleyicilerinle doğrudan bağ kur.',
    features: [
      'Dijital eserlerini yükle ve sergile',
      'Eserlerinin etkileşimlerini ve geri bildirimlerini takip et',
      'Ziyaretçilerle yorumlar üzerinden iletişim kur',
      'Feellink topluluğu içinde görünürlük kazan',
    ],
    targetAudience: 'Üreten, paylaşan ve sanatını daha geniş kitlelere ulaştırmak isteyen sanatçılar.',
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
  const { theme, toggleTheme } = useTheme()
  const setUser = useAuthStore((state) => state.setUser)
  const setCapabilities = useAuthStore((state) => state.setCapabilities)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [selectedExtra, setSelectedExtra] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const activeRole = useMemo(
    () => ROLE_CONFIG.find((role) => role.id === selectedRoleId) ?? null,
    [selectedRoleId]
  )

  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleId(roleId)
    setSelectedExtra(null)
    setMutationError(null)
    setIsProcessing(false)
  }

  const handleExtraToggle = (extraId: string) => {
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
    if (!activeRole) return

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

    if (!user?.id) {
      router.push('/login')
      return
    }

    try {
      setIsProcessing(true)

      const response = await api.patch('/users/me/roles', {
        roles: rolesPayload,
        extras: extrasPayload,
      })

      const responseData = response.data as any
      type ResponseData = {
        user?: any
        capabilities?: CapabilitySummary
        sidebar?: SidebarVisibility
      }
      const typedData = responseData as ResponseData
      const { user: updatedUser, capabilities, sidebar } = typedData

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
    <main className="relative min-h-screen flex flex-col items-center justify-start px-4 py-8 bg-gradient-to-b from-white via-blue-50/30 to-white dark:from-[#0a0a0a] dark:via-[#141414] dark:to-[#0a0a0a] transition-all duration-500">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(30,136,229,0.06),_transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(30,136,229,0.08),_transparent_65%)]" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 mt-10 w-full max-w-5xl text-center space-y-8"
      >
        {/* Header: Logo + Theme Toggle */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full flex items-center justify-between mb-10"
        >
          <div className="flex-1" />
          <div className="flex-1 flex justify-center">
            <img
              src="/logo.png"
              alt="Feellink Logo"
              className="h-20 object-contain"
            />
          </div>
          <div className="flex-1 flex justify-end">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </motion.div>

        <div className="space-y-4">
          <p className="mx-auto max-w-2xl text-sm text-gray-600 dark:text-gray-300 md:text-base">
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
                    ? 'border-orange-400 bg-gradient-to-b from-blue-50/60 to-white shadow-lg shadow-orange-500/20 dark:border-orange-400/70 dark:from-orange-500/20 dark:to-orange-500/5 dark:bg-orange-500/10'
                    : 'border-gray-200 bg-white shadow-sm hover:border-blue-300/50 hover:shadow-lg hover:shadow-blue-500/5 dark:border-white/10 dark:bg-neutral-900/70'
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
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{role.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-200 line-clamp-2">
                      {role.description.split('.')[0]}.
                    </p>
                  </div>
                </div>

                {isActive && (
                  <CheckCircle className="absolute right-5 top-5 h-5 w-5 text-orange-500" />
                )}

                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-orange-500 dark:text-orange-400">
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
                className="rounded-3xl border border-white/30 bg-white/85 backdrop-blur-md p-6 shadow-xl dark:border-white/10 dark:bg-neutral-800/90 dark:backdrop-blur-md"
              >
                <div className="flex flex-col gap-3 text-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{activeRole.subtitle}</h2>
                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                    {activeRole.description}
                  </p>
                </div>

                {/* Features List */}
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-3 tracking-tight">Özellikler</h3>
                  <ul className="space-y-2.5 text-sm text-gray-700 dark:text-gray-200">
                    {activeRole.features.map((feature, index) => (
                      <li key={index} className="leading-relaxed font-normal">
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Target Audience */}
                <div className="mt-6 pt-6 border-t border-gray-300 dark:border-white/10">
                  <h4 className="text-xs font-medium text-gray-800 dark:text-gray-100 mb-1.5">Kimler için uygun?</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed font-normal">
                    {activeRole.targetAudience}
                  </p>
                </div>

                {/* Info Note */}
                <div className="mt-6 pt-6 border-t border-gray-300 dark:border-white/10">
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic">
                    Seçtiğin rol, Feellink deneyimini kişiselleştirir. Tüm özelliklere erişimin vardır; rolün yalnızca kullanım odağını belirler.
                  </p>
                </div>

                <div className={`mt-6 grid grid-cols-1 gap-8 ${gridColsClass}`}>
                  {hasExtraPackages &&
                    activeRole.allowedExtras!.map((extraId) => {
                      const extra = EXTRA_PACKAGES[extraId]
                      const isActiveExtra = selectedExtra === extraId
                      const partnerRole = ROLE_CONFIG.find((role) => role.id === extraId)?.title ?? ''

                      return (
                        <motion.div
                          key={extraId}
                          layout
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleExtraToggle(extraId)}
                          className={`relative rounded-2xl border border-dashed border-blue-300 bg-white/80 backdrop-blur-md p-6 text-left transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-neutral-800/90 dark:backdrop-blur-md ${
                            isActiveExtra ? 'ring-2 ring-orange-500/40 border-orange-500/40 shadow-orange-500/20 dark:ring-orange-500/40 dark:border-orange-500/40 dark:shadow-orange-500/20' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold uppercase tracking-wide ${
                              isActiveExtra 
                                ? 'text-orange-600 dark:text-orange-400' 
                                : 'text-blue-600 dark:text-blue-400'
                            }`}>
                              Ek Paket
                            </span>
                          </div>
                          <h5 className={`mt-4 text-lg font-semibold tracking-tight ${
                            isActiveExtra
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {extra.label.replace(' Ekleyin', '')}
                          </h5>
                          <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                            {partnerRole} modüllerini panonuza ekleyin. {extra.cta}
                          </p>

                          <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                            {extra.features.map((feature) => (
                              <li key={feature} className="flex items-center gap-2">
                                <span className={`inline-flex h-1.5 w-1.5 rounded-full mt-0.5 ${
                                  isActiveExtra ? 'bg-orange-500 dark:bg-orange-400' : 'bg-blue-500'
                                }`} />
                                <span className="text-sm font-normal">{feature}</span>
                              </li>
                            ))}
                          </ul>

                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              handleExtraToggle(extraId)
                            }}
                            className={`mt-6 w-full rounded-lg py-2 text-sm font-medium transition ${
                              isActiveExtra
                                ? 'bg-orange-500 text-white hover:bg-orange-600 dark:hover:bg-orange-600'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/40'
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
                key={`${activeRole.id}-${selectedExtra ?? 'solo'}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex w-full flex-col gap-6 rounded-3xl border border-white/30 bg-white/85 p-6 text-center shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-neutral-800/90 dark:backdrop-blur-md"
              >
                {mutationError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-200">
                    {mutationError}
                  </div>
                )}
                <button
                  onClick={handleConfirm}
                  disabled={!activeRole || isProcessing}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 ${
                    activeRole && !isProcessing
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:from-orange-500/90 hover:to-orange-600/90'
                      : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {isProcessing
                    ? 'Rol atanıyor...'
                    : activeRole
                      ? 'Rolü Onayla ve Devam Et'
                      : 'Lütfen bir rol seçin'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </main>
  )
}