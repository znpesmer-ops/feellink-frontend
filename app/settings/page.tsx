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
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
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

