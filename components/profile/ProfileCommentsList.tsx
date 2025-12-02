'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { MessageCircle, Clock } from 'lucide-react'

interface ProfileCommentsListProps {
  username: string
  userId?: string
}

export function ProfileCommentsList({ username, userId }: ProfileCommentsListProps) {
  const router = useRouter()
  const { accessToken } = useAuthStore()

  // Kullanıcının yorumlarını çek
  const { data: comments, isLoading } = useQuery({
    queryKey: ['user-comments', userId],
    queryFn: async () => {
      if (!userId) return []
      try {
        const response = await api.get(`/posts/comments/user/${userId}`)
        return response.data || []
      } catch (error) {
        console.error('Failed to fetch user comments:', error)
        return []
      }
    },
    enabled: !!accessToken && !!userId,
  })

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff7b00] mx-auto"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Yorumlar yükleniyor...</p>
      </div>
    )
  }

  if (!comments || comments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <MessageCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Henüz yorum yapılmamış.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment: any) => (
        <div
          key={comment.id}
          className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 hover:border-[#ff7b00]/50 transition-all cursor-pointer"
          onClick={() => comment.postId && router.push(`/posts/${comment.postId}`)}
        >
          <div className="flex items-start gap-3">
            {/* Kullanıcı Avatar */}
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {comment.user?.avatar ? (
                <img
                  src={resolveImageUrl(comment.user.avatar)}
                  alt={comment.user.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                  }}
                />
              ) : (
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {comment.user?.username?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>

            {/* Yorum İçeriği */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {comment.user?.username || 'Kullanıcı'}
                </span>
                {comment.post && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    @ {comment.post.caption ? comment.post.caption.substring(0, 30) + (comment.post.caption.length > 30 ? '...' : '') : 'Gönderi'}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                {comment.content}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>
                    {new Date(comment.createdAt).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {comment._count?.likes > 0 && (
                  <span>❤️ {comment._count.likes} beğeni</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

