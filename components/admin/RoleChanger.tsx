'use client'

import { useState, useEffect } from 'react'
import { Edit3, X } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { CapabilitySummary, SidebarVisibility, UserRoleCode } from '@/types/capabilities'

interface RoleChangerProps {
  user: {
    id: string
    username: string
    fullName?: string
    email?: string
    roles?: UserRoleCode[]
    dateOfBirth?: string | null
    country?: string | null
    city?: string | null
    gender?: string | null
  }
  onUpdate?: () => void
  isOwnProfile?: boolean
}

// Util: Yaş hesaplama
function calcAge(birthDate?: string | null): number | null {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}

// Util: Cinsiyet label
function genderLabel(g?: string | null): string {
  if (g === 'FEMALE') return 'Kadın'
  if (g === 'MALE') return 'Erkek'
  if (g === 'UNSPECIFIED') return 'Belirtmek istemiyorum'
  return '-'
}

const roleLabels: Record<UserRoleCode, string> = {
  art_lover: 'Sanat Sever',
  corporate: 'Kurumsal',
  collector: 'Koleksiyoner',
  artist: 'Sanatçı',
}

const allRoles: UserRoleCode[] = ['art_lover', 'corporate', 'collector', 'artist']

interface RoleHistoryItem {
  id: string
  oldRoles: UserRoleCode[]
  newRoles: UserRoleCode[]
  changedBy: string
  createdAt: string
}

export default function RoleChanger({ user, onUpdate, isOwnProfile = false }: RoleChangerProps) {
  const { user: currentUser, capabilities, setUser, setCapabilities, refreshUser } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [roles, setRoles] = useState<UserRoleCode[]>(user.roles || [])
  const [saving, setSaving] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [roleHistory, setRoleHistory] = useState<RoleHistoryItem[]>([])
  const [remainingDays, setRemainingDays] = useState<number | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const toggleRole = (role: UserRoleCode) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  // ESC tuşu ile modal'ı kapat
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showSuccessModal) {
        setShowSuccessModal(false)
      }
    }
    if (showSuccessModal) {
      document.addEventListener('keydown', handleEsc)
      return () => document.removeEventListener('keydown', handleEsc)
    }
  }, [showSuccessModal])

  // ✅ Rol geçmişi ve kalan gün bilgisini çek (admin panelinde ve modal açıldığında)
  useEffect(() => {
    if (open && !isOwnProfile) {
      setLoadingHistory(true)
      Promise.all([
        api.get(`/admin/users/${user.id}/role-history`).then(res => res.data),
        api.get(`/admin/users/${user.id}/role-change-remaining-days`).then(res => res.data.remainingDays),
      ])
        .then(([history, remaining]) => {
          setRoleHistory(history || [])
          setRemainingDays(remaining)
        })
        .catch(error => {
          console.error('Error fetching role history:', error)
          setRoleHistory([])
          setRemainingDays(null)
        })
        .finally(() => {
          setLoadingHistory(false)
        })
    }
  }, [open, user.id, isOwnProfile])

  const handleSave = async () => {
    try {
      setSaving(true)
      const endpoint = isOwnProfile ? '/users/me/roles' : `/admin/users/${user.id}/roles`
      
      // Admin panelinde rol değiştirme: Sadece user objesi döner (capabilities/sidebar gerekmez)
      // Kendi profilinde rol değiştirme: capabilities ve sidebar döner
      const response = await api.patch<any>(
        endpoint,
        { roles }
      )
      
      setOpen(false)
      
      // Update store if updating own profile
      if (isOwnProfile && currentUser && currentUser.id === user.id) {
        const updatedUser = {
          ...currentUser,
          roles: response.data.user?.roles || response.data.roles || roles,
        }
        // Kendi profilinde capabilities ve sidebar da gelir
        if (response.data.capabilities && response.data.sidebar !== undefined) {
          setUser(updatedUser, response.data.capabilities, response.data.sidebar ?? null)
          setCapabilities(response.data.capabilities, response.data.sidebar ?? null)
        } else {
          // Admin panelinde sadece roller güncellenir
          setUser(updatedUser, capabilities, null)
        }
        
        setTimeout(async () => {
          await refreshUser()
        }, 200)
      }
      
      if (onUpdate) {
        onUpdate()
      }

      // Başarı mesajı (kendi profilinde değilse, yani admin panelinde)
      if (!isOwnProfile) {
        setShowSuccessModal(true)
      }
    } catch (error: any) {
      console.error('Error updating roles:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Roller güncellenirken bir hata oluştu'
      alert(errorMessage) // Hata durumunda hala alert kullanıyoruz (gelecekte hata modal'ı eklenebilir)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setRoles(user.roles || [])
          setOpen(true)
        }}
        className="flex items-center gap-1 text-sm text-[var(--sub)] hover:text-[var(--accent)] transition-colors"
      >
        <Edit3 size={16} />
        {isOwnProfile ? 'Rolleri Düzenle' : 'Rol Değiştir'}
      </button>

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[var(--card)] p-6 rounded-2xl w-full max-w-md mx-4 border border-[var(--border)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[var(--text)]">
                {isOwnProfile ? 'Rollerimi Düzenle' : `${user.fullName || user.username} için Rol Güncelle`}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--sub)] hover:text-[var(--text)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Kullanıcı Bilgileri (Admin panelinde) */}
            {!isOwnProfile && (
              <div className="mb-4 p-3 rounded-lg bg-[var(--muted)] border border-[var(--border)]">
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--sub)] min-w-[80px]">Kullanıcı:</span>
                    <span className="text-[var(--text)] font-medium">@{user.username}</span>
                  </div>
                  {user.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--sub)] min-w-[80px]">E-posta:</span>
                      <span className="text-[var(--text)]">{user.email}</span>
                    </div>
                  )}
                  {(user.country || user.city) && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--sub)] min-w-[80px]">Konum:</span>
                      <span className="text-[var(--text)]">
                        {[user.country, user.city].filter(Boolean).join(' / ') || '-'}
                      </span>
                    </div>
                  )}
                  {(calcAge(user.dateOfBirth) !== null || user.gender) && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--sub)] min-w-[80px]">Bilgi:</span>
                      <span className="text-[var(--text)]">
                        {[
                          calcAge(user.dateOfBirth) !== null ? `${calcAge(user.dateOfBirth)} yaş` : null,
                          genderLabel(user.gender) !== '-' ? genderLabel(user.gender) : null
                        ].filter(Boolean).join(' • ') || '-'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-sm text-[var(--sub)] mb-4">
              {isOwnProfile
                ? 'Hangi rollerde aktif olmak istiyorsunuz? Birden fazla rol seçebilirsiniz.'
                : 'Kullanıcının sahip olacağı rolleri seçin. Birden fazla rol seçilebilir.'}
            </p>

            <div className="flex flex-col gap-3 mb-6">
            {allRoles.map((role) => (
                <label
                  key={role}
                  className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={roles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="w-5 h-5 accent-[var(--accent)] cursor-pointer"
                    />
                    <span className="text-[var(--text)] font-medium">
                      {roleLabels[role]}
                    </span>
                  </div>
                  {roles.includes(role) && (
                    <span className="text-xs text-[var(--accent)] font-medium">✓ Seçili</span>
                  )}
                </label>
              ))}
            </div>

            {roles.length === 0 && (
              <p className="text-sm text-red-500 mb-4">
                En az bir rol seçmelisiniz.
              </p>
            )}

            {/* ✅ Kalan gün bilgisi (admin panelinde) */}
            {!isOwnProfile && remainingDays !== null && remainingDays > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-xs text-orange-400">
                  ⚠️ Rol değişikliği {remainingDays} gün sonra tekrar yapılabilir.
                </p>
              </div>
            )}

            {/* ✅ Rol Geçmişi (admin panelinde) */}
            {!isOwnProfile && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <h4 className="text-xs font-medium text-white/60 mb-2">
                  Önceki Rol Değişiklikleri
                </h4>
                {loadingHistory ? (
                  <p className="text-xs text-white/40">Yükleniyor...</p>
                ) : roleHistory.length === 0 ? (
                  <p className="text-xs text-white/40">Henüz değişiklik yok</p>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {roleHistory.slice(0, 5).map((item) => {
                      const oldRolesStr = item.oldRoles.map(r => roleLabels[r] || r).join(', ') || 'Yok'
                      const newRolesStr = item.newRoles.map(r => roleLabels[r] || r).join(', ')
                      const dateStr = new Date(item.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                      
                      return (
                        <div
                          key={item.id}
                          className="text-xs text-white/70"
                        >
                          <span className="text-white/50">{oldRolesStr}</span>
                          {' → '}
                          <span className="text-white/90 font-medium">{newRolesStr}</span>
                          <span className="ml-2 text-white/40">
                            ({dateStr})
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setOpen(false)}
                className="px-6 py-2.5 rounded-lg bg-[var(--muted)] text-[var(--text)] hover:bg-[var(--border)] transition-colors font-medium"
                disabled={saving}
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={roles.length === 0 || saving || (!isOwnProfile && remainingDays !== null && remainingDays > 0)}
                className="px-6 py-2.5 rounded-lg bg-[var(--accent)] text-white hover:bg-[#e96d00] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Başarı Modal */}
      {showSuccessModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowSuccessModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl bg-[#0f172a] border border-white/10 shadow-2xl p-6 text-center mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Başarı İkonu */}
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
              <svg
                className="h-6 w-6 text-orange-500"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Başlık */}
            <h3 className="text-lg font-semibold text-white">
              Rol Güncellendi
            </h3>

            {/* Açıklama */}
            <p className="mt-2 text-sm text-white/70">
              Kullanıcının rolü başarıyla güncellendi ve bilgilendirme e-postası gönderildi.
            </p>

            {/* Tamam Butonu */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="mt-6 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </>
  )
}

