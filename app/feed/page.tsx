'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
    <div className="grid grid-cols-[240px_minmax(0,1fr)_420px] gap-0 w-full">
      <div />

      {/* 📰 Orta içerik - GENİŞLETİLMİŞ */}
      {/* 🔥 KRİTİK: Ana sayfa için minimal padding - header ile hizalama */}
      <div className="col-start-2 col-end-3 px-8 space-y-10">
        {/* 🔸 Ayın Öne Çıkanları — gönderilerden ayrı blok */}
        <div className="w-full">
          <HighlightsRow />
        </div>

        {/* 🔸 Keşfet */}
        <div className="w-full">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Keşfet</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff7b00]"></div>
            </div>
          ) : feedPosts.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-900">
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                Henüz keşfedecek gönderi yok
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                Yeni kişileri takip ederek gönderilerini burada görebilirsin
              </p>
              <button
                onClick={() => router.push('/explore')}
                className="px-5 py-2.5 bg-[#ff7b00] hover:bg-[#e36f00] text-white rounded-xl shadow-sm transition-colors font-medium"
              >
                Keşfet
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {feedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🟠 Sağ sabit sidebar */}
      {/* 🔥 KRİTİK: Ana içerikle aynı hizada başlaması için padding kaldırıldı */}
      <div className="col-start-3 col-end-4 px-4 sticky top-24 self-start">
        <RightSidebar />
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

