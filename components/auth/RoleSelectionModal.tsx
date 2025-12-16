'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, User, Building2, Palette, Landmark } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { getDashboardRouteFromUser } from '@/lib/role-utils'
import { CapabilitySummary, SidebarVisibility, UserRoleCode } from '@/types/capabilities'

interface RoleSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

const roles = [
  {
    key: 'art_lover',
    title: 'Kullanıcı',
    desc: 'Paylaş, keşfet, yorum yap.',
    icon: User,
    features: ['Gönderi paylaş', 'Takip et', 'Yorum yap', 'Beğen'],
    route: '/feed',
  },
  {
    key: 'corporate',
    title: 'Kurumsal',
    desc: 'Etkinlik oluştur, analiz gör, bilet sat.',
    icon: Building2,
    features: ['Etkinlik oluştur', 'Analiz görüntüle', 'Bilet satışı', 'Katılımcı yönetimi'],
    route: '/corporate/dashboard',
  },
  {
    key: 'collector',
    title: 'Koleksiyoner',
    desc: 'Sanat eserlerini sergile, portföy oluştur.',
    icon: Palette,
    features: ['Koleksiyon oluştur', 'Eser sergile', 'Portföy yönet', 'Takipçi kazan'],
    route: '/collector/dashboard',
  },
  {
    key: 'artist',
    title: 'Sanatçı',
    desc: 'Portföyünü yönet, etkinliklere katıl, ilan aç.',
    icon: Landmark,
    features: ['Portföy yönetimi', 'İlan açma', 'Etkinlik organizasyonu', 'Analizler'],
    route: '/artist/dashboard',
  },
]

export default function RoleSelectionModal({
  isOpen,
  onClose,
  userId,
}: RoleSelectionModalProps) {
  const router = useRouter()
  const { user, capabilities, setUser, setCapabilities } = useAuthStore()
  const [selectedRole, setSelectedRole] = useState<UserRoleCode | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleRoleSelect = async (roleKey: UserRoleCode, route: string) => {
    if (isSubmitting) return

    try {
      setError('')
      setSelectedRole(roleKey)
      setIsSubmitting(true)

      const response = await api.patch<{ user: any; capabilities: CapabilitySummary; sidebar?: SidebarVisibility }>(
        '/users/me/roles',
        {
        roles: [roleKey],
        },
      )

      if (user) {
        setUser({ ...user, ...response.data.user }, response.data.capabilities, response.data.sidebar ?? null)
        setCapabilities(response.data.capabilities, response.data.sidebar ?? null)
      }

      // Kısa bir delay sonra yönlendir (UX için)
      setTimeout(() => {
        router.push(
          getDashboardRouteFromUser({
            roles: response.data.capabilities.roles,
            isAdmin: response.data.user.isAdmin,
            capabilities: response.data.capabilities,
          }),
        )
      }, 500)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Rol seçimi başarısız oldu')
      setIsSubmitting(false)
      setSelectedRole(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blur backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className={`relative z-10 w-full max-w-5xl rounded-2xl p-8 transition-all duration-300 ${
          isSubmitting
            ? 'scale-95 opacity-90'
            : 'scale-100 opacity-100'
        } dark:bg-[#111]/95 bg-white/95 backdrop-blur-xl border dark:border-[#1f1f1f] border-gray-200 shadow-2xl`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold dark:text-white text-gray-900">
              Rolünüzü Seçin
            </h2>
            <p className="text-sm mt-1 dark:text-gray-400 text-gray-600">
              Feellink'te nasıl kullanmak istediğinizi seçin
            </p>
          </div>
          {!isSubmitting && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1f1f1f] transition-colors"
            >
              <X className="w-5 h-5 dark:text-gray-400 text-gray-600" />
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm dark:bg-red-900/20 bg-red-50 border dark:border-red-800 border-red-200 dark:text-red-400 text-red-700">
            {error}
          </div>
        )}

        {/* Role cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((role) => {
            const Icon = role.icon
            const isSelected = selectedRole === role.key
            const isDisabled = isSubmitting && !isSelected

            return (
              <div
                key={role.key}
                className={`relative group cursor-pointer rounded-xl p-6 transition-all duration-300 ${
                  isSelected
                    ? 'ring-2 ring-[#ff7b00] dark:bg-[#1a1a1a] bg-gray-50 scale-105'
                    : isDisabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'dark:bg-[#0d0d0d] bg-white border dark:border-[#2b2b2b] border-gray-200 hover:border-[#ff7b00] hover:shadow-lg hover:scale-105'
                }`}
                onClick={() => !isDisabled && handleRoleSelect(role.key as UserRoleCode, role.route)}
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors ${
                    isSelected
                      ? 'bg-[#ff7b00] text-white'
                      : 'dark:bg-[#1f1f1f] bg-gray-100 dark:text-[#ff7b00] text-[#ff7b00] group-hover:bg-[#ff7b00] group-hover:text-white'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold mb-2 dark:text-white text-gray-900">
                  {role.title}
                </h3>

                {/* Description */}
                <p className="text-sm mb-4 dark:text-gray-400 text-gray-600">
                  {role.desc}
                </p>

                {/* Features list */}
                <ul className="space-y-1.5 mb-4">
                  {role.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="text-xs dark:text-gray-500 text-gray-500 flex items-center gap-1.5"
                    >
                      <span className="w-1 h-1 rounded-full dark:bg-[#ff7b00] bg-[#ff7b00]" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Select button */}
                <button
                  disabled={isDisabled}
                  className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
                    isSelected
                      ? 'bg-[#ff7b00] text-white'
                      : isDisabled
                        ? 'dark:bg-[#1f1f1f] bg-gray-100 dark:text-gray-500 text-gray-400 cursor-not-allowed'
                        : 'dark:bg-[#1f1f1f] bg-gray-100 dark:text-white text-gray-900 hover:bg-[#ff7b00] hover:text-white'
                  }`}
                >
                  {isSelected ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Yönlendiriliyor...</span>
                    </div>
                  ) : (
                    'Seç'
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="text-xs text-center mt-6 dark:text-gray-500 text-gray-500">
          Daha sonra ayarlardan rolünüzü değiştirebilirsiniz
        </p>
      </div>
    </div>
  )
}

