'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Heart, MessageCircle, Bookmark, X, Send, Trash2, CornerUpRight, Pin } from 'lucide-react'
import MentionInput from './MentionInput'
import { useRouter } from 'next/navigation'
import { initPostsSocket, initCommentsSocket } from '@/lib/socket'
import UserBadge from './UserBadge'
import { ProRoleBadge } from './ProRoleBadge'

const CommentLikeButton = dynamic(() => import('@/components/CommentLikeButton'), {
  ssr: false,
  loading: () => null,
})

interface PostModalProps {
  postId: string
  onClose: () => void
}

interface Comment {
  id: string
  content: string
  createdAt: string
  isPinned?: boolean
  isLikedByCurrentUser?: boolean
  likesCount?: number
  user: {
    id: string
    username: string
    fullName: string | null
    avatar: string | null
    isVerified: boolean
    role?: string
  }
  replies?: Comment[]
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
    role?: string
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
  const [contextMenu, setContextMenu] = useState<{ commentId: string; x: number; y: number } | null>(null)

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

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null)
    }
    if (contextMenu) {
      window.addEventListener('click', handleClickOutside)
      return () => window.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  // Handle pin/unpin comment
  const handlePinComment = async (commentId: string, currentPinned: boolean) => {
    try {
      await api.post(`/posts/comments/${commentId}/pin`, { pinned: !currentPinned })
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
      setContextMenu(null)
    } catch (error) {
      console.error('Error pinning comment:', error)
    }
  }

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
          {/* Header - Instagram Style: User + Caption */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-start gap-3 flex-shrink-0">
            <div
              className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer"
              onClick={() => {
                onClose()
                router.push(`/profile/${post.user.username}`)
              }}
            >
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
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-gray-100 dark:text-gray-100 font-semibold text-sm">
                    {post.user.fullName || post.user.username}
                  </span>
                  {post.user.isVerified && (
                    <span className="ml-1 text-blue-500">✓</span>
                  )}
                  <UserBadge role={post.user.role} />
                  <ProRoleBadge roles={(post.user as any).roles} plan={(post.user as any).plan} />
                </div>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              {post.caption && (
                <p className="text-gray-400 dark:text-gray-400 text-sm mt-[2px] leading-snug whitespace-pre-wrap break-words">
                  {post.caption}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons - Instagram Style: Like count next to icon */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4 text-gray-700 dark:text-gray-400">
              <button
                onClick={handleLike}
                disabled={likeMutation.isPending}
                className={`relative flex items-center gap-1 hover:text-[#ff7b00] transition-colors ${
                  animateLike ? 'scale-125' : 'scale-100'
                }`}
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
                {post._count.likes > 0 && (
                  <span className="text-sm font-medium">{post._count.likes}</span>
                )}
              </button>
              <button className="hover:text-[#ff7b00] transition-colors">
                <MessageCircle size={24} className="text-gray-700 dark:text-gray-300" />
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="hover:text-[#ff7b00] transition-colors"
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


          {/* Comments Section - Instagram Style */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Comments */}
            {post.comments && post.comments.length > 0 ? (
              <>
                {post.comments.map((comment: any) => (
                  <div key={comment.id}>
                    {/* Ana yorum */}
                    <div
                      className="flex gap-2 items-start group relative"
                      onContextMenu={(e) => {
                        e.preventDefault()
                        // Sadece gönderi sahibi pin yapabilir
                        if (user?.id === post.user.id) {
                          setContextMenu({
                            commentId: comment.id,
                            x: e.pageX,
                            y: e.pageY,
                          })
                        }
                      }}
                    >
                      <Link
                        href={`/profile/${comment.user.username}`}
                        className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition cursor-pointer"
                      >
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
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/profile/${comment.user.username}`}
                                className="text-sm text-gray-200 dark:text-gray-100 font-medium hover:opacity-80 transition cursor-pointer inline-block"
                              >
                                {comment.user.username}
                              </Link>
                              <UserBadge role={comment.user.role} />
                              <ProRoleBadge roles={(comment.user as any).roles} plan={(comment.user as any).plan} />
                              {comment.isPinned && (
                                <Pin size={12} className="text-[#ff7b00] fill-[#ff7b00]" />
                              )}
                            </div>
                            <span className="text-sm text-gray-400 dark:text-gray-400 ml-2">
                              {comment.content}
                            </span>
                          </div>
                          {/* Beğeni butonu - her zaman görünür */}
                          <div className="flex-shrink-0">
                            <CommentLikeButton
                              commentId={comment.id}
                              initialLiked={comment.isLikedByCurrentUser || false}
                              initialCount={comment.likesCount || 0}
                              type="post"
                            />
                          </div>
                        </div>
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
                      
                      {/* Context Menu - Sadece gönderi sahibine göster */}
                      {contextMenu?.commentId === comment.id && user?.id === post.user.id && (
                        <div
                          className="fixed z-50 bg-gray-900 dark:bg-[#1a1a1a] text-gray-200 text-sm rounded-lg shadow-xl border border-gray-700 dark:border-gray-600 animate-in fade-in zoom-in-95 duration-150"
                          style={{
                            top: `${contextMenu.y - 80}px`,
                            left: `${contextMenu.x - 180}px`,
                            width: '180px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handlePinComment(comment.id, comment.isPinned || false)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-800 dark:hover:bg-gray-700 rounded-t-lg flex items-center gap-2 transition-colors"
                          >
                            <Pin size={14} className={comment.isPinned ? 'text-[#ff7b00] fill-[#ff7b00]' : 'text-gray-400'} />
                            <span className={comment.isPinned ? 'text-[#ff7b00]' : ''}>
                              {comment.isPinned ? 'Sabitlemeyi Kaldır' : 'Yorumu Sabitle'}
                            </span>
                          </button>
                          <button
                            onClick={() => setContextMenu(null)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-800 dark:hover:bg-gray-700 rounded-b-lg text-gray-400 hover:text-gray-200 transition-colors"
                          >
                            İptal
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Emoji Tepkileri kaldırıldı */}
                    {/* <div className="ml-11 mt-1">
                      <CommentReactions commentId={comment.id} postId={postId} />
                    </div> */}

                    {/* Yanıtlar (Replies) */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-10 mt-2 space-y-2">
                        {comment.replies.map((reply: any) => (
                          <div key={reply.id}>
                            <div className="flex gap-2">
                              <CornerUpRight size={12} className="text-gray-400 dark:text-gray-500 mt-1 flex-shrink-0" />
                              <Link
                                href={`/profile/${reply.user.username}`}
                                className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition cursor-pointer"
                              >
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
                              </Link>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                  <Link
                                    href={`/profile/${reply.user.username}`}
                                    className="font-semibold hover:opacity-80 transition cursor-pointer"
                                  >
                                    {reply.user.username}
                                  </Link>
                                  <UserBadge role={reply.user.role} />
                                  <ProRoleBadge roles={(reply.user as any).roles} plan={(reply.user as any).plan} />
                                  <span>{reply.content}</span>
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                  {new Date(reply.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {/* Beğeni butonu - her zaman görünür */}
                              <div className="flex-shrink-0">
                                <CommentLikeButton
                                  commentId={reply.id}
                                  initialLiked={reply.isLikedByCurrentUser || false}
                                  initialCount={reply.likesCount || 0}
                                  type="post"
                                />
                              </div>
                            </div>

                            {/* Yanıt için Emoji Tepkileri kaldırıldı */}
                            {/* <div className="ml-9 mt-1">
                              <CommentReactions commentId={reply.id} postId={postId} />
                            </div> */}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-10">Henüz yorum yok.</p>
            )}
          </div>

          {/* Comment Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            {/* Yanıt veriliyor etiketi */}
            {replyingTo && (
              <div className="px-4 pt-3 pb-2 flex items-center gap-2">
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
            {/* Comment form - Instagram Style */}
            <form onSubmit={handleComment} className="flex items-center px-4 py-3">
              <MentionInput
                value={commentText}
                setValue={setCommentText}
                placeholder={replyingTo ? "Yanıt yaz..." : "Yorum ekle..."}
                disabled={isPostingComment}
                className="flex-1 bg-transparent text-gray-300 dark:text-gray-300 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isPostingComment}
                className="ml-2 bg-[#ff7b00] hover:bg-[#e36f00] text-white rounded-full p-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPostingComment ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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

