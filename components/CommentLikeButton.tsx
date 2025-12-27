'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

interface CommentLikeButtonProps {
  commentId: string
  initialLiked: boolean
  initialCount: number
  type?: 'article' | 'post'
  postId?: string // Post ID for query cache update
}

export default function CommentLikeButton({ commentId, initialLiked, initialCount, type = 'article', postId }: CommentLikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [isToggling, setIsToggling] = useState(false)
  const queryClient = useQueryClient()

  const toggleLike = async () => {
    if (isToggling) return

    setIsToggling(true)
    
    // 🔥 Optimistic update - hemen UI'ı güncelle
    const previousLiked = liked
    const previousCount = count
    setLiked(!previousLiked)
    setCount(previousLiked ? count - 1 : count + 1)
    
    try {
      const endpoint = type === 'post' 
        ? `/posts/comments/${commentId}/like`
        : `/articles/comments/${commentId}/like`
      const res = await api.post(endpoint)
      
      // Backend'den gelen gerçek değerleri kullan
      setLiked(res.data.liked)
      setCount(res.data.likesCount)
      
      // 🔥 KRİTİK: Post query cache'ini güncelle (yorum kaybolmasını önle)
      if (type === 'post' && postId) {
        queryClient.setQueryData(['post', postId], (oldData: any) => {
          if (!oldData) return oldData
          
          // Yorumu bul ve güncelle (ana yorumlar ve replies içinde)
          const updateCommentLikes = (comments: any[]): any[] => {
            return comments.map((comment: any) => {
              if (comment.id === commentId) {
                return {
                  ...comment,
                  isLikedByCurrentUser: res.data.liked,
                  likesCount: res.data.likesCount,
                  _count: {
                    ...comment._count,
                    likes: res.data.likesCount,
                  },
                  likes: res.data.liked ? [{ id: 'temp' }] : [],
                }
              }
              // Replies içinde de ara
              if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: updateCommentLikes(comment.replies),
                }
              }
              return comment
            })
          }
          
          return {
            ...oldData,
            comments: updateCommentLikes(oldData.comments || []),
          }
        })
      }
    } catch (err) {
      console.error('Like error:', err)
      // Hata durumunda optimistic update'i geri al
      setLiked(previousLiked)
      setCount(previousCount)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <button
      onClick={toggleLike}
      disabled={isToggling}
      className={`flex items-center gap-1 transition-colors ${
        liked 
          ? 'text-orange-500' 
          : 'text-gray-400 hover:text-orange-500'
      } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <Heart
        className={`w-3.5 h-3.5 transition-all duration-200 ${
          liked 
            ? 'fill-orange-500 text-orange-500' 
            : ''
        }`}
      />
      {count > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          {count}
        </span>
      )}
    </button>
  )
}
