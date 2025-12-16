'use client'

import { useEffect, useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Heart, MessageCircle, Bookmark, X, Send, Trash2, CornerUpRight, Pin, PinIcon, FolderPlus } from 'lucide-react'
import MentionInput from './MentionInput'
import { useRouter } from 'next/navigation'
import { initPostsSocket, initCommentsSocket } from '@/lib/socket'
import UserBadge from './UserBadge'
import { ProRoleBadge } from './ProRoleBadge'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import Slider from 'react-slick'
import toast from 'react-hot-toast'
import { AddToCollectionModal } from './collections/AddToCollectionModal'

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
  const { accessToken, user, capabilities } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [commentText, setCommentText] = useState('')
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [animateLike, setAnimateLike] = useState(false)
  const [pingAnimating, setPingAnimating] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ commentId: string; x: number; y: number } | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const sliderRef = useRef<Slider | null>(null)
  const [showAddToCollectionModal, setShowAddToCollectionModal] = useState(false)
  
  const roles = capabilities?.roles ?? user?.roles ?? []
  const canManageCollections = roles.includes('corporate') || roles.includes('collector')

  // Modal açıkken body'ye class ekle (arka plan UI elementlerini gizlemek için)
  useEffect(() => {
    if (postId) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }

    // Cleanup: Modal kapandığında class'ı kaldır
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [postId])

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

    // Yorum sabitleme dinleme
    commentsSocket.on('commentPinned', (data: { id: string; postId: string; isPinned: boolean }) => {
      if (data.postId === postId) {
        // ✅ Optimistic Update - Socket event'inden gelen güncelleme
        queryClient.setQueryData<Post>(['post', postId], (oldData) => {
          if (!oldData) return oldData
          
          return {
            ...oldData,
            comments: oldData.comments?.map((comment: any) => {
              // Eğer bu yorum sabitleniyorsa
              if (data.isPinned && comment.id === data.id) {
                return { ...comment, isPinned: true }
              }
              // Eğer bu yorum sabitleniyorsa, diğer yorumların isPinned'ini false yap
              if (data.isPinned && comment.id !== data.id) {
                return { ...comment, isPinned: false }
              }
              // Eğer bu yorum sabitlenmesi kaldırılıyorsa
              if (!data.isPinned && comment.id === data.id) {
                return { ...comment, isPinned: false }
              }
              return comment
            }) || [],
          }
        })
        
        // Query'yi invalidate et ki backend'den güncel veriyi çeksin
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
      commentsSocket.off('commentPinned')
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
      const newPinnedState = !currentPinned
      
      // ✅ Optimistic Update - UI'ı hemen güncelle
      queryClient.setQueryData<Post>(['post', postId], (oldData) => {
        if (!oldData) return oldData
        
        return {
          ...oldData,
          comments: oldData.comments?.map((comment: any) => {
            // Eğer bu yorum sabitleniyorsa, diğer tüm yorumların isPinned'ini false yap
            if (newPinnedState && comment.id === commentId) {
              return { ...comment, isPinned: true }
            }
            // Eğer bu yorum sabitleniyorsa, diğer yorumların isPinned'ini false yap
            if (newPinnedState && comment.id !== commentId) {
              return { ...comment, isPinned: false }
            }
            // Eğer bu yorum sabitlenmesi kaldırılıyorsa
            if (!newPinnedState && comment.id === commentId) {
              return { ...comment, isPinned: false }
            }
            return comment
          }) || [],
        }
      })
      
      setContextMenu(null)
      
      // API isteği
      await api.post(`/posts/comments/${commentId}/pin`, { pinned: newPinnedState })
      
      // Query'yi invalidate et ki backend'den güncel veriyi çeksin (optimistic update'i doğrula)
      await queryClient.invalidateQueries({ queryKey: ['post', postId] })
      
      // Başarı mesajı
      toast.success(newPinnedState ? 'Yorum sabitlendi' : 'Sabitleme kaldırıldı', {
        duration: 2000,
        icon: '📌',
      })
    } catch (error: any) {
      console.error('Error pinning comment:', error)
      
      // ❌ Hata durumunda optimistic update'i geri al
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
      
      const errorMessage = error?.response?.data?.message || error?.message || 'Yorum sabitlenemedi'
      toast.error(errorMessage, {
        duration: 3000,
      })
    }
  }

  if (isLoading || !post) {
    return (
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[200] p-4"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex animate-in fade-in slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center w-full h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
          </div>
        </div>
      </div>
    )
  }

  const mediaArray = post.media && post.media.length > 0 ? post.media : []
  const hasMultipleMedia = mediaArray.length > 1

  // Slider settings
  const sliderSettings = {
    dots: hasMultipleMedia,
    infinite: false,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: hasMultipleMedia,
    swipe: hasMultipleMedia,
    touchMove: hasMultipleMedia,
    beforeChange: (current: number, next: number) => setCurrentSlide(next),
    className: 'slick-custom',
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[200] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-4 duration-300 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left side - Media */}
        <div className="md:w-3/5 bg-black dark:bg-gray-950 flex items-center justify-center aspect-square md:aspect-auto md:min-h-[600px] relative w-full overflow-hidden [&_.slick-slider]:pointer-events-auto">
          {mediaArray.length > 0 ? (
            hasMultipleMedia ? (
              /* Çoklu görsel - Slider */
              <Slider ref={sliderRef} {...sliderSettings} className="w-full h-full">
                {mediaArray.map((media, index) => (
                  <div key={media.id || index} className="relative w-full h-full flex items-center justify-center pointer-events-auto">
                    {media.type === 'video' ? (
                      <video
                        src={resolveImageUrl(media.url)}
                        className="w-full h-full max-h-[90vh] object-contain"
                        controls
                        autoPlay={index === 0}
                        onError={(e) => {
                          console.error('PostModal Video Error:', resolveImageUrl(media.url))
                        }}
                      />
                    ) : (
                      <img
                        src={resolveImageUrl(media.url)}
                        alt={post.caption || `Post ${index + 1}`}
                        className="w-full h-full max-h-[90vh] object-contain"
                        onError={(e) => {
                          console.error('PostModal Media Error:', resolveImageUrl(media.url))
                          ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                        }}
                      />
                    )}
                  </div>
                ))}
              </Slider>
            ) : (
              /* Tek görsel - Slider yok */
              mediaArray[0].type === 'video' ? (
                <video
                  src={resolveImageUrl(mediaArray[0].url)}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                  onError={(e) => {
                    console.error('PostModal Video Error:', resolveImageUrl(mediaArray[0].url))
                  }}
                />
              ) : (
                <img
                  src={resolveImageUrl(mediaArray[0].url)}
                  alt={post.caption || 'Post'}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error('PostModal Media Error:', resolveImageUrl(mediaArray[0].url))
                    ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                  }}
                />
              )
            )
          ) : (
            <div className="text-gray-400">No media available</div>
          )}
          
          {/* Thumbnail önizlemeleri - Çoklu görsel varsa göster */}
          {hasMultipleMedia && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 justify-center overflow-x-auto pb-2 z-20">
              {mediaArray.map((media, index) => (
                <button
                  key={media.id || index}
                  type="button"
                  onClick={() => {
                    if (sliderRef.current) {
                      sliderRef.current.slickGoTo(index)
                    }
                  }}
                  className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors pointer-events-auto ${
                    currentSlide === index
                      ? 'border-white ring-2 ring-brand-orange/50'
                      : 'border-white/50 hover:border-white/80 opacity-70 hover:opacity-100'
                  }`}
                >
                  {media.type === 'video' ? (
                    <video
                      src={resolveImageUrl(media.url)}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={resolveImageUrl(media.url)}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
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
                  src={resolveImageUrl(post.user.avatar)}
                  alt={post.user.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('PostModal Post User Avatar Error:', resolveImageUrl(post.user.avatar))
                    ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                  }}
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
                  <span className="text-black dark:text-white font-semibold text-sm">
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
                <p className="text-black dark:text-white text-sm mt-[2px] leading-snug whitespace-pre-wrap break-words">
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
                className={`relative flex items-center gap-1 hover:text-brand-orange transition-colors ${
                  animateLike ? 'scale-125' : 'scale-100'
                }`}
              >
                <Heart
                  size={24}
                  className={`transition-all duration-300 ${
                    post.isLiked
                      ? 'fill-brand-orange text-brand-orange'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                />
                {(animateLike || pingAnimating) && (
                  <span className="absolute inset-0 animate-ping bg-brand-orange/40 rounded-full"></span>
                )}
                {post._count.likes > 0 && (
                  <span className="text-sm font-medium">{post._count.likes}</span>
                )}
              </button>
              <button className="hover:text-brand-orange transition-colors">
                <MessageCircle size={24} className="text-gray-700 dark:text-gray-300" />
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="hover:text-brand-orange transition-colors"
            >
              <Bookmark
                size={24}
                className={`transition-all duration-300 ${
                  post.isSaved
                    ? 'fill-brand-orange text-brand-orange'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              />
              {canManageCollections && (
                <button
                  onClick={() => setShowAddToCollectionModal(true)}
                  className="hover:text-brand-orange transition-colors"
                  title="Koleksiyona Ekle"
                >
                  <FolderPlus size={24} className="text-gray-700 dark:text-gray-300" />
                </button>
              )}
            </button>
          </div>


          {/* Comments Section - Instagram Style */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* ✅ SABİTLENEN YORUM ALANI - Özel Banner */}
            {(() => {
              const pinnedComment = post.comments?.find((c: any) => c.isPinned);
              if (!pinnedComment) return null;
              
              return (
                <div className="flex items-start gap-2 mb-4 px-4 py-3 rounded-xl bg-brand-orange/5 dark:bg-brand-orange/10 border border-brand-orange/30 dark:border-brand-orange/40">
                  <div className="mt-0.5 flex-shrink-0">
                    <Pin className="w-4 h-4 text-brand-orange fill-brand-orange/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-brand-orange">
                        Sabitlenen yorum
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        @{pinnedComment.user.username}
                      </span>
                    </div>
                    <p className="text-sm text-black dark:text-white mt-1 line-clamp-2 leading-relaxed">
                      {pinnedComment.content}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Comments */}
            {post.comments && post.comments.length > 0 ? (
              <>
                {(() => {
                  // Sabitlenen yorumlar hariç, sadece normal yorumları göster
                  const normalComments = post.comments.filter((c: any) => !c.isPinned);
                  
                  return normalComments.map((comment: any) => {
                    return (
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
                        {/* Sol taraf avatar */}
                        <Link
                          href={`/profile/${comment.user.username}`}
                          className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition cursor-pointer"
                        >
                          {comment.user.avatar ? (
                            <img
                              src={resolveImageUrl(comment.user.avatar)}
                              alt={comment.user.username}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                              }}
                            />
                          ) : (
                            <span className="text-gray-500 dark:text-gray-300 text-xs">
                              {comment.user.username[0].toUpperCase()}
                            </span>
                          )}
                        </Link>
                        
                        <div className="flex-1 min-w-0">
                          {/* Kullanıcı Bilgisi */}
                          <div className="flex items-center gap-2 mb-2">
                            <Link
                              href={`/profile/${comment.user.username}`}
                              className="text-sm text-black dark:text-white font-semibold hover:opacity-80 transition cursor-pointer inline-block"
                            >
                              {comment.user.username}
                            </Link>
                            <UserBadge role={comment.user.role} />
                            <ProRoleBadge roles={(comment.user as any).roles} plan={(comment.user as any).plan} />
                          </div>
                          
                          {/* Yorum metni */}
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <span className="text-sm text-black dark:text-white block leading-relaxed">
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
                          
                          {/* Alt satır - tarih ve yanıtla */}
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-[#444] dark:text-gray-400">
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
                              className="text-xs text-brand-orange hover:underline font-medium transition-colors"
                            >
                              Yanıtla
                            </button>
                          </div>
                        </div>
                      
                      {/* Context Menu - Sadece gönderi sahibine göster */}
                      {contextMenu?.commentId === comment.id && user?.id === post.user.id && contextMenu && (
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
                            <Pin size={14} className={comment.isPinned ? 'text-brand-orange fill-brand-orange' : 'text-gray-400'} />
                            <span className={comment.isPinned ? 'text-brand-orange' : ''}>
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
                                    src={resolveImageUrl(reply.user.avatar)}
                                    alt={reply.user.username}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.error('PostModal Reply Avatar Error:', resolveImageUrl(reply.user.avatar))
                                      ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                                    }}
                                  />
                                ) : (
                                  <span className="text-gray-500 dark:text-gray-300 text-xs">
                                    {reply.user.username[0].toUpperCase()}
                                  </span>
                                )}
                              </Link>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-black dark:text-white flex items-center gap-1 leading-relaxed">
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
                                <p className="text-xs text-[#444] dark:text-gray-400 mt-0.5">
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
                    )
                  })
                })()}
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
                <span className="text-xs text-brand-orange bg-brand-blue/10 dark:bg-brand-blue/20 px-2 py-1 rounded-lg font-medium">
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
                className="ml-2 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-full p-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Add to Collection Modal */}
      {showAddToCollectionModal && (
        <AddToCollectionModal
          postId={postId}
          open={showAddToCollectionModal}
          onClose={() => setShowAddToCollectionModal(false)}
        />
      )}
    </div>
  )
}

