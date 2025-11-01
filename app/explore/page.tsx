'use client'

import { useState, useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'

function ExploreContent() {
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const [selectedPost, setSelectedPost] = useState<any>(null)

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

  return (
    <>
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Grid View */}
        <div className="grid grid-cols-3 gap-1">
          {posts.map((post: any) => (
            <div
              key={post.id}
              className="aspect-square relative cursor-pointer group overflow-hidden"
              onClick={() => setSelectedPost(post)}
            >
              {post.media && post.media.length > 0 && (
                <>
                  {post.media[0].type === 'video' ? (
                    <video
                      src={post.media[0].url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={post.media[0].url}
                      alt={post.caption || 'Post'}
                      className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                    />
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-4 text-white">
                      <span className="font-semibold">❤️ {post._count.likes}</span>
                      <span className="font-semibold">💬 {post._count.comments}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Load More */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        )}

        {!hasNextPage && posts.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">You've seen all posts! 🎉</p>
          </div>
        )}

        {posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No posts to explore yet.</p>
          </div>
        )}
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row">
              {/* Media Side */}
              <div className="md:w-2/3 bg-black dark:bg-gray-900 flex items-center justify-center">
                {selectedPost.media && selectedPost.media.length > 0 && (
                  selectedPost.media[0].type === 'video' ? (
                    <video
                      src={selectedPost.media[0].url}
                      controls
                      className="w-full h-full object-contain max-h-[90vh]"
                    />
                  ) : (
                    <img
                      src={selectedPost.media[0].url}
                      alt={selectedPost.caption || 'Post'}
                      className="w-full h-full object-contain max-h-[90vh]"
                    />
                  )
                )}
              </div>

              {/* Details Side */}
              <div className="md:w-1/3 flex flex-col bg-white dark:bg-gray-800">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                      {selectedPost.user.avatar ? (
                        <img
                          src={selectedPost.user.avatar}
                          alt={selectedPost.user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-500 dark:text-gray-300 text-xs">
                          {selectedPost.user.username[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedPost.user.username}</p>
                  </div>
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="text-2xl hover:opacity-70 text-gray-500 dark:text-gray-400"
                  >
                    ✕
                  </button>
                </div>

                {/* Caption */}
                <div className="p-4 flex-1 overflow-y-auto">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {selectedPost.user.avatar ? (
                        <img
                          src={selectedPost.user.avatar}
                          alt={selectedPost.user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-500 dark:text-gray-300 text-xs">
                          {selectedPost.user.username[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-gray-100">
                        <span className="font-semibold">{selectedPost.user.username}</span>{' '}
                        {selectedPost.caption}
                      </p>
                      {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
                        <div className="mt-2">
                          {selectedPost.hashtags.map((postHashtag: any) => (
                            <span
                              key={postHashtag.hashtag.id}
                              className="text-blue-600 dark:text-blue-400 mr-2"
                            >
                              #{postHashtag.hashtag.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                        {new Date(selectedPost.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-4 mb-2">
                    <button className="text-2xl">
                      {selectedPost.isLiked ? '❤️' : '🤍'}
                    </button>
                    <button className="text-2xl">💬</button>
                    <button className="text-2xl">📤</button>
                  </div>
                  <p className="font-semibold mb-1 text-gray-900 dark:text-gray-100">
                    {selectedPost._count.likes} {selectedPost._count.likes === 1 ? 'like' : 'likes'}
                  </p>
                  {selectedPost._count.comments > 0 && (
                    <button className="text-gray-500 dark:text-gray-400 text-sm">
                      View all {selectedPost._count.comments} comments
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
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


