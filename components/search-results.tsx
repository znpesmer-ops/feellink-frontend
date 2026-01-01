'use client'

import Link from 'next/link'
import UserBadge from './UserBadge'
import { Avatar } from '@/components/ui/Avatar'
import { safeAvatar } from '@/lib/avatar-constants'

interface SearchUser {
  id: string
  username: string
  fullName?: string | null
  avatar?: string | null
  avatarUrl?: string | null
  isVerified?: boolean
  role?: string
}

interface SearchResultsProps {
  results: SearchUser[]
  onSelect: (username: string) => void
  isLoading: boolean
}

// ✅ Avatar component'i artık components/ui/Avatar.tsx'ten import ediliyor

export function SearchResults({ results, onSelect, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50 max-h-96 overflow-y-auto">
        <div className="p-4 text-center">
          <div className="inline-block w-5 h-5 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Aranıyor...</p>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Kullanıcı bulunamadı
        </div>
      </div>
    )
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="py-2">
        {results.map((user) => {
          // Güvenli fallback: username yoksa id kullan
          const profilePath = user.username 
            ? `/profile/${user.username}` 
            : `/profile/${user.id}`
          
          // ✅ Avatar değerini güvenli şekilde normalize et
          // ✅ safeAvatar fonksiyonu tüm geçersiz değerleri temizler
          const avatarSrc = safeAvatar(user.avatarUrl || user.avatar)
          
          return (
            <Link
              key={user.id}
              href={profilePath}
              onClick={(e) => {
                // Dropdown'u kapat ve arama sorgusunu temizle
                // Link zaten navigation yapacak, sadece dropdown'u kapatıyoruz
                onSelect(user.username || user.id)
              }}
              className="block w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50/60 dark:hover:bg-orange-500/10 rounded-xl transition-colors text-left group no-underline hover:no-underline focus:no-underline text-inherit"
            >
              {/* ✅ Avatar - Güvenli fallback ile */}
              {/* ✅ Profil fotoğrafı yoksa beyaz profesyonel ikon kullanılır */}
              {/* ✅ Kadın görseli hiçbir durumda görünmemeli */}
              <Avatar
                src={avatarSrc}
                alt={user.fullName || user.username}
                className="w-9 h-9 flex-shrink-0"
              />

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user.fullName || user.username}
                  </p>
                  {user.isVerified && (
                    <svg
                      className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  <UserBadge role={user.role} className="-ml-1" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  @{user.username || user.id}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

