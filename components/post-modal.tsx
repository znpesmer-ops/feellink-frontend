'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Heart, MessageCircle, Bookmark, X, Send, Trash2, CornerUpRight } from 'lucide-react'
import CommentReactions from './CommentReactions'
import MentionInput from './MentionInput'
import { useRouter } from 'next/navigation'
import { initPostsSocket, initCommentsSocket } from '@/lib/socket'

interface PostModalProps {
  postId: string
  onClose: () => void
}

interface Comment {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    username: string
    fullName: string | null
    avatar: string | null
    isVerified: boolean
  }
}

interface Post {
  id: string
  caption: string | null
  location: string | null
  createdAt: string
  isLiked: boolean
  isSaved: boolean
  user: {
    id: string
    username: string
    fullName: string | null
    avatar: string | null
    isVerified: boolean
  }
  media: Array<{
    id: string
    url: string
    type: string
    order: number
  }>
  comments: Comment[]
  _count: {
    likes: number
    comments: number
  }
}

export function PostModal({ postId, onClose }: PostModalProps) {
  const { accessToken, user } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [commentText, setCommentText] = useState('')
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [animateLike, setAnimateLike] = useState(false)
  const [pingAnimating, setPingAnimating] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  // Fetch post details
  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ['post', postId],
    queryFn: async () => {
      const response = await api.get(`/posts/${postId}`)
      return response.data
    },
    enabled: !!accessToken && !!postId,
  })

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (post?.isLiked) {
        await api.delete(`/posts/${postId}/like`)
        return { liked: false }
      } else {
        await api.post(`/posts/${postId}/like`)
        return { liked: true }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (post?.isSaved) {
        await api.delete(`/posts/${postId}/save`)
        return { saved: false }
      } else {
        await api.post(`/posts/${postId}/save`)
        return { saved: true }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
    },
  })

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const response = await api.post(`/posts/${postId}/comments`, { content, parentId })
      return response.data
    },
    onSuccess: () => {
      // Optimistic update - Socket.IO'dan gelen güncelleme gerçek veriyi ayarlayacak
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setCommentText('')
      setReplyingTo(null)
      setIsPostingComment(false)
    },
    onError: () => {
      setIsPostingComment(false)
    },
  })

  const handleLike = () => {
    likeMutation.mutate()
    if (!post?.isLiked) {
      setAnimateLike(true)
      setTimeout(() => setAnimateLike(false), 400)
    }
  }

  const handleSave = () => {
    saveMutation.mutate()
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || isPostingComment) return
    
    setIsPostingComment(true)
    commentMutation.mutate({ content: commentText.trim(), parentId: replyingTo || undefined })
  }

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/posts/${postId}/comments/${commentId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const handleDeleteComment = (commentId: string) => {
    deleteCommentMutation.mutate(commentId)
  }

  // 🔔 Socket.IO ile real-time beğeni dinleme
  useEffect(() => {
    if (!accessToken || !postId) return

    const postsSocket = initPostsSocket(accessToken)

    postsSocket.on('postLikeUpdated', (data: { postId: string; change: number; likeCount: number; isLiked: boolean; userId: string }) => {
      if (data.postId === postId) {
        // Query'yi invalidate et ki güncel veriyi çeksin
        queryClient.invalidateQueries({ queryKey: ['post', postId] })
        // Ping animasyonu göster
        if (data.change > 0 && data.userId !== user?.id) {
          setPingAnimating(true)
          setTimeout(() => setPingAnimating(false), 600)
        }
      }
    })

    postsSocket.on('connect', () => {
      console.log('✅ Posts socket connected for post modal')
    })

    return () => {
      postsSocket.off('postLikeUpdated')
      postsSocket.off('connect')
    }
  }, [accessToken, postId, user?.id, queryClient])

  // 🔔 Socket.IO ile real-time yorum dinleme
  useEffect(() => {
    if (!accessToken || !postId) return

    const commentsSocket = initCommentsSocket(accessToken)

    // Post odasına katıl
    commentsSocket.emit('joinPostRoom', postId)

    // Yeni yorum dinleme
    commentsSocket.on('newComment', (newComment: any) => {
      if (newComment.postId === postId) {
        // Query'yi invalidate et ki güncel yorumları çeksin (nested replies dahil)
        queryClient.invalidateQueries({ queryKey: ['post', postId] })
      }
    })

    commentsSocket.on('commentCreated', (data: any) => {
      if (data.postId === postId) {
        // Yorum sayısını güncelle (yanıtlar dahil)
        queryClient.invalidateQueries({ queryKey: ['post', postId] })
      }
    })

    // Yorum silme dinleme
    commentsSocket.on('commentDeleted', (data: { id: string; postId: string; change?: number }) => {
      if (data.postId === postId) {
        // Query'yi invalidate et ki güncel yorumları çeksin
        queryClient.invalidateQueries({ queryKey: ['post', postId] })
      }
    })

    commentsSocket.on('connect', () => {
      console.log('✅ Comments socket connected for post modal')
      // Bağlandıktan sonra odaya tekrar katıl
      commentsSocket.emit('joinPostRoom', postId)
    })

    return () => {
      commentsSocket.emit('leavePostRoom', postId)
      commentsSocket.off('newComment')
      commentsSocket.off('commentCreated')
      commentsSocket.off('commentDeleted')
      commentsSocket.off('connect')
    }
  }, [accessToken, postId, queryClient])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  if (isLoading || !post) {
    return (
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex animate-in fade-in slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center w-full h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff7b00]"></div>
          </div>
        </div>
      </div>
    )
  }

  const firstMedia = post.media && post.media.length > 0 ? post.media[0] : null

  return (
    <div
      className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-4 duration-300 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left side - Media */}
        <div className="md:w-3/5 bg-black dark:bg-gray-950 flex items-center justify-center aspect-square md:aspect-auto md:min-h-[600px]">
          {firstMedia ? (
            firstMedia.type === 'video' ? (
              <video
                src={firstMedia.url}
                className="w-full h-full object-contain"
                controls
                autoPlay
              />
            ) : (
              <img
                src={firstMedia.url}
                alt={post.caption || 'Post'}
                className="w-full h-full object-contain"
              />
            )
          ) : (
            <div className="text-gray-400">No media available</div>
          )}
        </div>

        {/* Right side - Details */}
        <div className="md:w-2/5 flex flex-col h-[90vh] md:h-auto max-h-[90vh]">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => {
                onClose()
                router.push(`/profile/${post.user.username}`)
              }}
            >
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                {post.user.avatar ? (
                  <img
                    src={post.user.avatar}
                    alt={post.user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-500 dark:text-gray-300 text-sm">
                    {post.user.username[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {post.user.username}
                  {post.user.isVerified && (
                    <span className="ml-1 text-blue-500">✓</span>
                  )}
                </p>
                {post.location && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{post.location}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Action buttons - Immediately below header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                disabled={likeMutation.isPending}
                className={`relative transition-transform active:scale-95 ${animateLike ? 'scale-125' : 'scale-100'}`}
              >
                <Heart
                  size={24}
                  className={`transition-all duration-300 ${
                    post.isLiked
                      ? 'fill-[#ff7b00] text-[#ff7b00]'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                />
                {(animateLike || pingAnimating) && (
                  <span className="absolute inset-0 animate-ping bg-[#ff7b00]/40 rounded-full"></span>
                )}
              </button>
              {post._count.likes > 0 && (
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {post._count.likes}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle
                size={24}
                className="text-gray-700 dark:text-gray-300"
              />
              {post._count.comments > 0 && (
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {post._count.comments}
                </span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="transition-transform active:scale-95"
            >
              <Bookmark
                size={24}
                className={`transition-all duration-300 ${
                  post.isSaved
                    ? 'fill-[#ff7b00] text-[#ff7b00]'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              />
            </button>
          </div>

          {/* Comments Section */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Caption */}
            {post.caption && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {post.user.avatar ? (
                    <img
                      src={post.user.avatar}
                      alt={post.user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 dark:text-gray-300 text-xs">
                      {post.user.username[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    <span className="font-semibold">{post.user.username}</span>{' '}
                    {post.caption}
                  </p>
                </div>
              </div>
            )}

            {/* Comments */}
            {post.comments && post.comments.length > 0 ? (
              <div className="space-y-3">
                {post.comments.map((comment: any) => (
                  <div key={comment.id}>
                    {/* Ana yorum */}
                    <div className="flex gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {comment.user.avatar ? (
                          <img
                            src={comment.user.avatar}
                            alt={comment.user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-500 dark:text-gray-300 text-xs">
                            {comment.user.username[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          <span className="font-semibold">{comment.user.username}</span>{' '}
                          {comment.content}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(comment.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <button
                            onClick={() => {
                              setReplyingTo(comment.id)
                              // Input'a focus
                              setTimeout(() => {
                                const input = document.querySelector('input[placeholder*="Yorum"]') as HTMLInputElement
                                input?.focus()
                              }, 100)
                            }}
                            className="text-xs text-[#ff7b00] hover:underline font-medium transition-colors"
                          >
                            Yanıtla
                          </button>
                        </div>
                      </div>
                      {comment.user.id === user?.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deleteCommentMutation.isPending}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Yorumu sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Emoji Tepkileri */}
                    <div className="ml-11 mt-1">
                      <CommentReactions commentId={comment.id} postId={postId} />
                    </div>

                    {/* Yanıtlar (Replies) */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-10 mt-2 space-y-2">
                        {comment.replies.map((reply: any) => (
                          <div key={reply.id}>
                            <div className="flex gap-2 group">
                              <CornerUpRight size={12} className="text-gray-400 dark:text-gray-500 mt-1 flex-shrink-0" />
                              <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {reply.user.avatar ? (
                                  <img
                                    src={reply.user.avatar}
                                    alt={reply.user.username}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-gray-500 dark:text-gray-300 text-xs">
                                    {reply.user.username[0].toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-900 dark:text-gray-100">
                                  <span className="font-semibold">{reply.user.username}</span>{' '}
                                  {reply.content}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                  {new Date(reply.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {reply.user.id === user?.id && (
                                <button
                                  onClick={() => handleDeleteComment(reply.id)}
                                  disabled={deleteCommentMutation.isPending}
                                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                                  title="Yanıtı sil"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>

                            {/* Yanıt için Emoji Tepkileri */}
                            <div className="ml-9 mt-1">
                              <CommentReactions commentId={reply.id} postId={postId} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Henüz yorum yok.</p>
            </div>
          )}
          </div>

          {/* Comment Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
            {/* Yanıt veriliyor etiketi */}
            {replyingTo && (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-[#ff7b00] bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-lg font-medium">
                  Yanıt veriliyor...
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
            {/* Comment form */}
            <form onSubmit={handleComment} className="flex items-center gap-2">
              <MentionInput
                value={commentText}
                setValue={setCommentText}
                placeholder={replyingTo ? "Yanıt yaz..." : "Yorum ekle..."}
                disabled={isPostingComment}
                className="flex-1"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isPostingComment}
                className="px-4 py-2 bg-[#ff7b00] text-white rounded-lg hover:bg-[#e36f00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPostingComment ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send size={16} />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

