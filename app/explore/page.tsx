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

  const filters = ['Tümü', 'Sanatçılar', 'Koleksiyonlar', 'Etkinlikler']

  return (
    <>
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Filtre Barı */}
        <div className="flex items-center justify-center gap-4 mt-6 mb-8">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                activeFilter === filter
                  ? 'border-[#ff7b00] text-[#ff7b00] bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-[#ff7b00] hover:border-[#ff7b00]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Düzenli Grid View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {posts.map((post: any, index: number) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="relative group bg-white dark:bg-[#111] rounded-2xl border border-transparent dark:border-gray-800 hover:border-[#ff7b00]/60 transition-all duration-300 shadow-md hover:shadow-[#ff7b00]/10 cursor-pointer overflow-hidden"
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
                        src={post.media[0].url}
                        className="w-full h-[380px] object-cover rounded-t-2xl"
                        muted
                      />
                    ) : (
                      <img
                        src={post.media[0].url}
                        alt={post.caption || 'Post'}
                        className="w-full h-[380px] object-cover rounded-t-2xl"
                      />
                    )}
                    {/* Gradient Overlay - Turuncu Glow */}
                    <div className="absolute inset-0 rounded-t-2xl bg-gradient-to-t from-[#ff7b00]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    {/* Hover Stats - Only show if no pinned comment */}
                    {!post.pinnedComment && (
                      <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex items-center gap-4 text-white">
                          <div className="flex items-center gap-1.5">
                            <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current text-[#ff7b00]' : ''}`} />
                            <span className="text-sm font-semibold">{post._count.likes}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-sm font-semibold">{post._count.comments}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pinned Comment Preview - Hover */}
                    {hoveredPostId === post.id && post.pinnedComment && (
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-md transition-opacity duration-300 ease-in-out text-white rounded-b-2xl z-10">
                        <p className="text-sm text-gray-100 leading-snug">
                          <span className="font-semibold text-[#ff7b00]">{post.pinnedComment.user}</span>
                          {' '}
                          <span className="text-gray-200">{post.pinnedComment.text}</span>
                        </p>
                      </div>
                    )}

                    {/* Pinned Icon - Top Right */}
                    {post.pinnedComment && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <span className="text-[#ff7b00] text-xs">📌</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Card Content */}
              <div className="p-4">
                {post.user && (
                  <div className="flex items-center gap-2 mb-2">
                    {post.user.avatar ? (
                      <img
                        src={post.user.avatar}
                        alt={post.user.username}
                        className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/users/default.jpg'
                        }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20 flex items-center justify-center text-[#ff7b00] font-bold text-xs">
                        {post.user.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {post.user.username}
                    </p>
                  </div>
                )}
                {post.caption && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                    {post.caption}
                  </p>
                )}
                <button className="text-[#ff7b00] text-xs font-medium hover:underline">
                  Gönderiyi Gör
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Load More */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#ff7b00]"></div>
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


