'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { SidebarPersistent } from '@/components/sidebar-persistent'
import { Header } from '@/components/header'
// import { Navbar } from '@/components/navbar' // Mobil alt bar kaldırıldı - hamburger menü yeterli
import { Sidebar } from '@/components/sidebar'
import RightSidebar from '@/components/right-sidebar'
import { Menu, X, User, LogOut } from 'lucide-react'
import { memo } from 'react'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { useTheme } from '@/lib/theme-context'

/**
 * LayoutConditional - Persistent Layout System
 * Route değişimlerinde Sidebar ve Header unmount olmaz
 * Bu sayede roller ve sidebar içeriği korunur
 * 
 * memo ile optimize edildi - route değişimlerinde gereksiz yeniden render önlenir
 */
function LayoutConditionalComponent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, accessToken, refreshToken, clearAuth } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const isRoleSelection = pathname === '/select-role'
  const isFeed = pathname === '/feed'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const [rightSidebarTitle, setRightSidebarTitle] = useState('Keşfet')
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false)
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null)

  // Close mobile profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileProfileMenuRef.current && !mobileProfileMenuRef.current.contains(event.target as Node)) {
        setMobileProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken })
      }
    } catch (error) {
      console.warn('Logout error:', error)
    } finally {
      clearAuth()
      setMobileProfileMenuOpen(false)
      router.push('/login')
    }
  }

  // Role selection sayfası için minimal layout
  if (isRoleSelection) {
    return <>{children}</>
  }

  // Normal sayfalar için tam layout
  // SidebarPersistent wrapper sayesinde Sidebar route değişimlerinde unmount olmaz
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Desktop Sol Sidebar - Persistent (route değişimlerinde unmount olmaz) */}
      <div className="hidden lg:block">
        <SidebarPersistent />
      </div>


      {/* Mobil Sol Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/70 z-40 animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-gray-950 shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">Feellink</p>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                aria-label="Menüyü kapat"
              >
                <X size={20} />
              </button>
            </div>
            <div className="w-full">
              <Sidebar 
                forceVisible={true} 
                onLinkClick={() => setSidebarOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobil Sağ Sidebar Overlay - Sadece /feed sayfasında */}
      {isFeed && rightSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/70 z-40 animate-in fade-in duration-200"
          onClick={() => setRightSidebarOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-gray-950 shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rightSidebarTitle}</p>
              <button
                onClick={() => setRightSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                aria-label="Yan menüyü kapat"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <RightSidebar />
            </div>
          </div>
        </div>
      )}

      {/* Sağ taraf - Header + İçerik */}
      <div className="min-h-screen flex flex-col lg:ml-64">
        {/* Header - Üstte Sabit (sadece desktop'ta görünür) */}
        <div className="hidden md:block sticky top-0 z-40 border-b border-gray-200/70 dark:border-white/10 bg-white/95 dark:bg-gray-950/95 backdrop-blur">
          <Header />
        </div>

        {/* Mobil Header - Kompakt (Sadece giriş yapılmışsa göster) */}
        {accessToken && user && (
          <div className="md:hidden sticky top-0 z-30 border-b border-gray-200/70 dark:border-white/10 bg-white/95 dark:bg-gray-950/95 backdrop-blur">
            {/* Üst satır: Hamburger + Logo + Theme Toggle + Profil */}
            <div className="flex items-center justify-between px-4 py-3">
              {/* Sol: Hamburger + Logo */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
                  aria-label="Menüyü aç"
                >
                  <Menu size={22} />
                </button>
                <div className="text-sm font-semibold text-[#1f1f1f] dark:text-gray-100">
                  <span className="text-[#ff7b00]">Feellink</span>
                </div>
              </div>
              
              {/* Sağ: Theme Toggle + Sağ Sidebar Butonu + Profil Menüsü */}
              <div className="flex items-center gap-2 relative" ref={mobileProfileMenuRef}>
                {/* Theme Toggle Button */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                  aria-label="Tema değiştir"
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

                {/* /feed sayfasında sağ sidebar butonu */}
                {isFeed && (
                  <button
                    onClick={() => {
                      setRightSidebarOpen(true)
                      setRightSidebarTitle('Ayın Müzeleri & Yazarları')
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                    aria-label="Yan menüyü aç"
                  >
                    <User size={20} />
                  </button>
                )}
                
                {/* Profil Dropdown Menü */}
                <div className="relative">
                  <button
                    onClick={() => setMobileProfileMenuOpen(!mobileProfileMenuOpen)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                    aria-label="Profil menüsü"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#ff7b00] flex items-center justify-center text-white font-semibold text-xs overflow-hidden">
                      {user.avatar ? (
                        <img
                          src={resolveImageUrl(user.avatar)}
                          alt={user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{user.username?.charAt(0).toUpperCase() || 'U'}</span>
                      )}
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {mobileProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Link
                        href={`/profile/${user.username || ''}`}
                        onClick={() => setMobileProfileMenuOpen(false)}
                        className="block px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
                      >
                        <div className="flex items-center space-x-2">
                          <User size={18} className="text-gray-400" />
                          <span>Profilim</span>
                        </div>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                      >
                        <LogOut size={18} />
                        <span>Çıkış Yap</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Alt satır: Arama Barı (Mobil) */}
            <div className="px-4 pb-3">
              <Header forceMobile={true} />
            </div>
          </div>
        )}

        {/* Sayfa içeriği - Header altında */}
        {/* 🔥 KRİTİK: Header ile içerik arasında profesyonel boşluk */}
        {/* Ana sayfa (/feed) için daha az spacing ve padding override (grid yapısı için), diğer sayfalar için normal */}
        <main className={`flex-1 pt-4 md:pt-14 pb-20 md:pb-12 bg-white dark:bg-gray-950 transition-colors ${
          isFeed ? 'mt-4 md:mt-6 px-0' : 'mt-6 md:mt-10 px-4 md:px-8'
        }`}>
          {children}
        </main>
      </div>

      {/* Mobil Navbar - Kaldırıldı (hamburger menü yeterli) */}
      {/* <div className="md:hidden fixed inset-x-0 bottom-0 z-50">
        <Navbar />
      </div> */}
    </div>
  )
}

// memo ile optimize et - children değişmediği sürece yeniden render olmaz
export const LayoutConditional = memo(LayoutConditionalComponent)

