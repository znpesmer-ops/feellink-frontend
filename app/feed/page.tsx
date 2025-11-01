'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { initSocket } from '@/lib/socket'
import { AuthGuard } from '@/lib/auth-guard'
import HighlightsRow from '@/components/highlights-row'
import RightSidebar from '@/components/right-sidebar'

function FeedContent() {
  const router = useRouter()
  const { accessToken } = useAuthStore()

  useEffect(() => {
    if (!accessToken) {
      router.push('/login')
      return
    }

    // Initialize socket for notifications
    const socket = initSocket(accessToken)

    socket.on('notification', (notification) => {
      console.log('New notification:', notification)
      // You can add a toast notification here
    })

    return () => {
      socket.off('notification')
    }
  }, [accessToken, router])

  // Feed sayfası artık sadece "Ayın Öne Çıkanları" bölümünü gösteriyor
  // Tüm yazılar /all-posts sayfasında görüntüleniyor

  if (!accessToken) {
    return null
  }

  return (
    <div className="flex justify-center gap-10 pt-6 px-6 max-w-7xl mx-auto">
      {/* 📰 Orta içerik - GENİŞLETİLMİŞ */}
      <div className="flex-1 max-w-[1200px] space-y-10 mx-auto xl:mr-[420px]">
        {/* 🔸 Ayın Öne Çıkanları — gönderilerden ayrı blok */}
        <div className="w-full">
          <HighlightsRow />
        </div>

        {/* 🔸 Gönderiler kısmı - Kaldırıldı: Sadece /all-posts sayfasında görüntüleniyor */}
      </div>

      {/* 🟠 Sağ sabit sidebar */}
      <RightSidebar />
    </div>
  )
}

export default function FeedPage() {
  return (
    <AuthGuard>
      <FeedContent />
    </AuthGuard>
  )
}

