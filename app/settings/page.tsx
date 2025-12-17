'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AuthGuard } from '@/lib/auth-guard'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

function SettingsContent() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8 text-gray-900 dark:text-gray-100">Ayarlar</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6 transition-colors">
        <div>
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-900 dark:text-gray-100">Profil Bilgileri</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              />
            </div>
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
            </div>
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
          <BlockedUsersList />
        </div>
      </div>
    </div>
  )
}

function BlockedUsersList() {
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

  if (isLoading) {
    return <p className="text-gray-500 dark:text-gray-400 text-sm">Yükleniyor...</p>
  }

  if (blockedUsers.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        Engellediğin kullanıcı yok.
      </p>
    )
  }

  return (
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
                {blockedUser.username}
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
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {unblockMutation.isPending ? '...' : 'Engeli Kaldır'}
          </button>
        </div>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  )
}

