'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { initCommentsSocket } from '@/lib/socket'

const EMOJIS = ['❤️', '😂', '😮', '😢']

interface CommentReactionsProps {
  commentId: string
  postId: string
}

interface Reaction {
  emoji: string
  count: number
}

export default function CommentReactions({ commentId, postId }: CommentReactionsProps) {
  const { accessToken, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [userReactions, setUserReactions] = useState<string[]>([])

  // Get reactions count
  const { data: reactions = [] } = useQuery<Reaction[]>({
    queryKey: ['comment-reactions', commentId],
    queryFn: async () => {
      const response = await api.get(`/posts/comments/${commentId}/reactions`)
      return response.data
    },
    enabled: !!commentId,
  })

  // Get user's reactions for this comment
  const { data: userReactionsData = [] } = useQuery<string[]>({
    queryKey: ['comment-user-reactions', commentId],
    queryFn: async () => {
      const response = await api.get(`/posts/comments/${commentId}/reactions/me`)
      return response.data
    },
    enabled: !!accessToken && !!commentId,
  })

  useEffect(() => {
    setUserReactions(userReactionsData)
  }, [userReactionsData])

  // React mutation
  const reactMutation = useMutation({
    mutationFn: async (emoji: string) => {
      const response = await api.post(`/posts/comments/${commentId}/react`, { emoji })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comment-reactions', commentId] })
      queryClient.invalidateQueries({ queryKey: ['comment-user-reactions', commentId] })
    },
  })

  // 🔔 Socket.IO ile real-time reaction dinleme
  useEffect(() => {
    if (!accessToken) return

    const commentsSocket = initCommentsSocket(accessToken)

    commentsSocket.on('commentReactionUpdated', (data: { commentId: string; emoji: string; change: number; userId: string }) => {
      if (data.commentId === commentId) {
        // Query'yi invalidate et ki güncel reactions'ı çeksin
        queryClient.invalidateQueries({ queryKey: ['comment-reactions', commentId] })
        if (data.userId === user?.id) {
          queryClient.invalidateQueries({ queryKey: ['comment-user-reactions', commentId] })
        }
      }
    })

    return () => {
      commentsSocket.off('commentReactionUpdated')
    }
  }, [accessToken, commentId, user?.id, queryClient])

  const handleReact = (emoji: string) => {
    if (!accessToken) return
    reactMutation.mutate(emoji)
  }

  const isReacted = (emoji: string) => userReactions.includes(emoji)

  return (
    <div className="flex items-center gap-2 mt-1.5">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          disabled={reactMutation.isPending}
          className={`text-lg transition-transform hover:scale-125 active:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
            isReacted(emoji) ? 'scale-110' : ''
          }`}
          title={`${emoji} tepkisi ver`}
        >
          {emoji}
        </button>
      ))}

      {reactions.length > 0 && (
        <div className="flex items-center gap-1.5 ml-2 text-xs text-gray-500 dark:text-gray-400">
          {reactions.map((r) => (
            <span key={r.emoji} className="flex items-center gap-0.5">
              <span>{r.emoji}</span>
              <span className="font-medium">{r.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

