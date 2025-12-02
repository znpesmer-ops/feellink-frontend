'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Search, Mail, Calendar, Shield, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import RoleChanger from '@/components/admin/RoleChanger'
import { ROLE_METADATA } from '@/lib/role-utils'
import { BadgeState, SubscriptionPlanCode, UserRoleCode } from '@/types/capabilities'

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
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchUsers()
  }, [page, searchQuery])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get(
        `/admin/users?page=${page}&limit=20${searchQuery ? `&search=${searchQuery}` : ''}`
      )
      setUsers(response.data.users)
      setTotal(response.data.total)
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7b00]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold dark:text-white text-gray-900">Kullanıcılar</h2>
          <p className="text-sm mt-1 dark:text-gray-400 text-gray-600">
            Toplam {total} kullanıcı
          </p>
        </div>
      </div>

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

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm dark:bg-[#111] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0d0d0d] border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Roller
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Takipçi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700">
                      <Mail size={14} className="text-gray-400" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(user.roles && user.roles.length > 0 ? user.roles : ['art_lover']).map((role) => (
                        <span
                          key={role}
                          className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]"
                        >
                          {ROLE_METADATA[role as UserRoleCode]?.label ?? role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {user.plan && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-200">
                          {user.plan === 'PRO' ? 'Pro Plan' : 'Free Plan'}
                        </span>
                      )}
                      {user.badges?.pro && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-yellow-500/20 dark:text-yellow-200">
                          🟤 Pro Rozeti
                        </span>
                      )}
                      {user.badges?.corporate_verified && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-600 dark:bg-orange-500/30 dark:text-orange-100">
                          🟧 Kurumsal
                        </span>
                      )}
                      {user.isVerified && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400">
                          Doğrulanmış
                        </span>
                      )}
                      {user.isOnline && (
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      )}
                    </div>
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
    </div>
  )
}
