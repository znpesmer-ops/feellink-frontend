'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarPersistent } from '@/components/sidebar-persistent'
import { Header } from '@/components/header'
import RightSidebar from '@/components/right-sidebar'
import { useAuthStore } from '@/lib/store'
import { Menu, User, LogOut, X } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/lib/theme-context'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import api from '@/lib/api'
import { Sidebar } from '@/components/sidebar'

function LayoutConditionalComponent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, accessToken, refreshToken, clearAuth } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const [rightSidebarTitle, setRightSidebarTitle] = useState('Keşfet')
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false)
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null)

  const isFeed = pathname.startsWith('/feed')
  const isRoleSelection = pathname === '/select-role'

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
      // replace kullanarak geri butonuna basınca geri dönmesin
      router.replace('/login')
    }
  }

  if (isRoleSelection) return <>{children}</>

  // Eğer user yoksa direkt children render et
  if (!accessToken || !user) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* SOL SİDEBAR - Desktop */}
      <div className="hidden lg:block fixed left-0 top-[31px] h-[calc(100vh-31px)] w-64 z-[99999]">
        <SidebarPersistent />
      </div>

      {/* HEADER */}
      <div className="fixed top-0 left-0 right-0 lg:left-64 z-[100]">
        <Header />
      </div>

      {/* ANA İÇERİK */}
      <div className="pt-[64px] lg:pl-64">
        <div className="flex">
          <main className="flex-1 px-4 md:px-10 pb-20 max-w-[900px] xl:max-w-[1100px] mx-auto">
            {children}
          </main>
          {isFeed && (
            <aside className="hidden xl:block w-[380px] flex-shrink-0 pt-4 pr-6">
              <RightSidebar />
            </aside>
          )}
        </div>
      </div>

      {/* Mobil Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/70 z-40"
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
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>
            <Sidebar forceVisible={true} onLinkClick={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobil Sağ Sidebar */}
      {isFeed && rightSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/70 z-40"
          onClick={() => setRightSidebarOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-gray-950 shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <p className="text-sm font-semibold">{rightSidebarTitle}</p>
              <button onClick={() => setRightSidebarOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <RightSidebar />
            </div>
          </div>
        </div>
      )}

      {/* Mobil Header */}
      {accessToken && user && (
        <div className="lg:hidden fixed top-0 left-0 right-0 z-[100] border-b-2 border-brand-orange/30 bg-white/95 dark:bg-[#0a0f1f]/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)}>
                <Menu size={22} />
              </button>
              <div className="text-sm font-semibold">
                <span className="text-[#ff7b00]">Feellink</span>
              </div>
            </div>
            <div className="flex items-center gap-2 relative" ref={mobileProfileMenuRef}>
              <button onClick={toggleTheme} className="p-2 rounded-lg">
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              {isFeed && (
                <button onClick={() => { setRightSidebarOpen(true); setRightSidebarTitle('Keşfet'); }}>
                  <User size={20} />
                </button>
              )}
              <div className="relative">
                <button onClick={() => setMobileProfileMenuOpen(!mobileProfileMenuOpen)}>
                  <div className="w-7 h-7 rounded-full bg-[#ff7b00] flex items-center justify-center text-white text-xs">
                    {user.avatar ? (
                      <img src={resolveImageUrl(user.avatar)} alt={user.username} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span>{user.username?.charAt(0).toUpperCase() || 'U'}</span>
                    )}
                  </div>
                </button>
                {mobileProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border z-50">
                    <Link href={`/profile/${user.username || ''}`} onClick={() => setMobileProfileMenuOpen(false)} className="block px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b">
                      <div className="flex items-center gap-2">
                        <User size={18} />
                        <span>Profilim</span>
                      </div>
                    </Link>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                      <LogOut size={18} />
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="px-4 pb-3">
            <Header forceMobile={true} />
          </div>
        </div>
      )}
    </div>
  )
}

export const LayoutConditional = memo(LayoutConditionalComponent)
