'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import { useState } from 'react'

function SavedContent() {
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedPost, setSelectedPost] = useState<any>(null)

  // Get saved posts
  const { data: savedPosts, isLoading } = useQuery({
    queryKey: ['saved-posts'],
    queryFn: async () => {
      const response = await api.get('/posts/saved')
      return response.data
    },
    enabled: !!accessToken,
  })

  // Unsave mutation
  const unsaveMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.delete(`/posts/${postId}/save`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] })
    },
  })

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (isLiked) {
        await api.delete(`/posts/${postId}/like`)
      } else {
        await api.post(`/posts/${postId}/like`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] })
    },
  })

  const handleUnsave = (postId: string) => {
    unsaveMutation.mutate(postId)
  }

  const handleLike = (postId: string, isLiked: boolean) => {
    likeMutation.mutate({ postId, isLiked })
  }

  if (!accessToken) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Saved Posts</h1>
          <p className="text-gray-500 text-sm mt-1">
            Posts you've saved will appear here
          </p>
        </div>

        {/* Grid View */}
        {savedPosts && savedPosts.length > 0 ? (
          <div className="grid grid-cols-3 gap-1">
            {savedPosts.map((post: any) => (
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
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">No saved posts yet</p>
            <p className="text-gray-400 text-sm">
              Save posts you want to see later by tapping the bookmark icon.
            </p>
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
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row">
              {/* Media Side */}
              <div className="md:w-2/3 bg-black flex items-center justify-center">
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
              <div className="md:w-1/3 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                      {selectedPost.user.avatar ? (
                        <img
                          src={selectedPost.user.avatar}
                          alt={selectedPost.user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-500 text-xs">
                          {selectedPost.user.username[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold">{selectedPost.user.username}</p>
                  </div>
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="text-2xl hover:opacity-70"
                  >
                    ✕
                  </button>
                </div>

                {/* Caption */}
                <div className="p-4 flex-1 overflow-y-auto">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {selectedPost.user.avatar ? (
                        <img
                          src={selectedPost.user.avatar}
                          alt={selectedPost.user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-500 text-xs">
                          {selectedPost.user.username[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p>
                        <span className="font-semibold">{selectedPost.user.username}</span>{' '}
                        {selectedPost.caption}
                      </p>
                      <p className="text-gray-400 text-xs mt-2">
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
                <div className="p-4 border-t">
                  <div className="flex items-center space-x-4 mb-2">
                    <button
                      onClick={() => handleLike(selectedPost.id, selectedPost.isLiked)}
                      className="text-2xl hover:opacity-70"
                      disabled={likeMutation.isPending}
                    >
                      {selectedPost.isLiked ? '❤️' : '🤍'}
                    </button>
                    <button className="text-2xl hover:opacity-70">💬</button>
                    <button className="text-2xl hover:opacity-70">📤</button>
                    <button
                      onClick={() => {
                        handleUnsave(selectedPost.id)
                        setSelectedPost(null)
                      }}
                      className="text-2xl hover:opacity-70 ml-auto"
                      title="Unsave"
                    >
                      🔖
                    </button>
                  </div>
                  <p className="font-semibold mb-1">
                    {selectedPost._count.likes} {selectedPost._count.likes === 1 ? 'like' : 'likes'}
                  </p>
                  {selectedPost._count.comments > 0 && (
                    <button className="text-gray-500 text-sm">
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

export default function SavedPage() {
  return (
    <AuthGuard>
      <SavedContent />
    </AuthGuard>
  )
}




