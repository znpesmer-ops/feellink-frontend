'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthGuard } from '@/lib/auth-guard'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DeleteAccountModal } from '@/components/settings/DeleteAccountModal'
import ChangePasswordModal from '@/components/settings/ChangePasswordModal'
import { ROLE_METADATA, normalizeRole } from '@/lib/role-utils'
import type { UserRoleCode } from '@/types/capabilities'
import { Send, MessageSquare, Shield } from 'lucide-react'

function SettingsContent() {
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  // Kullanıcı bilgilerini çek (usernameLastChangedAt için)
  const { data: userData } = useQuery({
    queryKey: ['user-me'],
    queryFn: async () => {
      const response = await api.get('/users/me')
      return response.data
    },
    enabled: !!user,
  })


  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8 text-gray-900 dark:text-gray-100">Ayarlar</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6 transition-colors">
        <div>
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-900 dark:text-gray-100">Profil Bilgileri</h2>
          <div className="space-y-4">
            <UsernameField 
              user={user} 
              userData={userData}
              onUpdate={(updatedUser) => {
                setUser(updatedUser)
                queryClient.invalidateQueries({ queryKey: ['user-me'] })
                // Username değiştiyse profil sayfasına redirect et
                router.replace('/profile/me')
              }}
            />
            <EmailField 
              user={user}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['user-me'] })
              }}
            />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-900 dark:text-gray-100">Hesap Güvenliği</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                E-posta
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                E-posta adresiniz doğrulanmış durumda.
              </p>
            </div>
            <SecuritySection />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-900 dark:text-gray-100">Profil Görünümü</h2>
          <ProfileColorSignatureToggle user={user} userData={userData} onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['user-me'] })
            queryClient.invalidateQueries({ queryKey: ['profile'] })
          }} />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-900 dark:text-gray-100">Rol Değişikliği</h2>
          <RoleChangeRequestSection user={user} />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-900 dark:text-gray-100">Bildirimler</h2>
          <Link
            href="/settings/notifications"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-lg hover:bg-brand-orange/90 transition-colors text-sm font-medium"
          >
            Bildirim Ayarları
          </Link>
        </div>

        {/* Engellenenler Bölümü */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-900 dark:text-gray-100">Engellenenler</h2>
          <BlockedUsersButton />
        </div>

        {/* Hesap Yönetimi Bölümü */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-900 dark:text-gray-100">Hesap Yönetimi</h2>
          <DeleteAccountSection />
        </div>
      </div>
    </div>
  )
}

function BlockedUsersButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff7b00] text-white rounded-lg hover:bg-[#e96d00] transition-colors text-sm font-medium"
      >
        Engellenenleri Görüntüle
      </button>

      {isModalOpen && (
        <BlockedUsersModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  )
}

function BlockedUsersModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()

  const { data: blockedUsers = [], isLoading } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: async () => {
      const response = await api.get('/users/me/blocked')
      return response.data || []
    },
  })

  const unblockMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/users/${userId}/block`)
    },
    onSuccess: () => {
      toast.success('Engel kaldırıldı')
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Engel kaldırılırken bir hata oluştu')
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] max-h-[70vh] bg-white dark:bg-[#111827] rounded-xl shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Engellenenler</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label="Kapat"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
            </div>
          ) : blockedUsers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              Henüz engellediğiniz kullanıcı yok.
            </p>
          ) : (
            <div className="space-y-3">
              {blockedUsers.map((blockedUser: any) => (
                <div
                  key={blockedUser.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {blockedUser.avatar ? (
                      <img
                        src={blockedUser.avatar}
                        alt={blockedUser.username}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                          {blockedUser.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        @{blockedUser.username}
                      </p>
                      {blockedUser.fullName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {blockedUser.fullName}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => unblockMutation.mutate(blockedUser.id)}
                    disabled={unblockMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-brand-orange hover:text-brand-orange/80 bg-brand-orange/10 dark:bg-brand-orange/20 rounded-lg hover:bg-brand-orange/20 dark:hover:bg-brand-orange/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {unblockMutation.isPending ? '...' : 'Engeli Kaldır'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UsernameField({ user, userData, onUpdate }: { user: any; userData: any; onUpdate: (user: any) => void }) {
  const [username, setUsername] = useState(user?.username || '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 14 gün kontrolü
  const canChangeUsername = useMemo(() => {
    if (!userData?.usernameLastChangedAt) return true
    const diffDays = (Date.now() - new Date(userData.usernameLastChangedAt).getTime()) / (1000 * 60 * 60 * 24)
    return diffDays >= 14
  }, [userData])

  const remainingDays = useMemo(() => {
    if (!userData?.usernameLastChangedAt) return 0
    const diffDays = (Date.now() - new Date(userData.usernameLastChangedAt).getTime()) / (1000 * 60 * 60 * 24)
    return Math.ceil(14 - diffDays)
  }, [userData])

  const handleSave = async () => {
    if (!username.trim() || username === user?.username) {
      setIsEditing(false)
      return
    }

    // 14 gün kontrolü - sadece gerçekten değiştirmeye çalıştığında kontrol et
    if (!canChangeUsername) {
      toast.error(`Kullanıcı adını 14 günde bir değiştirebilirsin.${remainingDays > 0 ? ` Bir sonraki değişiklik: ${remainingDays} gün sonra` : ''}`)
      return
    }

    setIsSaving(true)
    try {
      const response = await api.put('/users/profile', { username })
      toast.success('Kullanıcı adı güncellendi')
      onUpdate(response.data)
      setIsEditing(false)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Kullanıcı adı güncellenirken bir hata oluştu')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Kullanıcı Adı
      </label>
      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isSaving}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange disabled:opacity-50"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !username.trim() || username === user?.username}
              className="px-4 py-2 bg-brand-orange text-white rounded-lg hover:bg-brand-orange/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setUsername(user?.username || '')
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              İptal
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={user?.username || ''}
            disabled
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          />
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
          >
            Düzenle
          </button>
        </div>
      )}
    </div>
  )
}

function EmailField({ user, onUpdate }: { user: any; onUpdate: () => void }) {
  const [newEmail, setNewEmail] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleRequestEmailChange = async () => {
    if (!newEmail.trim() || newEmail === user?.email) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await api.post('/email-change/request', { newEmail })
      toast.success('E-posta adresini onaylaman için bir bağlantı gönderdik.')
      setNewEmail('')
      setIsEditing(false)
      onUpdate()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'E-posta değişiklik talebi oluşturulurken bir hata oluştu')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        E-posta
      </label>
      {isEditing ? (
        <div className="space-y-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Yeni e-posta adresi"
            disabled={isSaving}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange disabled:opacity-50"
          />
          <div className="flex gap-2">
            <button
              onClick={handleRequestEmailChange}
              disabled={isSaving || !newEmail.trim() || newEmail === user?.email}
              className="px-4 py-2 bg-brand-orange text-white rounded-lg hover:bg-brand-orange/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Gönderiliyor...' : 'Kaydet'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setNewEmail('')
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              İptal
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          />
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
          >
            Düzenle
          </button>
        </div>
      )}
    </div>
  )
}

function SecuritySection() {
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Şifre
        </label>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="px-4 py-2 text-sm font-medium bg-[#ff7b00] text-white hover:bg-[#e96d00] rounded-lg transition-colors"
        >
          Şifre Değiştir
        </button>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal
          open={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </>
  )
}

function ProfileColorSignatureToggle({ user, userData, onUpdate }: { user: any; userData: any; onUpdate: () => void }) {
  const [isEnabled, setIsEnabled] = useState(userData?.showProfileColorSignature ?? true)
  const [isSaving, setIsSaving] = useState(false)

  // userData değiştiğinde state'i güncelle
  useEffect(() => {
    if (userData?.showProfileColorSignature !== undefined) {
      setIsEnabled(userData.showProfileColorSignature)
    }
  }, [userData])

  const handleToggle = async () => {
    const newValue = !isEnabled
    setIsEnabled(newValue)
    setIsSaving(true)

    try {
      await api.put('/users/profile', { showProfileColorSignature: newValue })
      toast.success(newValue ? 'Renk imzası gösteriliyor' : 'Renk imzası gizlendi')
      onUpdate()
    } catch (error: any) {
      // Hata durumunda eski değere geri dön
      setIsEnabled(!newValue)
      toast.error(error.response?.data?.message || 'Ayar güncellenirken bir hata oluştu')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Profil Renk İmzası
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Yüklediğiniz eserlerden oluşan renk imzasını profilinizde gösterir.
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={isSaving}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          isEnabled ? 'bg-brand-orange' : 'bg-gray-300 dark:bg-gray-600'
        }`}
        role="switch"
        aria-checked={isEnabled}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

function RoleChangeRequestSection({ user }: { user: any }) {
  const [showModal, setShowModal] = useState(false)
  const currentRole = user?.activeRole || user?.roles?.[0] || 'art_lover'
  const normalizedCurrentRole = normalizeRole(currentRole)
  const currentRoleLabel = ROLE_METADATA[normalizedCurrentRole]?.label || 'Sanat Sever'

  return (
    <>
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Mevcut rolünüz: <span className="font-semibold">{currentRoleLabel}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Mevcut rolünüzü değiştirmek için yöneticilere talep gönderebilirsiniz. Rol değişikliği talepleri admin paneli üzerinden onaylanır.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-lg hover:bg-brand-orange/90 transition-colors text-sm font-medium"
        >
          <Send className="w-4 h-4" />
          Rol Değişikliği Talebi Gönder
        </button>
      </div>

      {showModal && (
        <RoleChangeRequestModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          currentRole={normalizedCurrentRole}
        />
      )}
    </>
  )
}

function RoleChangeRequestModal({ isOpen, onClose, currentRole }: { isOpen: boolean; onClose: () => void; currentRole: UserRoleCode }) {
  const [selectedRole, setSelectedRole] = useState<UserRoleCode | null>(null)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  // ✅ Her zaman tüm 4 rolü göster
  const allRoles = Object.keys(ROLE_METADATA) as UserRoleCode[]
  const normalizedCurrentRole = normalizeRole(currentRole)
  
  // ✅ Modal açıldığında/kapandığında state'i resetle
  useEffect(() => {
    if (!isOpen) {
      // Modal kapandığında state'i resetle
      setSelectedRole(null)
      setMessage('')
    }
  }, [isOpen])

  // ✅ Aktif role tıklama handler'ı
  const handleRoleClick = (role: UserRoleCode) => {
    const normalizedRole = normalizeRole(role)
    
    // Aktif rolse, seçim yapma ve mesaj göster
    if (normalizedRole === normalizedCurrentRole) {
      toast.error('Zaten bu role sahipsiniz.')
      return
    }
    
    // Aktif rolden farklı bir rolse, seç
    setSelectedRole(role)
  }

  const handleSubmit = async () => {
    if (!selectedRole) {
      toast.error('Lütfen bir rol seçin')
      return
    }
    
    // ✅ Ekstra güvenlik kontrolü: Mevcut rolü seçmeye çalışırsa engelle
    const normalizedSelected = normalizeRole(selectedRole)
    if (normalizedSelected === normalizedCurrentRole) {
      toast.error('Zaten bu role sahipsiniz.')
      return
    }

    setIsSubmitting(true)
    try {
      await api.post('/users/role-change-request', {
        requestedRole: selectedRole,
        message: message.trim() || undefined,
      })
      toast.success('Rol değişikliği talebiniz gönderildi. Yöneticiler tarafından incelenecektir.')
      setMessage('')
      setSelectedRole(null) // ✅ Reset
      onClose()
      queryClient.invalidateQueries({ queryKey: ['user-me'] })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Talep gönderilirken bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ✅ Seçilen rolün aktif rolden farklı olup olmadığını kontrol et
  const isRoleDifferent = selectedRole ? normalizeRole(selectedRole) !== normalizedCurrentRole : false

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#111827] rounded-xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Rol Değişikliği Talebi</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              İstenen Rol
            </label>
            <div className="space-y-2">
              {!selectedRole && (
                <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
                  Lütfen bir rol seçin
                </div>
              )}
              {allRoles.map((role) => {
                const Icon = ROLE_METADATA[role].icon
                const normalizedRole = normalizeRole(role)
                const isCurrentRole = normalizedRole === normalizedCurrentRole
                const isSelected = selectedRole === role && !isCurrentRole
                
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleClick(role)}
                    disabled={isCurrentRole}
                    className={`w-full flex items-center gap-3 px-4 py-3 border rounded-lg transition-all text-left ${
                      isCurrentRole
                        ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'border-brand-orange bg-brand-orange/5 dark:bg-brand-orange/10'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <Icon 
                      className={`w-5 h-5 flex-shrink-0 ${
                        isCurrentRole
                          ? 'text-gray-400 dark:text-gray-500'
                          : isSelected 
                          ? 'text-brand-orange' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`} 
                    />
                    <div className="flex-1 flex flex-col">
                      <span className={`text-sm font-medium ${
                        isCurrentRole
                          ? 'text-gray-400 dark:text-gray-500'
                          : isSelected
                          ? 'text-brand-orange dark:text-brand-orange'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {ROLE_METADATA[role].label}
                      </span>
                      {isCurrentRole && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Zaten bu role sahipsiniz
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              Açıklama (Opsiyonel)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Rol değişikliği talebinizin nedenini açıklayabilirsiniz..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !isRoleDifferent}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-lg hover:bg-brand-orange/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              İptal
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeleteAccountSection() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Hesabınızı kalıcı olarak silme işlemlerini buradan yönetebilirsiniz.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm font-medium text-red-500 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-colors"
        >
          Hesabı Sil
        </button>
      </div>

      {showModal && (
        <DeleteAccountModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  )
}

