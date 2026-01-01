'use client'

import { useEffect, useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Heart, MessageCircle, Bookmark, X, Send, Trash2, CornerUpRight, CornerDownRight, Pin, PinIcon, FolderPlus, MoreVertical } from 'lucide-react'
import MentionInput from './MentionInput'
import { useRouter } from 'next/navigation'
import { initPostsSocket, initCommentsSocket } from '@/lib/socket'
import UserBadge from './UserBadge'
import { ProRoleBadge } from './ProRoleBadge'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { containsBadWord } from '@/lib/utils/containsBadWord'
import Slider from 'react-slick'
import toast from 'react-hot-toast'
import { AddToCollectionModal } from './collections/AddToCollectionModal'
import { ReportModal } from './ReportModal'

const CommentLikeButton = dynamic(() => import('@/components/CommentLikeButton'), {
  ssr: false,
  loading: () => null,
})

interface PostModalProps {
  postId: string
  onClose: () => void
  highlightCommentId?: string
}

interface Comment {
  id: string
  content: string
  createdAt: string
  updatedAt?: string
  userId?: string
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
  type?: 'post' | 'artwork' | 'article' | 'event'
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

export function PostModal({ postId, onClose, highlightCommentId }: PostModalProps) {
  const { accessToken, user, capabilities } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [commentText, setCommentText] = useState('')
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [animateLike, setAnimateLike] = useState(false)
  const [pingAnimating, setPingAnimating] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ commentId: string; x: number; y: number } | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState<string>('')
  const [commentMenuOpen, setCommentMenuOpen] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ commentId: string } | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const sliderRef = useRef<Slider | null>(null)
  const [showAddToCollectionModal, setShowAddToCollectionModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState<{ contentType: 'post' | 'comment'; contentId: string } | null>(null)
  
  // ✅ Tüm kullanıcılar koleksiyona eser ekleyebilir
  const roles = capabilities?.roles ?? user?.roles ?? []
  const canManageCollections = true // Herkes koleksiyona eser ekleyebilir

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

  // Menüyü dışarı tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = () => {
      setCommentMenuOpen(null)
    }
    if (commentMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [commentMenuOpen])

  // ESC tuşu ile delete modal'ı kapat
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDeleteConfirm) {
        setShowDeleteConfirm(null)
      }
    }
    if (showDeleteConfirm) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [showDeleteConfirm])

  // Fetch post details - MongoDB'den kalıcı yorumları yükle
  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ['post', postId],
    queryFn: async () => {
      const response = await api.get(`/posts/${postId}`)
      console.log('📥 [PostModal] Post loaded from backend:', {
        postId,
        commentsCount: response.data?.comments?.length || 0,
        comments: response.data?.comments?.map((c: any) => ({ id: c.id, content: c.content?.substring(0, 50) })) || []
      })
      
      // 🔥 KRİTİK: Backend'den gelen yorumları kontrol et
      if (!response.data?.comments || response.data.comments.length === 0) {
        console.warn('⚠️ [PostModal] Backend\'den yorum gelmedi! Post ID:', postId)
      }
      
      return response.data
    },
    enabled: !!accessToken && !!postId,
    staleTime: 0, // 🔥 KRİTİK: Her zaman fresh data çek (MongoDB'den kalıcı yorumlar için)
    gcTime: 0, // 🔥 KRİTİK: Cache'i hemen temizle (eski cacheTime yerine gcTime kullan)
    refetchOnMount: true, // 🔥 KRİTİK: Mount olduğunda refetch et
    refetchOnWindowFocus: true, // 🔥 KRİTİK: Window focus'ta da refetch et (sayfa yenilendiğinde)
    refetchOnReconnect: true, // 🔥 KRİTİK: Bağlantı yenilendiğinde refetch et
  })

  // Yorum odaklaması - highlightCommentId varsa yorumu scroll et
  useEffect(() => {
    if (highlightCommentId && post?.comments) {
      // Post yüklendikten sonra kısa bir gecikme ile scroll et
      const timer = setTimeout(() => {
        const commentElement = document.getElementById(`comment-${highlightCommentId}`)
        if (commentElement) {
          commentElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
          // Hafif highlight efekti
          commentElement.classList.add('ring-2', 'ring-brand-orange', 'ring-opacity-50')
          setTimeout(() => {
            commentElement.classList.remove('ring-2', 'ring-brand-orange', 'ring-opacity-50')
          }, 2000)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [highlightCommentId, post?.comments])

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
    onMutate: async () => {
      // ✅ KRİTİK: Optimistic update - hemen görünsün (3-4 saniye gecikme olmasın)
      await queryClient.cancelQueries({ queryKey: ['post', postId] })
      
      const previousPost = queryClient.getQueryData<Post>(['post', postId])
      
      if (previousPost) {
        queryClient.setQueryData<Post>(['post', postId], {
          ...previousPost,
          isLiked: !previousPost.isLiked,
          _count: {
            ...previousPost._count,
            likes: previousPost.isLiked 
              ? Math.max(0, previousPost._count.likes - 1)
              : previousPost._count.likes + 1,
          },
        })
      }
      
      return { previousPost }
    },
    onError: (err, variables, context) => {
      // Hata durumunda geri al
      if (context?.previousPost) {
        queryClient.setQueryData(['post', postId], context.previousPost)
      }
    },
    onSuccess: () => {
      // ✅ Socket event'i ile güncelleme gelecek, invalidateQueries gerekmez
      // queryClient.invalidateQueries({ queryKey: ['post', postId] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  // Save mutation (works for both posts and artworks)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const isArtwork = post?.type === 'artwork'
      const endpoint = isArtwork ? `/posts/${postId}/save-artwork` : `/posts/${postId}/save`
      
      if (post?.isSaved) {
        await api.delete(endpoint)
        return { saved: false }
      } else {
        await api.post(endpoint)
        return { saved: true }
      }
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(['post', postId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          isSaved: data.saved,
        }
      })
      
      // 🔥 KRİTİK: Query'leri invalidate et VE explicit refetch yap
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['saved'] })
      
      // Explicit refetch to ensure saved items list updates immediately
      const { user } = useAuthStore.getState()
      if (user?.id) {
        await queryClient.refetchQueries({ queryKey: ['saved', user.id] })
      }
    },
  })

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const response = await api.post(`/posts/${postId}/comments`, { content, parentId })
      return response.data
    },
    onSuccess: async (data) => {
      console.log('✅ [PostModal] Comment created successfully:', data?.id)
      
      // 🔥 KRİTİK: Form'u temizle
      setCommentText('')
      setReplyingTo(null)
      setIsPostingComment(false)
      
      // 🔥 OPTIMISTIC UPDATE: Hemen görünsün (duplicate kontrolü ile)
      queryClient.setQueryData<Post>(['post', postId], (oldData) => {
        if (!oldData) return oldData
        
        // Duplicate kontrolü - aynı ID'ye sahip yorum var mı?
        const checkCommentExists = (comments: any[]): boolean => {
          for (const comment of comments || []) {
            if (comment.id === data.id) {
              return true
            }
            if (comment.replies && checkCommentExists(comment.replies)) {
              return true
            }
          }
          return false
        }
        
        if (checkCommentExists(oldData.comments || [])) {
          console.log('⚠️ [PostModal] Comment already exists in cache, skipping:', data.id)
          return oldData
        }
        
        // Backend'den gelen yorumu formatla
        const newComment = {
          id: data.id,
          postId: data.postId,
          content: data.content,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
          parentId: data.parentId || null,
          userId: data.userId || data.user?.id,
          isPinned: false,
          isLikedByCurrentUser: false,
          likesCount: 0,
          user: {
            id: data.user?.id || data.userId,
            username: data.user?.username || user?.username || '',
            fullName: data.user?.fullName || user?.fullName || '',
            avatar: data.user?.avatarUrl || data.user?.avatar || user?.avatar || null,
            isVerified: data.user?.isVerified || false,
          },
          replies: [],
        }
        
        // Parent yorum varsa, onun replies array'ine ekle
        if (data.parentId) {
          const updateReplies = (comments: any[]): any[] => {
            return comments.map((comment: any) => {
              if (comment.id === data.parentId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), newComment],
                }
              }
              if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: updateReplies(comment.replies),
                }
              }
              return comment
            })
          }
          
          return {
            ...oldData,
            comments: updateReplies(oldData.comments || []),
          }
        } else {
          // Ana yorum ise, comments array'ine ekle (en üste)
          return {
            ...oldData,
            comments: [newComment, ...(oldData.comments || [])],
          }
        }
      })
      
      // 🔥 KRİTİK: Backend'den de yükle (kalıcılık için, ama daha uzun gecikme ile)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['post', postId] })
        queryClient.refetchQueries({ queryKey: ['post', postId] })
      }, 1000) // 1 saniye sonra backend'den yükle (optimistic update zaten gösteriyor)
      
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (error: any) => {
      console.error('❌ [PostModal] Failed to create comment:', error)
      setIsPostingComment(false)
      // Hata durumunda query'yi yeniden yükle
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
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

  // Küfür kontrolü
  const hasBadWord = containsBadWord(commentText)

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || isPostingComment || hasBadWord) return
    
    setIsPostingComment(true)
    commentMutation.mutate({ content: commentText.trim(), parentId: replyingTo || undefined })
  }

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      await api.patch(`/posts/${postId}/comments/${commentId}`, { content })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
      setEditingCommentId(null)
      setEditedContent('')
    },
  })

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/posts/${postId}/comments/${commentId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setCommentMenuOpen(null)
    },
  })

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditedContent(comment.content)
    setCommentMenuOpen(null)
  }

  const handleSaveEdit = (commentId: string) => {
    if (!editedContent.trim()) return
    updateCommentMutation.mutate({ commentId, content: editedContent.trim() })
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditedContent('')
  }

  const handleDeleteComment = (commentId: string) => {
    setShowDeleteConfirm({ commentId })
    setCommentMenuOpen(null)
  }

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      deleteCommentMutation.mutate(showDeleteConfirm.commentId)
      setShowDeleteConfirm(null)
    }
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
    commentsSocket.on('newComment', async (newComment: any) => {
      if (newComment.postId === postId) {
        console.log('📨 [PostModal] Received newComment event:', newComment.id)
        
        // 🔥 KRİTİK: Kendi yorumumuzsa zaten optimistic update yaptık, sadece başkalarının yorumlarını ekle
        // Eğer bu yorum zaten cache'de varsa (kendi yorumumuz), invalidate etme
        const currentData = queryClient.getQueryData<Post>(['post', postId])
        const commentExists = currentData?.comments?.some((c: any) => c.id === newComment.id) ||
          currentData?.comments?.some((c: any) => c.replies?.some((r: any) => r.id === newComment.id))
        
        if (commentExists) {
          console.log('✅ [PostModal] Comment already in cache (own comment), skipping socket update')
          return
        }
        
        // Başkasının yorumu ise, optimistic update yap
        queryClient.setQueryData<Post>(['post', postId], (oldData) => {
          if (!oldData) return oldData
          
          // Duplicate kontrolü
          const checkCommentExists = (comments: any[]): boolean => {
            for (const comment of comments || []) {
              if (comment.id === newComment.id) {
                return true
              }
              if (comment.replies && checkCommentExists(comment.replies)) {
                return true
              }
            }
            return false
          }
          
          if (checkCommentExists(oldData.comments || [])) {
            return oldData
          }
          
          // Backend'den gelen yorumu formatla
          const formattedComment = {
            id: newComment.id,
            postId: newComment.postId,
            content: newComment.content,
            createdAt: newComment.createdAt || new Date().toISOString(),
            updatedAt: newComment.updatedAt,
            parentId: newComment.parentId || null,
            userId: newComment.userId || newComment.user?.id,
            isPinned: false,
            isLikedByCurrentUser: false,
            likesCount: 0,
            user: {
              id: newComment.user?.id || newComment.userId,
              username: newComment.user?.username || '',
              fullName: newComment.user?.fullName || '',
              avatar: newComment.user?.avatarUrl || newComment.user?.avatar || null,
              isVerified: newComment.user?.isVerified || false,
            },
            replies: [],
          }
          
          // Parent yorum varsa, onun replies array'ine ekle
          if (newComment.parentId) {
            const updateReplies = (comments: any[]): any[] => {
              return comments.map((comment: any) => {
                if (comment.id === newComment.parentId) {
                  return {
                    ...comment,
                    replies: [...(comment.replies || []), formattedComment],
                  }
                }
                if (comment.replies && comment.replies.length > 0) {
                  return {
                    ...comment,
                    replies: updateReplies(comment.replies),
                  }
                }
                return comment
              })
            }
            
            return {
              ...oldData,
              comments: updateReplies(oldData.comments || []),
            }
          } else {
            // Ana yorum ise, comments array'ine ekle (en üste)
            return {
              ...oldData,
              comments: [formattedComment, ...(oldData.comments || [])],
            }
          }
        })
        
        // Backend'den de yükle (kalıcılık için, ama daha uzun gecikme ile)
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['post', postId] })
          queryClient.refetchQueries({ queryKey: ['post', postId] })
        }, 1000) // 1 saniye sonra backend'den yükle
      }
    })

    commentsSocket.on('commentCreated', (data: any) => {
      if (data.postId === postId) {
        console.log('📨 [PostModal] Received commentCreated event:', data.id)
        // commentCreated event'i sadece bilgilendirme amaçlı
        // newComment event'i zaten yorumu ekledi, burada invalidate etmiyoruz
        // Çünkü invalidateQueries çağrısı yorumları yeniden yükleyip kaybolmasına neden oluyor
      }
    })

    // Yorum silme dinleme
    commentsSocket.on('commentDeleted', (data: { id: string; postId: string; change?: number }) => {
      if (data.postId === postId) {
        // Query'yi invalidate et ki güncel yorumları çeksin
        queryClient.invalidateQueries({ queryKey: ['post', postId] })
      }
    })

    // Yorum güncelleme dinleme
    commentsSocket.on('commentUpdated', (data: { id: string; postId: string; content: string; updatedAt: string }) => {
      if (data.postId === postId) {
        queryClient.invalidateQueries({ queryKey: ['post', postId] })
      }
    })

    // Yorum beğenme güncellemesi dinleme
    commentsSocket.on('commentLikeUpdated', (data: { commentId: string; postId: string; liked: boolean; likesCount: number; userId: string }) => {
      if (data.postId === postId) {
        console.log('📨 [PostModal] Received commentLikeUpdated event:', data.commentId)
        
        // 🔥 KRİTİK: Yorum beğenme durumunu güncelle (yorum kaybolmasını önle)
        queryClient.setQueryData<Post>(['post', postId], (oldData) => {
          if (!oldData) return oldData
          
          // Yorumu bul ve güncelle (ana yorumlar ve replies içinde)
          const updateCommentLikes = (comments: any[]): any[] => {
            return comments.map((comment: any) => {
              if (comment.id === data.commentId) {
                return {
                  ...comment,
                  isLikedByCurrentUser: data.userId === user?.id ? data.liked : comment.isLikedByCurrentUser,
                  likesCount: data.likesCount,
                  _count: {
                    ...comment._count,
                    likes: data.likesCount,
                  },
                  likes: data.userId === user?.id && data.liked ? [{ id: 'temp' }] : (data.userId === user?.id ? [] : comment.likes),
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
      commentsSocket.off('commentLikeUpdated')
      commentsSocket.off('commentPinned')
      commentsSocket.off('connect')
    }
  }, [accessToken, postId, queryClient, user?.id])

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
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex animate-in fade-in slide-in-from-bottom-4 duration-300"
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
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-4 duration-300 transition-colors"
        style={{ height: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left side - Media - Sabit yükseklik */}
        <div className="md:w-3/5 bg-black dark:bg-gray-950 flex items-center justify-center h-[520px] md:h-[600px] min-h-full relative w-full overflow-hidden [&_.slick-slider]:pointer-events-auto flex-shrink-0">
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
              <div className="w-full h-full flex items-center justify-center">
                {mediaArray[0].type === 'video' ? (
                  <video
                    src={resolveImageUrl(mediaArray[0].url)}
                    className="w-full h-full object-contain max-h-full"
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
                    className="w-full h-full object-contain max-h-full"
                    onError={(e) => {
                      console.error('PostModal Media Error:', resolveImageUrl(mediaArray[0].url))
                      ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                    }}
                  />
                )}
              </div>
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
        <div className="md:w-2/5 flex flex-col h-[520px] md:h-[600px] max-h-[90vh]">
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
                <div className="flex items-center gap-2">
                  {user?.id !== post.user.id && (
                    <button
                      onClick={() => setShowReportModal({ contentType: 'post', contentId: post.id })}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                      title="Raporla"
                    >
                      <span className="text-sm">🚩</span>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
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
            {/* ✅ Kaydet ve Koleksiyona Ekle - Yatay hizalı, yuvarlak ikon butonlar */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="relative w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-brand-orange/50 dark:hover:border-brand-orange/50 flex items-center justify-center transition-all duration-200 group"
                title={post.isSaved ? "Kaydedildi" : "Kaydet"}
              >
                <Bookmark
                  size={18}
                  className={`transition-all duration-200 ${
                    post.isSaved
                      ? 'fill-brand-orange text-brand-orange'
                      : 'text-gray-600 dark:text-gray-400 group-hover:text-brand-orange'
                  }`}
                />
              </button>
              {canManageCollections && post?.type === 'artwork' && (
                <button
                  onClick={() => setShowAddToCollectionModal(true)}
                  className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-brand-orange/50 dark:hover:border-brand-orange/50 flex items-center justify-center transition-all duration-200 group"
                  title="Koleksiyona Ekle"
                >
                  <FolderPlus size={18} className="text-gray-600 dark:text-gray-400 group-hover:text-brand-orange transition-colors duration-200" />
                </button>
              )}
            </div>
          </div>


          {/* Comments Section - Instagram Style - Scroll */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 comments-scroll pr-2 min-h-0">
            {/* ✅ SABİTLENEN YORUM ALANI - Özel Banner */}
            {(() => {
              const pinnedComment = post.comments?.find((c: any) => c.isPinned);
              if (!pinnedComment) return null;
              
              const isHighlighted = highlightCommentId === pinnedComment.id
              
              return (
                <div 
                  id={`comment-${pinnedComment.id}`}
                  className={`flex items-start gap-2 mb-4 px-4 py-3 rounded-xl bg-brand-orange/5 dark:bg-brand-orange/10 border border-brand-orange/30 dark:border-brand-orange/40 ${isHighlighted ? 'ring-2 ring-brand-orange ring-opacity-50' : ''}`}
                >
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
                    const isCommentOwner = comment.userId === user?.id || comment.user.id === user?.id
                    const isPostOwner = post.user.id === user?.id
                    const isEdited = comment.updatedAt && new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime()
                    const isEditing = editingCommentId === comment.id
                    const isHighlighted = highlightCommentId === comment.id

                    return (
                      <div 
                        key={comment.id}
                        id={`comment-${comment.id}`}
                        className={isHighlighted ? 'ring-2 ring-brand-orange ring-opacity-50 rounded-lg p-2 -m-2 transition-all' : ''}
                      >
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
                          
                          {/* Yorum metni - Düzenleme modu */}
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editedContent}
                                    onChange={(e) => setEditedContent(e.target.value)}
                                    className="w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-black dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                                    rows={3}
                                    autoFocus
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleSaveEdit(comment.id)}
                                      disabled={updateCommentMutation.isPending || !editedContent.trim()}
                                      className="px-3 py-1 text-xs font-medium bg-brand-orange text-white rounded-lg hover:bg-brand-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      Kaydet
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      disabled={updateCommentMutation.isPending}
                                      className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                                    >
                                      İptal
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-black dark:text-white block leading-relaxed">
                                  {comment.content}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Alt satır - tarih, (düzenlendi) ve yanıtla */}
                          {!isEditing && (
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-xs text-[#444] dark:text-gray-400">
                                {new Date(comment.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                {isEdited && (
                                  <span className="ml-1 opacity-60">(düzenlendi)</span>
                                )}
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
                                className="text-xs text-brand-orange hover:underline font-medium transition-colors flex items-center gap-1"
                              >
                                <CornerDownRight size={14} />
                                Yanıtla
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Kalp + 3 Nokta Menü - Sağ üst köşede, yan yana */}
                        {!isEditing && (
                          <div className="absolute top-3 right-3 flex items-center gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Beğeni butonu */}
                            <div className="flex-shrink-0">
                              <CommentLikeButton
                                commentId={comment.id}
                                initialLiked={comment.isLikedByCurrentUser || false}
                                initialCount={comment.likesCount || 0}
                                type="post"
                                postId={postId}
                              />
                            </div>
                            
                            {/* 3 Nokta Menü - Sadece yetkisi olanlara görünür */}
                            {(isCommentOwner || isPostOwner) && (
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCommentMenuOpen(commentMenuOpen === comment.id ? null : comment.id)
                                  }}
                                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                >
                                  <MoreVertical size={16} className="text-gray-600 dark:text-gray-400" />
                                </button>

                                {/* Menü Dropdown */}
                                {commentMenuOpen === comment.id && (
                                  <div className="absolute top-8 right-0 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 min-w-[160px] animate-in fade-in zoom-in-95 duration-150">
                                    {isCommentOwner && (
                                      <>
                                        <button
                                          onClick={() => handleEditComment(comment)}
                                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-t-lg transition-colors"
                                        >
                                          Düzenle
                                        </button>
                                        <button
                                          onClick={() => handleDeleteComment(comment.id)}
                                          className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                          Sil
                                        </button>
                                      </>
                                    )}
                                    {!isCommentOwner && isPostOwner && (
                                      <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                      >
                                        Yorumu Sil
                                      </button>
                                    )}
                                    {!isCommentOwner && (
                                      <button
                                        onClick={() => {
                                          setShowReportModal({ contentType: 'comment', contentId: comment.id })
                                          setCommentMenuOpen(null)
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-b-lg transition-colors"
                                      >
                                        🚩 Raporla
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Raporla butonu - Yorum sahibi değilse */}
                            {!isCommentOwner && !isPostOwner && (
                              <button
                                onClick={() => setShowReportModal({ contentType: 'comment', contentId: comment.id })}
                                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                title="Raporla"
                              >
                                <span className="text-xs">🚩</span>
                              </button>
                            )}
                          </div>
                        )}
                      
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
                        {comment.replies.map((reply: any) => {
                          const isReplyHighlighted = highlightCommentId === reply.id
                          return (
                            <div 
                              key={reply.id}
                              id={`comment-${reply.id}`}
                              className={isReplyHighlighted ? 'ring-2 ring-brand-orange ring-opacity-50 rounded-lg p-2 -m-2 transition-all' : ''}
                            >
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
                                  postId={postId}
                                />
                              </div>
                            </div>

                            {/* Yanıt için Emoji Tepkileri kaldırıldı */}
                            {/* <div className="ml-9 mt-1">
                              <CommentReactions commentId={reply.id} postId={postId} />
                            </div> */}
                          </div>
                          )
                        })}
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
            <form onSubmit={handleComment} className="px-4 py-3">
              <div className="flex items-center">
                <MentionInput
                  value={commentText}
                  setValue={setCommentText}
                  placeholder={replyingTo ? "Yanıt yaz..." : "Yorum ekle..."}
                  disabled={isPostingComment}
                  className="flex-1 bg-transparent text-gray-300 dark:text-gray-300 text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || isPostingComment || hasBadWord}
                  className="ml-2 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-full p-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPostingComment ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
              {hasBadWord && (
                <p className="text-xs text-orange-500 mt-1 px-1">
                  Bu yorum Feellink topluluk kurallarına uygun değil.
                </p>
              )}
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

      {/* Delete Comment Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="bg-white dark:bg-[#0f172a] rounded-xl w-[360px] max-w-[90vw] p-6 shadow-xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-black dark:text-white text-base font-semibold mb-2">
              Yorumu sil?
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Bu yorumu sildiğinizde geri alınamaz.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                İptal
              </button>

              <button
                onClick={confirmDelete}
                disabled={deleteCommentMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteCommentMutation.isPending ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          isOpen={!!showReportModal}
          onClose={() => setShowReportModal(null)}
          contentType={showReportModal.contentType}
          contentId={showReportModal.contentId}
        />
      )}
    </div>
  )
}

