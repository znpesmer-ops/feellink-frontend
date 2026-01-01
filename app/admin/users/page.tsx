'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Search, Mail, Calendar, Shield, CheckCircle, XCircle, Trash2, Ban, Unlock } from 'lucide-react'
import RoleChanger from '@/components/admin/RoleChanger'
import { ROLE_METADATA } from '@/lib/role-utils'
import { BadgeState, SubscriptionPlanCode, UserRoleCode } from '@/types/capabilities'
import DeleteModal from '@/components/DeleteModal'
import { TR_CITIES } from '@/constants/cities.tr'

interface User {
  id: string
  username: string
  email: string
  fullName?: string
  avatar?: string
  roles?: UserRoleCode[]
  plan?: SubscriptionPlanCode
  badges?: BadgeState
  isVerified: boolean
  isAdmin: boolean
  followerCount: number
  followingCount: number
  isOnline: boolean
  createdAt: string
  dateOfBirth?: string | null
  country?: string | null
  city?: string | null
  gender?: string | null
  profileCompleted?: boolean
  termsAcceptedAt?: string | null // ✅ Kullanıcı sözleşmesi onay tarihi
  accountStatus?: 'ACTIVE' | 'SUSPENDED' // 🔒 Hesap durumu
  suspendedAt?: string | null // 🔒 Askıya alma tarihi
  suspendedUntil?: string | null // 🔒 Askıya alma bitiş tarihi
  suspensionReason?: string | null // 🔒 Askıya alma nedeni
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [suspendModalOpen, setSuspendModalOpen] = useState(false)
  const [suspendDuration, setSuspendDuration] = useState<'24h' | '7d' | '30d' | 'indefinite'>('7d')
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendNote, setSuspendNote] = useState('')
  
  // Filter states
  const [cityFilter, setCityFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState<string>('')
  const [ageMin, setAgeMin] = useState<string>('')
  const [ageMax, setAgeMax] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [page, searchQuery, cityFilter, genderFilter, ageMin, ageMax])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', '20')
      if (searchQuery) params.append('search', searchQuery)
      if (cityFilter) params.append('city', cityFilter)
      if (genderFilter) params.append('gender', genderFilter)
      if (ageMin) params.append('ageMin', ageMin)
      if (ageMax) params.append('ageMax', ageMax)
      
      const response = await api.get(`/admin/users?${params.toString()}`)
      setUsers(response.data.users)
      setTotal(response.data.total)
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClearFilters = () => {
    setCityFilter('')
    setGenderFilter('')
    setAgeMin('')
    setAgeMax('')
    setPage(1)
  }

  const handleUpdateUser = async (userId: string, data: { roles?: UserRoleCode[]; isVerified?: boolean }) => {
    try {
      await api.patch(`/admin/users/${userId}`, data)
      await fetchUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Kullanıcı güncellenirken bir hata oluştu')
    }
  }

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return

    try {
      await api.delete(`/admin/users/${selectedUser.id}`)
      setDeleteModalOpen(false)
      setSelectedUser(null)
      await fetchUsers()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Kullanıcı silinemedi'
      alert(errorMessage)
      setDeleteModalOpen(false)
      setSelectedUser(null)
    }
  }

  const handleSuspendClick = (user: User) => {
    setSelectedUser(user)
    setSuspendModalOpen(true)
    setSuspendDuration('7d')
    setSuspendReason('')
    setSuspendNote('')
  }

  const handleSuspendConfirm = async () => {
    if (!selectedUser || !suspendReason) return

    try {
      const now = new Date()
      let until: Date | null = null

      if (suspendDuration === '24h') {
        until = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      } else if (suspendDuration === '7d') {
        until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      } else if (suspendDuration === '30d') {
        until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      } else {
        until = null // Süresiz
      }

      await api.patch(`/admin/users/${selectedUser.id}/suspend`, {
        until: until ? until.toISOString() : null,
        reason: suspendReason,
        note: suspendNote || undefined,
      })

      setSuspendModalOpen(false)
      setSelectedUser(null)
      setSuspendReason('')
      setSuspendNote('')
      await fetchUsers()
    } catch (error: any) {
      console.error('Error suspending user:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Kullanıcı askıya alınamadı'
      alert(errorMessage)
    }
  }

  const handleUnsuspend = async (userId: string) => {
    if (!confirm('Kullanıcının askısını kaldırmak istediğinize emin misiniz?')) return

    try {
      await api.patch(`/admin/users/${userId}/unsuspend`)
      await fetchUsers()
    } catch (error: any) {
      console.error('Error unsuspending user:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Askı kaldırılamadı'
      alert(errorMessage)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7b00]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold dark:text-white text-gray-900">Kullanıcılar</h2>
          <p className="text-sm mt-1 dark:text-gray-400 text-gray-600">
            Toplam {total} kullanıcı
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Kullanıcı ara..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-[#0d0d0d] dark:text-white"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0d0d0d] border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
          >
            {showFilters ? 'Filtreleri Gizle' : 'Filtreleri Göster'}
          </button>
          {(cityFilter || genderFilter || ageMin || ageMax) && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-[#0d0d0d] border border-gray-200 dark:border-gray-700 rounded-xl">
            {/* City Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Şehir
              </label>
              <select
                value={cityFilter}
                onChange={(e) => {
                  setCityFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-[#1a1a1a] dark:text-white"
              >
                <option value="">Tüm Şehirler</option>
                {TR_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cinsiyet
              </label>
              <select
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-[#1a1a1a] dark:text-white"
              >
                <option value="">Tümü</option>
                <option value="FEMALE">Kadın</option>
                <option value="MALE">Erkek</option>
                <option value="UNSPECIFIED">Belirtmemiş</option>
              </select>
            </div>

            {/* Age Min */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Yaş
              </label>
              <input
                type="number"
                placeholder="18"
                min="18"
                max="100"
                value={ageMin}
                onChange={(e) => {
                  setAgeMin(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-[#1a1a1a] dark:text-white"
              />
            </div>

            {/* Age Max */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Yaş
              </label>
              <input
                type="number"
                placeholder="100"
                min="18"
                max="100"
                value={ageMax}
                onChange={(e) => {
                  setAgeMax(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-[#1a1a1a] dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm dark:bg-[#111] bg-white overflow-hidden w-full">
        <div className="overflow-x-auto pr-2">
          <table className="w-full min-w-[1600px]">
            <thead className="bg-gray-50 dark:bg-[#0d0d0d] border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[180px]">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[220px]">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[80px]">
                  Yaş
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">
                  Ülke
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                  Şehir
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[140px]">
                  Cinsiyet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[200px]">
                  Roller / Yetki
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[180px]">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                  Hesap Durumu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">
                  Takipçi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[150px]">
                  Sözleşme Onayı
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[140px]">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-[#0d0d0d]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#ff7b00] flex items-center justify-center text-white font-semibold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium dark:text-white text-gray-900">
                          {user.username}
                        </div>
                        {user.fullName && (
                          <div className="text-xs dark:text-gray-400 text-gray-600">
                            {user.fullName}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700 min-w-0">
                      <Mail size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm dark:text-gray-300 text-gray-700">
                      {calcAge(user.dateOfBirth) !== null ? `${calcAge(user.dateOfBirth)}` : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm dark:text-gray-300 text-gray-700">
                      {user.country || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm dark:text-gray-300 text-gray-700">
                      {user.city || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm dark:text-gray-300 text-gray-700">
                      {genderLabel(user.gender)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {(user.roles && user.roles.length > 0 ? user.roles : ['art_lover']).map((role) => {
                        const roleKey = role as UserRoleCode
                        const roleLabel = ROLE_METADATA[roleKey]?.label ?? role
                        
                        // Rol bazlı renk sistemi
                        let roleColorClasses = ''
                        if (roleKey === 'artist') {
                          roleColorClasses = 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30'
                        } else if (roleKey === 'corporate') {
                          roleColorClasses = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                        } else if (roleKey === 'collector') {
                          roleColorClasses = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30'
                        } else {
                          // art_lover
                          roleColorClasses = 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700/50'
                        }
                        
                        return (
                          <span
                            key={role}
                            className={`px-2.5 py-1 text-xs font-medium rounded-full border ${roleColorClasses}`}
                          >
                            {roleLabel}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {user.isAdmin && (
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30 whitespace-nowrap">
                          <Shield size={12} className="inline mr-1" />
                          Admin
                        </span>
                      )}
                      {user.isVerified && (
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 whitespace-nowrap">
                          Doğrulanmış
                        </span>
                      )}
                      {user.isOnline && (
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Çevrimiçi"></span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.accountStatus === 'SUSPENDED' ? (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">Askıda</span>
                          {user.suspendedUntil && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(user.suspendedUntil) > new Date()
                                ? `Bitiş: ${new Date(user.suspendedUntil).toLocaleDateString('tr-TR')}`
                                : 'Süresi doldu'}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="text-sm text-green-600 dark:text-green-400">Aktif</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-300 text-gray-700">
                    {user.followerCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600">
                      <Calendar size={14} className="text-gray-400" />
                      {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.termsAcceptedAt ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="text-sm dark:text-gray-300 text-gray-700" title={new Date(user.termsAcceptedAt).toLocaleString('tr-TR')}>
                          {new Date(user.termsAcceptedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm dark:text-gray-400 text-gray-500">Onay Yok</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3">
                      <RoleChanger user={user} onUpdate={fetchUsers} />
                      <button
                        onClick={() =>
                          handleUpdateUser(user.id, { isVerified: !user.isVerified })
                        }
                        className={`p-2 rounded-lg transition-colors ${
                          user.isVerified
                            ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        title={user.isVerified ? 'Doğrulamayı kaldır' : 'Doğrula'}
                      >
                        {user.isVerified ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </button>
                      {user.accountStatus === 'SUSPENDED' ? (
                        <button
                          onClick={() => handleUnsuspend(user.id)}
                          className="p-2 rounded-lg transition-colors text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                          title="Askıyı kaldır"
                        >
                          <Unlock className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspendClick(user)}
                          className="p-2 rounded-lg transition-colors text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                          title="Askıya al"
                        >
                          <Ban className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteClick(user)}
                        className="p-2 rounded-lg transition-colors text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Kullanıcıyı sil"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm dark:text-gray-400 text-gray-600">
            Toplam {total} kullanıcı
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-[#0d0d0d] bg-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
            >
              Önceki
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 20 >= total}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-[#0d0d0d] bg-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {/* Bilgi Notu */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/10 p-4 mb-4">
        <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
          <strong className="font-semibold">Feellink'te tüm kullanıcılar eşit özelliklere sahiptir.</strong> Yetkilendirme rol bazlıdır.
        </p>
      </div>

      {/* Askıya Alma Bilgi Notu */}
      <div className="rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50/50 dark:bg-orange-500/10 p-4">
        <p className="text-sm text-orange-800 dark:text-orange-300 leading-relaxed">
          <strong className="font-semibold">ℹ️ Askıya Alma Davranışı:</strong> Askıya alınan kullanıcılar yazma aksiyonlarını (gönderi, yorum, mesaj, ilan, etkinlik) gerçekleştiremez. Okuma ve görüntüleme işlemleri devam eder. Kullanıcıya sadece <strong>neden</strong> gösterilir, admin notu gizli kalır.
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        open={deleteModalOpen}
        user={selectedUser}
        onClose={() => {
          setDeleteModalOpen(false)
          setSelectedUser(null)
        }}
        onConfirm={handleDeleteConfirm}
      />

      {/* Askıya Alma Modal */}
      {suspendModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Kullanıcıyı Askıya Al
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              <strong>{selectedUser.username}</strong> kullanıcısını askıya almak istediğinize emin misiniz?
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Süre
                </label>
                <select
                  value={suspendDuration}
                  onChange={(e) => setSuspendDuration(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-[#1a1a1a] dark:text-white"
                >
                  <option value="24h">24 Saat</option>
                  <option value="7d">7 Gün</option>
                  <option value="30d">30 Gün</option>
                  <option value="indefinite">Süresiz</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Neden <span className="text-red-500">*</span>
                </label>
                <select
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-[#1a1a1a] dark:text-white"
                >
                  <option value="">Seçiniz...</option>
                  <option value="Spam / Bot davranışı">Spam / Bot davranışı</option>
                  <option value="Taciz / Nefret söylemi">Taciz / Nefret söylemi</option>
                  <option value="Telif ihlali şüphesi">Telif ihlali şüphesi</option>
                  <option value="Dolandırıcılık / Yanıltıcı ilan">Dolandırıcılık / Yanıltıcı ilan</option>
                  <option value="Sahte kimlik / Taklit">Sahte kimlik / Taklit</option>
                  <option value="Yasa dışı içerik / Yönlendirme">Yasa dışı içerik / Yönlendirme</option>
                  <option value="Güvenlik riski (hesap ele geçirilme şüphesi)">Güvenlik riski (hesap ele geçirilme şüphesi)</option>
                  <option value="Tekrarlayan topluluk ihlali">Tekrarlayan topluluk ihlali</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Notu (Opsiyonel)
                </label>
                <textarea
                  value={suspendNote}
                  onChange={(e) => setSuspendNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-[#1a1a1a] dark:text-white"
                  placeholder="İç not (kullanıcı görmez)"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setSuspendModalOpen(false)
                  setSelectedUser(null)
                  setSuspendReason('')
                  setSuspendNote('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSuspendConfirm}
                disabled={!suspendReason}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Askıya Al
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
