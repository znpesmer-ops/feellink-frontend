'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { initSocket, initPostsSocket } from '@/lib/socket'
import { AuthGuard } from '@/lib/auth-guard'
import HighlightsRow from '@/components/highlights-row'
import PostCard from '@/components/PostCard'
import { PostModal } from '@/components/post-modal'
import api from '@/lib/api'

function FeedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { accessToken, user } = useAuthStore()
  const [feedPosts, setFeedPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null)

  // URL'den post ve comment parametrelerini oku
  useEffect(() => {
    const postId = searchParams.get('post')
    const commentId = searchParams.get('comment')
    
    if (postId) {
      setSelectedPostId(postId)
      if (commentId) {
        setHighlightCommentId(commentId)
      }
    }
  }, [searchParams])

  useEffect(() => {
    // Token kontrolü - localStorage'dan da kontrol et
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const hasToken = accessToken || tokenFromStorage

    if (!hasToken) {
      router.push('/login')
      return
    }

    // Fetch feed posts with retry mechanism
    const fetchFeed = async () => {
      let retryCount = 0
      const maxRetries = 3
      
      const fetchWithRetry = async (): Promise<void> => {
        try {
          setIsLoading(true)
          console.log('[Feed] 🔄 Fetching feed...')
          const res = await api.get('/feed')
          console.log('[Feed] ✅ API Response:', {
            status: res.status,
            hasData: !!res.data,
            dataKeys: res.data ? Object.keys(res.data) : [],
            postsCount: res.data?.posts?.length || 0,
            fullResponse: res.data
          })
          
          // Güvenli şekilde posts array'ini al
          let posts: any[] = []
          if (res.data) {
            if (Array.isArray(res.data.posts)) {
              posts = res.data.posts
              console.log('[Feed] ✅ Found posts in res.data.posts:', posts.length)
            } else if (Array.isArray(res.data)) {
              posts = res.data
              console.log('[Feed] ✅ Found posts in res.data (array):', posts.length)
            } else if (res.data.posts && Array.isArray(res.data.posts)) {
              posts = res.data.posts
              console.log('[Feed] ✅ Found posts in res.data.posts (nested):', posts.length)
            } else {
              console.warn('[Feed] ⚠️ No posts found in response:', res.data)
            }
          } else {
            console.warn('[Feed] ⚠️ No data in response')
          }
          
          // Array kontrolü - eğer posts array değilse boş array kullan
          if (!Array.isArray(posts)) {
            console.warn('[Feed] ⚠️ Posts is not an array, using empty array')
            posts = []
          }
          
          console.log('[Feed] 📊 Processing posts:', posts.length)
          
          // Transform backend post format to PostCard format
          // Undefined/null post'ları filtrele
          const transformedPosts = posts
            .filter((post: any) => post && post.id) // Güvenlik kontrolü
            .map((post: any) => ({
              id: post.id,
              title: post.caption || 'Gönderi',
              content: post.caption || '',
              cover: post.media?.[0]?.url || null,
              author: post.user?.fullName || post.user?.username || 'Kullanıcı',
              authorUsername: post.user?.username,
              authorAvatar: post.user?.avatar,
              authorId: post.user?.id,
              userId: post.userId || post.user?.id,
              likes: post._count?.likes ?? 0,
              likedBy: post.isLiked ? [user?.id] : [],
              date: post.createdAt,
              createdAt: post.createdAt,
              _count: {
                comments: post._count?.comments ?? 0,
                likes: post._count?.likes ?? 0,
              },
            }))
          
          console.log('[Feed] ✅ Transformed posts:', transformedPosts.length)
          setFeedPosts(transformedPosts)
        } catch (error: any) {
          // Network error ise retry yap
          if ((error?.code === 'ERR_NETWORK' || !error?.response) && retryCount < maxRetries) {
            retryCount++
            const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 4000)
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Feed] Network error, retrying in ${delay}ms... (attempt ${retryCount}/${maxRetries})`)
            }
            
            await new Promise(resolve => setTimeout(resolve, delay))
            return fetchWithRetry() // Retry
          }
          
          // Max retry sayısına ulaşıldı veya network error değil
          console.error('[Feed] ❌ Feed posts alınamadı:', {
            message: error?.message,
            status: error?.response?.status,
            data: error?.response?.data,
            code: error?.code,
            url: error?.config?.url,
            baseURL: error?.config?.baseURL,
          })
          setFeedPosts([])
        } finally {
          setIsLoading(false)
        }
      }
      
      await fetchWithRetry()
    }

    fetchFeed()

    // Initialize socket for notifications and new posts
    // Token'ı accessToken veya localStorage'dan al
    const tokenToUse = accessToken || tokenFromStorage
    if (tokenToUse) {
      const socket = initSocket(tokenToUse)
      const postsSocket = initPostsSocket(tokenToUse)

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
          _count: {
            comments: post._count?.comments || 0,
            likes: post._count?.likes || 0,
          },
        }
        setFeedPosts((prev) => [transformedPost, ...prev])
      })

      // 🔔 Socket.IO ile real-time yorum sayısı dinleme
      postsSocket.on('post:comment', (data: { postId: string; comments: number }) => {
        console.log('💬 [Feed] Yorum sayısı güncellendi:', data)
        setFeedPosts((prev) => 
          prev.map((p) => 
            p.id === data.postId 
              ? { 
                  ...p, 
                  _count: { 
                    ...p._count, 
                    comments: data.comments 
                  } 
                } 
              : p
          )
        )
      })

      return () => {
        socket.off('notification')
        postsSocket.off('newPost')
        postsSocket.off('post:comment')
        postsSocket.disconnect()
      }
    }
  }, [accessToken, router, user?.id])

  // Token kontrolü - localStorage'dan da kontrol et
  const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const hasToken = accessToken || tokenFromStorage

  if (!hasToken) {
    return null
  }

  const handleCloseModal = () => {
    setSelectedPostId(null)
    setHighlightCommentId(null)
    // URL'yi temizle
    router.replace('/feed', { scroll: false })
  }

  return (
    <div className="w-full feed-content">
      {/* 🔸 Ayın Öne Çıkanları — header'ın hemen altından başlıyor, direkt görünür */}
      <div className="w-full mt-4 md:mt-8 mb-6 md:mb-10">
        <HighlightsRow />
      </div>
      
      <div className="space-y-6 md:space-y-10">
        {/* 🔸 Keşfet */}
        <div className="w-full">
          <div className="fl-section-title mb-4 md:mb-6 pb-2 inline-block">
            <div className="flex items-center gap-2.5 mb-0.5">
              <span className="fl-dot inline-block w-1.5 h-1.5 rounded-full bg-[#FF8A00]" />
              <span className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#FF8A00]">Keşfet</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
              Seni Bekleyen İçerikler
            </p>
            <div className="fl-accent-line-el h-[2px] w-full bg-[#FF8A00] mt-1.5 rounded-full" />
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
            </div>
          ) : feedPosts.length === 0 ? (
            <div className="text-center py-12 md:py-20 bg-white dark:bg-gray-950 rounded-2xl border border-black/4 dark:border-white/10 px-4 shadow-[0_6px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {feedPosts.map((post, index) => (
                <div key={post.id} className="premium-card-enter" style={{ animationDelay: `${index * 0.055}s` }}>
                  <PostCard
                    post={post}
                    variant="explore"
                    index={index}
                    showLike={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Post Modal - URL'den açılan post için */}
      {selectedPostId && (
        <PostModal 
          postId={selectedPostId} 
          onClose={handleCloseModal}
          highlightCommentId={highlightCommentId || undefined}
        />
      )}
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
