'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import api from '@/lib/api'

interface CommentLikeButtonProps {
  commentId: string
  initialLiked: boolean
  initialCount: number
  type?: 'article' | 'post'
}

export default function CommentLikeButton({ commentId, initialLiked, initialCount, type = 'article' }: CommentLikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [isToggling, setIsToggling] = useState(false)

  const toggleLike = async () => {
    if (isToggling) return

    setIsToggling(true)
    try {
      const endpoint = type === 'post' 
        ? `/posts/comments/${commentId}/like`
        : `/articles/comments/${commentId}/like`
      const res = await api.post(endpoint)
      setLiked(res.data.liked)
      setCount(res.data.likesCount)
    } catch (err) {
      console.error('Like error:', err)
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
