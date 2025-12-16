'use client'

import { useState, useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Heart, MessageCircle } from 'lucide-react'
import { PostModal } from '@/components/post-modal'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import { ProRoleBadge } from '@/components/ProRoleBadge'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

function ExploreContent() {
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('Tümü')
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null)

  // Infinite scroll explore query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['explore'],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      params.append('limit', '20')
      if (pageParam) {
        params.append('cursor', pageParam)
      }
      const response = await api.get(`/explore?${params.toString()}`)
      return response.data
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: !!accessToken,
  })

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const posts = data?.pages.flatMap((page) => page.posts) || []

  if (!accessToken) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  // Filtre sekmeleri kaldırıldı - sadece varsayılan keşfet akışı gösteriliyor
  // State (activeFilter) korunuyor - ileride tekrar eklenebilir
  // const filters = ['Tümü', 'Sanatçılar', 'Koleksiyonlar', 'Etkinlikler']

  return (
    <>
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Filtre Barı - KALDIRILDI */}
        {/* 
        <div className="flex items-center justify-center gap-4 mt-6 mb-8">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                activeFilter === filter
                  ? 'border-brand-orange text-brand-orange bg-brand-orange/10 dark:bg-brand-orange/20'
                  : 'border-brand-blue/30 text-gray-500 dark:text-gray-400 hover:text-brand-orange hover:border-brand-orange'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        */}

        {/* Düzenli Grid View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-3 md:p-6">
          {posts.map((post: any, index: number) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="relative group bg-white/50 dark:bg-black/20 rounded-xl border border-brand-blue/30 hover:border-brand-orange transition-all duration-200 shadow-sm backdrop-blur-md cursor-pointer overflow-hidden hover:scale-[1.02] hover:shadow-brand-orange/30"
              onClick={() => setSelectedPostId(post.id)}
              onMouseEnter={() => setHoveredPostId(post.id)}
              onMouseLeave={() => setHoveredPostId(null)}
            >
              {/* Media Container */}
              <div className="relative w-full overflow-hidden">
                {post.media && post.media.length > 0 && (
                  <>
                    {post.media[0].type === 'video' ? (
                      <video
                        src={resolveImageUrl(post.media[0].url)}
                        className="w-full h-[380px] object-cover rounded-t-2xl"
                        muted
                      />
                    ) : (
                      (() => {
                        const imageUrl = resolveImageUrl(post.media[0].url)
                        console.log('Explore IMAGE URL:', imageUrl, 'Original:', post.media[0].url)
                        return (
                          <img
                            src={imageUrl}
                            alt={post.caption || 'Post'}
                            className="w-full h-[380px] object-cover rounded-t-2xl"
                            onError={(e) => {
                              console.error('Explore Image Error:', imageUrl)
                              ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                            }}
                          />
                        )
                      })()
                    )}

                    {/* Pinned Icon - Top Right */}
                    {post.pinnedComment && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center z-30">
                        <span className="text-brand-orange text-xs">📌</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 🔥 KRİTİK: Modern hover overlay - tüm kartı kaplayan blur + yorum gösterimi */}
              {/* Pinned comment varsa onu göster, yoksa stats göster */}
              {/* Mobilde hover yok, sadece desktop'ta göster */}
              <div className="hidden md:flex absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex-col justify-center items-center text-white p-4 text-center rounded-2xl z-20 pointer-events-none">
                {post.pinnedComment ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="w-5 h-5 text-brand-orange" />
                      <span className="text-xs font-semibold text-brand-orange">Sabitlenmiş Yorum</span>
                    </div>
                    <p className="text-sm italic mb-3 leading-relaxed max-w-[90%]">
                      "{post.pinnedComment.text}"
                    </p>
                    <span className="text-xs opacity-80">@{post.pinnedComment.user}</span>
                  </>
                ) : post._count.comments > 0 ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <MessageCircle className="w-5 h-5 text-brand-orange" />
                      <span className="text-sm font-semibold">{post._count.comments} yorum</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current text-brand-orange' : ''}`} />
                        <span>{post._count.likes}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4" />
                        <span>{post._count.comments}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current text-brand-orange' : ''}`} />
                      <span className="text-sm font-semibold">{post._count.likes} beğeni</span>
                    </div>
                    <p className="text-xs opacity-80">Henüz yorum yok</p>
                  </>
                )}
              </div>

              {/* Card Content */}
              <div className="p-3 md:p-4">
                {post.user && (
                  <div className="flex items-center gap-2 mb-2">
                    {post.user.avatar ? (
                      <img
                        src={resolveImageUrl(post.user.avatar)}
                        alt={post.user.username}
                        className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                        }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-brand-orange/10 dark:bg-brand-orange/20 flex items-center justify-center text-brand-orange font-bold text-xs">
                        {post.user.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                      {post.user.username}
                      <ProRoleBadge roles={(post.user as any).roles} plan={(post.user as any).plan} />
                    </p>
                  </div>
                )}
                {post.caption && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                    {post.caption}
                  </p>
                )}
                <button className="text-brand-orange text-xs font-medium hover:text-brand-blue transition">
                  Gönderiyi Gör
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Load More */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-orange"></div>
          </div>
        )}

        {/* End Message */}
        {!hasNextPage && posts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center mt-10"
          >
            <div className="text-gray-400 dark:text-gray-500 text-sm bg-gray-50 dark:bg-[#181818] py-3 rounded-full w-fit mx-auto px-6 border border-gray-200 dark:border-gray-700">
              Tüm paylaşımları gördün — harikasın!
            </div>
          </motion.div>
        )}

        {posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Henüz keşfedilecek paylaşım bulunmuyor.</p>
          </div>
        )}
      </div>

      {/* Post Detail Modal */}
      {selectedPostId && (
        <PostModal
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}
    </>
  )
}

export default function ExplorePage() {
  return (
    <AuthGuard>
      <ExploreContent />
    </AuthGuard>
  )
}


