'use client'

import { useState } from 'react'
import { Edit3, X } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { CapabilitySummary, SidebarVisibility, UserRoleCode } from '@/types/capabilities'

interface RoleChangerProps {
  user: {
    id: string
    username: string
    fullName?: string
    roles?: UserRoleCode[]
  }
  onUpdate?: () => void
  isOwnProfile?: boolean
}

const roleLabels: Record<UserRoleCode, string> = {
  art_lover: 'Sanat Sever',
  corporate: 'Kurumsal',
  collector: 'Koleksiyoner',
  artist: 'Sanatçı',
}

const allRoles: UserRoleCode[] = ['art_lover', 'corporate', 'collector', 'artist']

export default function RoleChanger({ user, onUpdate, isOwnProfile = false }: RoleChangerProps) {
  const { user: currentUser, capabilities, setUser, setCapabilities, refreshUser } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [roles, setRoles] = useState<UserRoleCode[]>(user.roles || [])
  const [saving, setSaving] = useState(false)

  const toggleRole = (role: UserRoleCode) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const endpoint = isOwnProfile ? '/users/me/roles' : `/admin/users/${user.id}/roles`
      const response = await api.patch<{ user: any; capabilities: CapabilitySummary; sidebar?: SidebarVisibility }>(
        endpoint,
        { roles }
      )
      
      setOpen(false)
      
      // Update store if updating own profile
      if (isOwnProfile && currentUser && currentUser.id === user.id) {
        const updatedUser = {
          ...currentUser,
          roles: response.data.user?.roles || roles,
        }
        setUser(updatedUser, response.data.capabilities, response.data.sidebar ?? null)
        setCapabilities(response.data.capabilities, response.data.sidebar ?? null)
        
        setTimeout(async () => {
          await refreshUser()
        }, 200)
      }
      
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating roles:', error)
      alert('Roller güncellenirken bir hata oluştu')
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
                disabled={roles.length === 0 || saving}
                className="px-6 py-2.5 rounded-lg bg-[var(--accent)] text-white hover:bg-[#e96d00] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

