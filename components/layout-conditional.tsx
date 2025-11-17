'use client'

import { usePathname } from 'next/navigation'
import { SidebarPersistent } from '@/components/sidebar-persistent'
import { Header } from '@/components/header'
import { Navbar } from '@/components/navbar'
import { memo } from 'react'

/**
 * LayoutConditional - Persistent Layout System
 * Route değişimlerinde Sidebar ve Header unmount olmaz
 * Bu sayede roller ve sidebar içeriği korunur
 * 
 * memo ile optimize edildi - route değişimlerinde gereksiz yeniden render önlenir
 */
function LayoutConditionalComponent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isRoleSelection = pathname === '/select-role'
  const isFeed = pathname === '/feed'

  // Role selection sayfası için minimal layout
  if (isRoleSelection) {
    return <>{children}</>
  }

  // Normal sayfalar için tam layout
  // SidebarPersistent wrapper sayesinde Sidebar route değişimlerinde unmount olmaz
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Sol Sidebar - Persistent (route değişimlerinde unmount olmaz) */}
      <SidebarPersistent />

      {/* Sağ taraf - Header + İçerik */}
      <div className="min-h-screen flex flex-col lg:ml-64">
        {/* Header - Üstte Sabit (sadece desktop'ta görünür) */}
        <div className="hidden md:block sticky top-0 z-40 border-b border-gray-200/70 dark:border-white/10 bg-white/95 dark:bg-gray-950/95 backdrop-blur">
          <Header />
        </div>

        {/* Sayfa içeriği - Header altında */}
        {/* 🔥 KRİTİK: Header ile içerik arasında profesyonel boşluk */}
        {/* Ana sayfa (/feed) için daha az spacing, diğer sayfalar için normal */}
        <main className={`flex-1 pt-8 md:pt-14 pb-20 md:pb-12 px-4 md:px-8 bg-white dark:bg-gray-950 transition-colors ${
          isFeed ? 'mt-4 md:mt-6' : 'mt-8 md:mt-10'
        }`}>
          {children}
        </main>
      </div>

      {/* Mobil Navbar - Sadece mobilde görünür */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50">
        <Navbar />
      </div>
    </div>
  )
}

// memo ile optimize et - children değişmediği sürece yeniden render olmaz
export const LayoutConditional = memo(LayoutConditionalComponent)

