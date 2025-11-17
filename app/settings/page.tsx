'use client'

import Link from 'next/link'
import { AuthGuard } from '@/lib/auth-guard'
import { useAuthStore } from '@/lib/store'
import RoleChanger from '@/components/admin/RoleChanger'

function SettingsContent() {
  const { user } = useAuthStore()

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Ayarlar</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6 transition-colors">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Profil Bilgileri</h2>
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
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Bildirimler</h2>
          <Link
            href="/settings/notifications"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff7b00] text-white rounded-lg hover:bg-[#e36f00] transition-colors text-sm font-medium"
          >
            Bildirim Ayarları
          </Link>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Roller</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Hangi rollerde aktif olmak istediğinizi seçin. Birden fazla rol seçebilirsiniz.
          </p>
          {user && (
            <RoleChanger
              user={{
                id: user.id,
                username: user.username || '',
                fullName: user.fullName || undefined,
                roles: user.roles || [],
              }}
              isOwnProfile={true}
            />
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Gizlilik</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Gizlilik ayarları yakında eklenecek.
          </p>
        </div>
      </div>
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

