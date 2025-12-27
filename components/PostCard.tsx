'use client'

import { useState, useEffect, useRef } from 'react'
import { Heart, MoreVertical, Trash2, MessageCircle, FolderPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { initPostsSocket } from '@/lib/socket'
import { ProRoleBadge } from './ProRoleBadge'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import toast from 'react-hot-toast'
import { AddToCollectionModal } from './collections/AddToCollectionModal'

interface PostCardProps {
  post: {
    id: string
    title: string
    content: string
    cover?: string | null
    author: string
    authorUsername?: string
    authorAvatar?: string | null
    authorId?: string
    userId?: string
    likes: number
    likedBy?: string[]
    date: string
    createdAt: string
    _count?: {
      comments: number
      likes: number
    }
    type?: string
  }
  onLike?: (id: string) => void
  onDelete?: (id: string) => void
  variant?: 'default' | 'explore'
  pinnedComment?: { user: string; text: string } | null
  recentComments?: Array<{ id: string; content: string; isPinned: boolean; createdAt: string; user?: { username: string } }>
  index?: number
  showLike?: boolean // Ana sayfa için beğeni butonunu gizlemek için
}

export default function PostCard({ post, onLike, onDelete, variant = 'default', pinnedComment, recentComments, index, showLike = true }: PostCardProps) {
  const router = useRouter()
  const { user, accessToken, capabilities } = useAuthStore()
  const queryClient = useQueryClient()
  const [isLiked, setIsLiked] = useState(
    post.likedBy?.includes(user?.id || '') || false
  )
  const [likesCount, setLikesCount] = useState(post.likes || post._count?.likes || 0)
  const [commentsCount, setCommentsCount] = useState(post._count?.comments || 0)
  const [animateLike, setAnimateLike] = useState(false)
  const [pingAnimating, setPingAnimating] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAddToCollectionModal, setShowAddToCollectionModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Explore variant için hover ve yorum döngüsü state'leri
  const [isHovered, setIsHovered] = useState(false)
  const [activeCommentIndex, setActiveCommentIndex] = useState(0)

  // Check if current user is the post owner
  const isOwner = user?.id === post.userId || user?.id === post.authorId || user?.username === post.authorUsername
  
  // ✅ Tüm kullanıcılar koleksiyona eser ekleyebilir
  const roles = capabilities?.roles ?? user?.roles ?? []
  const canManageCollections = true // Herkes koleksiyona eser ekleyebilir
  const isArtwork = post.type === 'artwork'

  // 🔔 Socket.IO ile real-time beğeni dinleme
  useEffect(() => {
    if (!accessToken) return

    const postsSocket = initPostsSocket(accessToken)

    postsSocket.on('postLikeUpdated', (data: { postId: string; change: number; likeCount: number; isLiked: boolean; userId: string }) => {
      if (data.postId === post.id) {
        setLikesCount(data.likeCount)
        // Eğer kullanıcı kendisi beğeniyorsa state'i güncelle
        if (data.userId === user?.id) {
          setIsLiked(data.isLiked)
        } else {
          // Başkası beğeniyorsa ping animasyonu göster
          if (data.change > 0) {
            setPingAnimating(true)
            setTimeout(() => setPingAnimating(false), 600)
          }
        }
        // LocalStorage'ı da güncelle (fallback için)
        const posts = JSON.parse(localStorage.getItem('published-posts-feellink') || '[]')
        const updatedPosts = posts.map((p: any) => {
          if (p.id === post.id) {
            const likedBy = p.likedBy || []
            if (data.isLiked && !likedBy.includes(data.userId)) {
              return { ...p, likes: data.likeCount, likedBy: [...likedBy, data.userId] }
            } else if (!data.isLiked) {
              return { ...p, likes: data.likeCount, likedBy: likedBy.filter((id: string) => id !== data.userId) }
            }
          }
          return p
        })
        localStorage.setItem('published-posts-feellink', JSON.stringify(updatedPosts))
        window.dispatchEvent(new CustomEvent('localPostsUpdated'))
      }
    })

    // 🔔 Socket.IO ile real-time yorum sayısı dinleme
    postsSocket.on('post:comment', (data: { postId: string; comments: number }) => {
      if (data.postId === post.id) {
        console.log(`💬 [PostCard] Yorum sayısı güncellendi - postId: ${post.id}, comments: ${data.comments}`)
        // ✅ KRİTİK: State'i hemen güncelle (explore variant hover overlay için)
        setCommentsCount(data.comments)
      }
    })

    return () => {
      postsSocket.off('postLikeUpdated')
      postsSocket.off('post:comment')
    }
  }, [accessToken, post.id, user?.id])

  // Explore variant için hover durumunda yorum döngüsü
  useEffect(() => {
    if (variant !== 'explore' || !isHovered || !recentComments || recentComments.length === 0) {
      return
    }

    const interval = setInterval(() => {
      setActiveCommentIndex((prev) =>
        prev === recentComments.length - 1 ? 0 : prev + 1
      )
    }, 2500) // 2.5 saniye → ideal, acele etmiyor

    return () => clearInterval(interval)
  }, [isHovered, recentComments, variant])

  // Like mutation - Backend API
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (isLiked) {
        await api.delete(`/posts/${post.id}/like`)
        return { liked: false }
      } else {
        await api.post(`/posts/${post.id}/like`)
        return { liked: true }
      }
    },
    onSuccess: (data) => {
      // ✅ Optimistic update zaten handleLike'da yapıldı
      // Socket.IO'dan gelen güncelleme gerçek değeri ayarlayacak
      // Burada sadece doğrulama yapıyoruz
      if (data.liked !== isLiked) {
        setIsLiked(data.liked)
        if (data.liked) {
          setLikesCount((prev) => prev + 1)
        } else {
          setLikesCount((prev) => Math.max(0, prev - 1))
        }
      }
    },
    onError: (error) => {
      console.error('Like error:', error)
      // Hata durumunda state'i geri al
      setIsLiked((prev) => !prev)
      if (isLiked) {
        setLikesCount((prev) => Math.max(0, prev - 1))
      } else {
        setLikesCount((prev) => prev + 1)
      }
    },
  })

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!accessToken || !user?.id) {
      router.push('/login')
      return
    }

    // Optimistic update
    const wasLiked = isLiked
    setIsLiked(!wasLiked)
    if (!wasLiked) {
      setLikesCount((prev) => prev + 1)
      setAnimateLike(true)
      setTimeout(() => setAnimateLike(false), 400)
    } else {
      setLikesCount((prev) => Math.max(0, prev - 1))
    }

    // Backend API çağrısı
    likeMutation.mutate()

    // Callback'i çağır
    if (onLike) {
      onLike(post.id)
    }
  }

  const handleCardClick = () => {
    router.push(`/posts/${post.id}`)
  }

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/posts/${post.id}`)
    },
    onSuccess: () => {
      toast.success('Gönderi başarıyla silindi')
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      
      // Call parent callback if provided
      if (onDelete) {
        onDelete(post.id)
      }
      
      setMenuOpen(false)
      setConfirmDelete(false)
    },
    onError: (error: any) => {
      console.error('Delete error:', error)
      toast.error(error.response?.data?.message || 'Gönderi silinirken bir hata oluştu')
      setConfirmDelete(false)
    },
  })

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete(true)
    setMenuOpen(false)
  }

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteMutation.mutate()
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete(false)
  }

  // Close menu when clicking outside - Only check clicks outside the menu container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      // Use capture phase to check before other handlers
      document.addEventListener('mousedown', handleClickOutside, true)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true)
      }
    }
  }, [menuOpen])

  // Sayı formatlama fonksiyonu
  const formatCount = (count: number): string => {
    if (count >= 1_000_000) {
      const formatted = (count / 1_000_000).toFixed(1)
      return formatted.replace('.0', '') + 'M'
    }
    if (count >= 1_000) {
      const formatted = (count / 1_000).toFixed(1)
      return formatted.replace('.0', '') + 'k'
    }
    return count.toString()
  }

  // Explore variant için özel render
  if (variant === 'explore') {
    // State'ten yorum sayısını al (socket event'leri ile güncelleniyor)
    const displayCommentsCount = commentsCount || post._count?.comments || 0
    const displayLikesCount = likesCount || post.likes || post._count?.likes || 0
    
    // Deterministic renk seçimi - index'e göre alternatif turuncu/mavi (sadece renk şeridi için)
    const cardIndex = index ?? 0
    const isOrange = cardIndex % 2 === 0
    
    return (
      <div
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setActiveCommentIndex(0) // Hover çıkınca başa dön
        }}
        className="relative w-full max-w-[440px] mx-auto h-[420px] rounded-[16px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col explore-card"
      >
        {/* Görsel - Kartın en üstünden başlar */}
        {post.cover && (
          <div className="relative w-full aspect-[3/4] flex-shrink-0 overflow-hidden">
            <img
              src={resolveImageUrl(post.cover)}
              alt={post.title}
              className={`w-full h-full object-cover transition-all duration-300 ${
                isHovered ? 'blur-sm scale-105' : ''
              }`}
              style={{ objectPosition: 'center top' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
              }}
            />
            {/* Hover Overlay - Blur + Dark + Yorum Döngüsü (Sadece yorum varsa) */}
            {isHovered && recentComments && recentComments.length > 0 && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-20 transition-opacity duration-300 pointer-events-none">
                {/* Yorum Metni + Kullanıcı Adı - Tam Ortada, Quote Hissi */}
                <div className="text-center max-w-[90%] px-6 flex flex-col gap-1.5">
                  <p 
                    className="text-sm text-white/90 line-clamp-3 transition-opacity duration-500 font-medium italic"
                    style={{
                      textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                      lineHeight: '1.5'
                    }}
                  >
                    "{(() => {
                      const comment = recentComments[activeCommentIndex]?.content || ''
                      // İlk 2-3 kelimeyi al, maksimum 50 karakter
                      const words = comment.split(' ').slice(0, 3).join(' ')
                      if (words.length > 50) {
                        return comment.substring(0, 50) + '...'
                      }
                      return comment.length > words.length ? words + '...' : words
                    })()}"
                  </p>
                  {recentComments[activeCommentIndex]?.user?.username && (
                    <span 
                      className="text-xs text-white/65 transition-opacity duration-500"
                      style={{
                        letterSpacing: '0.3px',
                        textShadow: '0 1px 4px rgba(0,0,0,0.5)'
                      }}
                    >
                      — {recentComments[activeCommentIndex].user.username}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Beğeni + Yorum ikonları - Sadece hover'da görünür, tam ortada */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
              <div className="flex items-center gap-6">
                {/* Beğeni ikonu + sayı - Socket event'leri ile aktif güncelleniyor */}
                <div className="flex items-center gap-2 text-white bg-black/55 backdrop-blur-md px-4 py-2 rounded-full">
                  <Heart 
                    size={16}
                    strokeWidth={1.5}
                    className={isLiked ? 'fill-brand-orange text-brand-orange' : 'text-white'}
                  />
                  <span className="text-sm font-medium">{formatCount(displayLikesCount)}</span>
                </div>
                
                {/* Yorum ikonu + sayı - Socket event'leri ile aktif güncelleniyor */}
                <div className="flex items-center gap-2 text-white bg-black/55 backdrop-blur-md px-4 py-2 rounded-full">
                  <MessageCircle size={16} strokeWidth={1.5} className="text-white" />
                  <span className="text-sm font-medium">{formatCount(displayCommentsCount)}</span>
                </div>
              </div>
            </div>

            {/* Kullanıcı bilgisi overlay - Sol alt köşe */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/40 group-hover:bg-black/60 backdrop-blur-md px-2 py-1 rounded-full z-20 transition-all duration-300">
              {post.authorAvatar ? (
                <img
                  src={resolveImageUrl(post.authorAvatar)}
                  alt={post.author}
                  className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                  }}
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[8px] font-semibold text-white">
                    {(post.authorUsername || post.author)[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-[11px] font-medium text-white/90 truncate max-w-[120px]">
                {post.authorUsername || post.author}
              </span>
            </div>
          </div>
        )}

        {/* İnce renkli şerit - EN ALTA */}
        <div className={`h-[4px] w-full ${isOrange ? 'bg-orange-500' : 'bg-blue-600'} rounded-b-xl`} />

        {/* Menü butonu - Sadece sahip görür */}
        {isOwner && (
          <div ref={menuRef} className="absolute top-3 right-3 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(!menuOpen)
              }}
              className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors pointer-events-auto"
            >
              <MoreVertical size={16} />
            </button>
            
            {menuOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute top-10 right-0 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[120px] z-30"
              >
                {canManageCollections && isArtwork && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      setShowAddToCollectionModal(true)
                    }}
                    className="w-full px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-sm font-medium transition-colors"
                  >
                    <FolderPlus size={16} />
                    Koleksiyona Ekle
                  </button>
                )}
                <button
                  onClick={handleDeleteClick}
                  disabled={deleteMutation.isPending}
                  className="w-full px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} />
                  Sil
                </button>
              </div>
            )}
          </div>
        )}

        {/* Silme onay modalı */}
        {confirmDelete && (
          <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={handleCancelDelete}
          >
            <div 
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Gönderiyi Sil
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Bu gönderiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Default variant (mevcut tasarım)
  return (
    <div
      onClick={handleCardClick}
      className="relative w-full bg-white/80 dark:bg-[#1a1a1a]/70 backdrop-blur-md border border-gray-200 dark:border-gray-700/40 rounded-2xl shadow-sm p-4 md:p-5 transition-all hover:shadow-md cursor-pointer group"
    >
      {/* Menü butonu - Sadece sahip görür, her zaman görünür (görsel olsun ya da olmasın) - Post z-index */}
      {isOwner && (
        <div ref={menuRef} className="absolute top-4 right-4 z-[60]">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
            className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors pointer-events-auto"
          >
            <MoreVertical size={16} />
          </button>
          
          {/* Açılır menü - Sadece kartın içinde - Post z-index */}
          {menuOpen && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute top-10 right-0 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[120px] z-[60]"
            >
              {canManageCollections && isArtwork && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    setShowAddToCollectionModal(true)
                  }}
                  className="w-full px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <FolderPlus size={16} />
                  Koleksiyona Ekle
                </button>
              )}
              <button
                onClick={handleDeleteClick}
                disabled={deleteMutation.isPending}
                className="w-full px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                Sil
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Kapak görseli - Kare form */}
      {post.cover && (
        <div className="relative w-full aspect-square mb-4 rounded-2xl overflow-hidden group/image">
          {(() => {
            const imageUrl = resolveImageUrl(post.cover)
            console.log('PostCard IMAGE URL:', imageUrl, 'Original:', post.cover)
            return (
              <>
                <img
                  src={imageUrl}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    console.error('PostCard Image Error:', imageUrl)
                    ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                  }}
                />
                
                {/* Modern Hover Overlay - Glass Effect - Düşük z-index ile menü butonlarının altında */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover/image:opacity-100 transition-all duration-200 flex items-center justify-center rounded-2xl z-[5]">
                  <div className="flex items-center gap-8">
                    {/* Likes */}
                    <div className="flex items-center gap-2 text-white/85 text-base font-medium">
                      <Heart 
                        size={18} 
                        strokeWidth={1.5} 
                        className={isLiked ? "fill-brand-orange text-brand-orange" : "text-inherit"} 
                      />
                      <span>{likesCount}</span>
                    </div>
                    
                    {/* Comments */}
                    <div className="flex items-center gap-2 text-white/85 text-base font-medium">
                      <MessageCircle size={18} strokeWidth={1.5} className="text-inherit" />
                      <span>{commentsCount || (post as any)._count?.comments || (post as any).commentCount || 0}</span>
                    </div>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}
      
      {/* Silme onay modalı - Sadece açıkken görünür, z-index sidebar'dan düşük */}
      {confirmDelete && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-40"
          onClick={handleCancelDelete}
        >
          <div 
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Gönderiyi Sil
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Bu gönderiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Başlık */}
      <h3 className="text-base md:text-lg font-semibold text-[#111] dark:text-white mb-2 line-clamp-2">
        {post.title}
      </h3>

      {/* İçerik önizleme */}
      <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 leading-snug mb-3 md:mb-4 line-clamp-3">
        {post.content}
      </p>

      {/* Alt bilgi */}
      <div className="flex justify-between items-center">
        <Link
          href={`/profile/${post.authorUsername || post.author}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer"
        >
          {post.authorAvatar ? (
            <img
              src={resolveImageUrl(post.authorAvatar)}
              alt={post.author}
              className="w-6 h-6 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
              }}
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                {post.author[0]?.toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
              {post.author}
              <ProRoleBadge roles={(post as any).authorRoles} plan={(post as any).authorPlan} />
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(post.date || post.createdAt).toLocaleDateString('tr-TR', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </Link>

        {/* Beğeni butonu - Sadece showLike=true ise göster (ana sayfa için false) */}
        {showLike && (
          <button
            onClick={handleLike}
            disabled={likeMutation.isPending}
            className={`like-btn relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:scale-110 ${
              isLiked
                ? 'text-brand-orange bg-brand-blue/10 dark:bg-brand-blue/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-brand-orange'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Heart
              size={18}
              strokeWidth={1.5}
              className={`transition-all duration-300 ${animateLike ? 'scale-125' : 'scale-100'} ${
                isLiked ? 'fill-brand-orange text-brand-orange' : 'text-gray-600 dark:text-gray-400'
              }`}
            />
            {(animateLike || pingAnimating) && (
              <span className="absolute inset-0 animate-ping bg-brand-orange/40 rounded-lg"></span>
            )}
            <span className="text-sm font-medium">{likesCount}</span>
          </button>
        )}
      </div>

      {/* Add to Collection Modal */}
      {showAddToCollectionModal && (
        <AddToCollectionModal
          postId={post.id}
          open={showAddToCollectionModal}
          onClose={() => setShowAddToCollectionModal(false)}
        />
      )}
    </div>
  )
}

