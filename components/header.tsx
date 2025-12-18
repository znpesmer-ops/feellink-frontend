'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { SearchResults } from './search-results'
import api from '@/lib/api'
import { useTheme } from '@/lib/theme-context'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

interface SearchUser {
  id: string
  username: string
  fullName?: string | null
  avatar?: string | null
  isVerified?: boolean
}

interface HeaderProps {
  forceMobile?: boolean
}

export function Header({ forceMobile = false }: HeaderProps = {}) {
  const router = useRouter()
  const { user, accessToken, refreshToken, clearAuth } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close search and menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])


  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearchOpen(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await api.get<SearchUser[]>('/search/users', {
          params: { q: searchQuery.trim(), limit: 10 },
        })
        setSearchResults(response.data)
        setIsSearchOpen(true)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleUserSelect = (username: string) => {
    // Sadece dropdown'u kapat ve arama sorgusunu temizle
    // Link component'i zaten navigation yapacak
    setSearchQuery('')
    setIsSearchOpen(false)
  }

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken })
      }
    } catch (error) {
      console.warn('Logout error:', error)
    } finally {
      clearAuth()
      setIsMenuOpen(false)
      // ✅ Logout sonrası redirect yok - kullanıcı bulunduğu sayfada kalır
    }
  }

  // Token yoksa veya user yoksa header'ı gösterme
  // Bu, login/register sayfalarında header'ın görünmemesini sağlar
  if (!accessToken || !user) {
    return null
  }

  // Mobil mod: Sadece arama barı
  if (forceMobile) {
    return (
      <div ref={searchRef} className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          placeholder="Kullanıcı ara..."
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => searchQuery && setIsSearchOpen(true)}
          className="w-full px-3 py-2 pl-9 pr-3 text-sm bg-gray-50 dark:bg-[#151b2d] border-2 border-gray-200 dark:border-brand-blue/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        {isLoading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <div className="w-3.5 h-3.5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Search Results Dropdown */}
        {isSearchOpen && (
          <SearchResults
            results={searchResults}
            onSelect={handleUserSelect}
            isLoading={isLoading}
          />
        )}
      </div>
    )
  }

  // Desktop mod: Tam header
  return (
    <header className="h-[64px] bg-gradient-to-r from-white via-blue-50/40 to-white dark:from-[#0a0f1f] dark:via-[#0f1625] dark:to-[#0a0f1f] border-b-2 border-brand-orange/30 dark:border-brand-orange/50 shadow-sm backdrop-blur-md transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between w-full h-full px-4 md:px-8 gap-3 md:gap-0">
        {/* Sol taraf - Hoş geldin (mobilde gizli, desktop'ta görünür) */}
        <div className="hidden md:block text-sm font-medium text-[#1f1f1f] dark:text-gray-100">
          Hoş geldin, <span className="text-brand-orange font-semibold">{user?.username}</span>
        </div>

        {/* Orta - Arama çubuğu */}
        <div className="w-full md:flex-1 md:flex md:justify-center">
          <div ref={searchRef} className="relative w-full max-w-[480px] md:mx-auto">
              <input
                ref={inputRef}
                type="text"
                placeholder="Kullanıcı ara..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery && setIsSearchOpen(true)}
                className="w-full px-4 py-2 pl-10 pr-4 text-sm bg-gradient-to-r from-white to-blue-50/50 dark:from-[#151b2d] dark:to-[#1a2342] border-2 border-brand-blue/30 dark:border-brand-blue/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg
                  className="w-5 h-5 text-brand-blue/60 dark:text-blue-400/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              {isLoading && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <div className="w-4 h-4 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Search Results Dropdown */}
              {isSearchOpen && (
                <SearchResults
                  results={searchResults}
                  onSelect={handleUserSelect}
                  isLoading={isLoading}
                />
              )}
          </div>
        </div>

        {/* Sağ taraf - Theme Toggle + Profil */}
        <div className="flex items-center justify-end gap-3 md:gap-4 md:pl-6">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          {/* Profile Menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center space-x-2 group hover:opacity-80 transition-opacity focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center text-white font-semibold text-sm overflow-hidden ring-2 ring-transparent group-hover:ring-brand-orange/20 transition-all">
                {user?.avatar ? (
                  <img
                    src={resolveImageUrl(user.avatar)}
                    alt={user.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Silently fallback to placeholder without logging
                      ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                    }}
                  />
                ) : (
                  <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#151b2d] rounded-2xl shadow-lg border border-gray-100 dark:border-brand-blue/30 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <Link
                  href="/profile/me"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1a2342] transition-colors border-b border-gray-100 dark:border-brand-blue/20"
                >
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span>Profilim</span>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Çıkış Yap</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

