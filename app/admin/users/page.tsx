'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Search, User as UserIcon, Mail, Calendar } from 'lucide-react'

interface User {
  id: string
  username: string
  email: string
  fullName?: string
  avatar?: string
  createdAt: string
  followerCount: number
  followingCount: number
  _count?: {
    posts: number
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await api.get('/users/search?q=')
        setUsers(response.data)
        setFilteredUsers(response.data)
      } catch (err) {
        console.error('Error fetching users:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users)
      return
    }

    const filtered = users.filter((user) => {
      const query = searchQuery.toLowerCase()
      return (
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.fullName?.toLowerCase().includes(query)
      )
    })

    setFilteredUsers(filtered)
  }, [searchQuery, users])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Kullanıcılar</h2>
        <p className="text-gray-500">Toplam {users.length} kullanıcı</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Kullanıcı ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Gönderi
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Takipçi
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tarih
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Kullanıcı bulunamadı
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-blue-600 font-semibold">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{user.username}</div>
                          {user.fullName && (
                            <div className="text-xs text-gray-500">{user.fullName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={14} className="text-gray-400" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-800 font-medium">
                        {user._count?.posts || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-800 font-medium">
                        {user.followerCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


