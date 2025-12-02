'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { initSocket, initPostsSocket } from '@/lib/socket'
import { AuthGuard } from '@/lib/auth-guard'
import HighlightsRow from '@/components/highlights-row'
import RightSidebar from '@/components/right-sidebar'
import PostCard from '@/components/PostCard'
import api from '@/lib/api'

function FeedContent() {
  const router = useRouter()
  const { accessToken, user } = useAuthStore()
  const [feedPosts, setFeedPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openMobileSidebar, setOpenMobileSidebar] = useState(false)

  useEffect(() => {
    if (!accessToken) {
      router.push('/login')
      return
    }

    // Fetch feed posts
    const fetchFeed = async () => {
      try {
        setIsLoading(true)
        const res = await api.get('/feed')
        const posts = res.data.posts || res.data || []
        
        // Transform backend post format to PostCard format
        const transformedPosts = posts.map((post: any) => ({
          id: post.id,
          title: post.caption || 'Gönderi',
          content: post.caption || '',
          cover: post.media?.[0]?.url || null,
          author: post.user?.fullName || post.user?.username || 'Kullanıcı',
          authorUsername: post.user?.username,
          authorAvatar: post.user?.avatar,
          authorId: post.user?.id,
          userId: post.userId || post.user?.id,
          likes: post._count?.likes || 0,
          likedBy: post.isLiked ? [user?.id] : [],
          date: post.createdAt,
          createdAt: post.createdAt,
        }))
        
        setFeedPosts(transformedPosts)
      } catch (error) {
        console.error('Feed posts alınamadı:', error)
        setFeedPosts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeed()

    // Initialize socket for notifications and new posts
    const socket = initSocket(accessToken)
    const postsSocket = initPostsSocket(accessToken)

    socket.on('notification', (notification) => {
      console.log('New notification:', notification)
    })

    // Listen for new posts from followed users
    postsSocket.on('newPost', (post: any) => {
      console.log('New post received:', post)
      // Transform and add to feed
      const transformedPost = {
        id: post.id,
        title: post.caption || 'Gönderi',
        content: post.caption || '',
        cover: post.media?.[0]?.url || null,
        author: post.user?.fullName || post.user?.username || 'Kullanıcı',
        authorUsername: post.user?.username,
        authorAvatar: post.user?.avatar,
        likes: post._count?.likes || 0,
        likedBy: [],
        date: post.createdAt,
        createdAt: post.createdAt,
      }
      setFeedPosts((prev) => [transformedPost, ...prev])
    })

    return () => {
      socket.off('notification')
      postsSocket.off('newPost')
      postsSocket.disconnect()
    }
  }, [accessToken, router, user?.id])

  if (!accessToken) {
    return null
  }

  return (
    <div className="w-full relative">
      {/* Desktop'ta orta içerik - Sol sidebar alanı için padding, sağ sidebar için margin */}
      {/* Layout-conditional'daki lg:ml-64 (256px) margin'ini override etmek için full width container */}
      <div className="hidden lg:block w-screen relative -ml-64">
        <div className="pl-64 pr-[452px]">
          {/* Orta Feed - Maksimum 900px genişlikte ortalanır */}
          <main className="max-w-[900px] mx-auto px-6">
            <div className="space-y-6 md:space-y-10">
            {/* 🔸 Ayın Öne Çıkanları — gönderilerden ayrı blok */}
            <div className="w-full">
              <HighlightsRow />
            </div>

            {/* 🔸 Keşfet */}
            <div className="w-full">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 md:mb-6">Keşfet</h2>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
                </div>
              ) : feedPosts.length === 0 ? (
                <div className="text-center py-12 md:py-20 bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-900 px-4">
                  <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg mb-2">
                    Henüz keşfedecek gönderi yok
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                    Yeni kişileri takip ederek gönderilerini burada görebilirsin
                  </p>
                  <button
                    onClick={() => router.push('/explore')}
                    className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl shadow-sm transition-colors font-medium"
                  >
                    Keşfet
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {feedPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Desktop Sağ Sidebar - En sağda, ekranın sağ kenarına sabitlenmiş, header'ın border çizgisi ile aynı hizada başlıyor (header'daki profil ikonu ile aynı hizada - pr-8 = 32px) */}
      {/* top-16 = header yüksekliği (h-16 = 64px), sidebar header'ın hemen altından başlıyor, boşluk yok */}
      <div className="hidden lg:block fixed right-8 top-16 w-[420px] h-[calc(100vh-4rem)] overflow-y-auto border-t border-gray-100 dark:border-gray-800">
        <RightSidebar />
      </div>
      
      {/* Mobil: Grid olmadan tam genişlik */}
      <div className="lg:hidden max-w-7xl mx-auto px-4 md:px-8 space-y-6 md:space-y-10">
        {/* 🔸 Ayın Öne Çıkanları — gönderilerden ayrı blok */}
        <div className="w-full">
          <HighlightsRow />
        </div>

        {/* 🔸 Mobil Açılır-Kapanır Sidebar - Ayın Müzeleri & Yazarları */}
        <div className="lg:hidden w-full">
          <button
            onClick={() => setOpenMobileSidebar(!openMobileSidebar)}
            className="w-full bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-xl p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
          >
            <span className="font-semibold text-sm">Ayın Müzeleri & Yazarları</span>
            <ChevronDown
              className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                openMobileSidebar ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openMobileSidebar && (
            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 rounded-xl mt-2 p-4 shadow-sm">
              <RightSidebar />
            </div>
          )}
        </div>

        {/* 🔸 Keşfet */}
        <div className="w-full">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 md:mb-6">Keşfet</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
            </div>
          ) : feedPosts.length === 0 ? (
            <div className="text-center py-12 md:py-20 bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-900 px-4">
              <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg mb-2">
                Henüz keşfedecek gönderi yok
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                Yeni kişileri takip ederek gönderilerini burada görebilirsin
              </p>
              <button
                onClick={() => router.push('/explore')}
                className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl shadow-sm transition-colors font-medium"
              >
                Keşfet
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {feedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>
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

