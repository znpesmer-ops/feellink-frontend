'use client'

import { useState, useEffect, useRef } from 'react'
import { Heart, MoreVertical, Trash2, MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { initPostsSocket } from '@/lib/socket'
import { ProRoleBadge } from './ProRoleBadge'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import toast from 'react-hot-toast'

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
  const { user, accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const [isLiked, setIsLiked] = useState(
    post.likedBy?.includes(user?.id || '') || false
  )
  const [likesCount, setLikesCount] = useState(post.likes || 0)
  const [animateLike, setAnimateLike] = useState(false)
  const [pingAnimating, setPingAnimating] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Explore variant için hover ve yorum döngüsü state'leri
  const [isHovered, setIsHovered] = useState(false)
  const [activeCommentIndex, setActiveCommentIndex] = useState(0)

  // Check if current user is the post owner
  const isOwner = user?.id === post.userId || user?.id === post.authorId || user?.username === post.authorUsername

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

    return () => {
      postsSocket.off('postLikeUpdated')
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
      setIsLiked(data.liked)
      // Optimistic update - Socket.IO'dan gelen güncelleme gerçek değeri ayarlayacak
      if (data.liked) {
        setLikesCount((prev) => prev + 1)
      } else {
        setLikesCount((prev) => Math.max(0, prev - 1))
      }
    },
    onError: (error) => {
      console.error('Like error:', error)
      // Hata durumunda state'i geri al
      setIsLiked((prev) => !prev)
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

  // Explore variant için özel render
  if (variant === 'explore') {
    const commentsCount = post._count?.comments || 0
    const likesCount = post.likes || post._count?.likes || 0
    
    // Deterministic renk seçimi - index'e göre alternatif turuncu/mavi
    const cardIndex = index ?? 0
    const isOrange = cardIndex % 2 === 0
    const borderColor = isOrange 
      ? 'border-[rgba(255,140,0,0.3)] dark:border-[rgba(255,140,0,0.15)]'
      : 'border-[rgba(40,120,255,0.3)] dark:border-[rgba(40,120,255,0.15)]'
    
    return (
      <div
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setActiveCommentIndex(0) // Hover çıkınca başa dön
        }}
        className={`relative w-full max-w-[320px] mx-auto bg-gray-900 dark:bg-[#111] rounded-[16px] overflow-hidden border ${borderColor} shadow-sm hover:shadow-lg hover:shadow-brand-orange/20 transition-all hover:-translate-y-1 group cursor-pointer`}
      >
        {/* Keşfet Etiketi - Sol üst */}
        <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/20">
          <p className="text-xs font-medium text-white/80">
            Keşfet {post.type && <span className="text-white/60">• {post.type === 'artwork' ? 'Eser' : post.type === 'event' ? 'Etkinlik' : 'Gönderi'}</span>}
          </p>
        </div>

        {/* Görsel - Kartın %70-75'ini kaplar */}
        {post.cover && (
          <div className="relative w-full" style={{ height: '70%', minHeight: '280px' }}>
            <img
              src={resolveImageUrl(post.cover)}
              alt={post.title}
              className={`w-full h-full object-cover transition-all duration-300 ${
                isHovered ? 'blur-sm scale-105' : ''
              }`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
              }}
            />
            {/* Gradient Overlay - En altta yazı okunurluğu için */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            
            {/* Hover Overlay - Blur + Dark + Yorum Döngüsü (Sadece yorum varsa) */}
            {isHovered && recentComments && recentComments.length > 0 && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-20 transition-opacity duration-300">
                {/* Üstte - Beğeni ve Yorum Sayıları (Sadece Bilgi, Tıklanamaz) */}
                <div className="absolute top-3 right-3 flex items-center gap-3 text-white/90 text-xs font-medium pointer-events-none">
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {likesCount}
                  </span>
                  {commentsCount > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {commentsCount}
                    </span>
                  )}
                </div>

                {/* Ortada/Altta - Yorum Metinleri Döngü Halinde */}
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-sm text-white/90 line-clamp-2 transition-opacity duration-500 font-medium italic">
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
                  {recentComments.length > 1 && (
                    <p className="text-xs text-white/60 mt-1">
                      {activeCommentIndex + 1} / {recentComments.length}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alt Bilgi Alanı - Yarı transparan overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
          {/* Başlık */}
          <h3 className="text-base font-semibold text-white mb-2 line-clamp-1">
            {post.title}
          </h3>

          {/* Alt açıklama - Kullanıcı + etkileşim */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {post.authorAvatar ? (
                <img
                  src={resolveImageUrl(post.authorAvatar)}
                  alt={post.author}
                  className="w-5 h-5 rounded-full object-cover border border-white/20"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                  }}
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">
                    {post.author[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              <p className="text-xs text-white/80 font-medium">
                {post.authorUsername || post.author}
              </p>
              {commentsCount > 0 && (
                <span className="text-xs text-white/60">• {commentsCount} yorum</span>
              )}
            </div>

            {/* Minimal etkileşim ikonu - Alt sağ */}
            <div className="flex items-center gap-1.5 text-white/70">
              {commentsCount > 0 ? (
                <>
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">{commentsCount}</span>
                </>
              ) : (
                <>
                  <Heart 
                    className={`w-4 h-4 ${isLiked ? 'fill-brand-orange text-brand-orange' : ''}`}
                  />
                  <span className="text-xs font-medium">{likesCount}</span>
                </>
              )}
            </div>
          </div>

          {/* CTA - Gönderiyi keşfet */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCardClick()
            }}
            className="mt-3 w-full text-xs font-medium text-brand-orange hover:text-brand-blue transition-colors text-left"
          >
            Gönderiyi keşfet →
          </button>
        </div>

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
                    <div className="flex items-center gap-2 text-white text-lg font-semibold">
                      <Heart className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} />
                      <span>{likesCount}</span>
                    </div>
                    
                    {/* Comments */}
                    <div className="flex items-center gap-2 text-white text-lg font-semibold">
                      <MessageCircle className="w-6 h-6" />
                      <span>{(post as any)._count?.comments || (post as any).commentCount || 0}</span>
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
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 ${
              isLiked
                ? 'text-brand-orange bg-brand-blue/10 dark:bg-brand-blue/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-brand-orange'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Heart
              size={18}
              className={`transition-all duration-300 ${animateLike ? 'scale-125' : 'scale-100'} ${
                isLiked ? 'fill-brand-orange text-brand-orange' : ''
              }`}
              strokeWidth={isLiked ? 0 : 2}
            />
            {(animateLike || pingAnimating) && (
              <span className="absolute inset-0 animate-ping bg-brand-orange/40 rounded-lg"></span>
            )}
            <span className="text-sm font-medium">{likesCount}</span>
          </button>
        )}
      </div>
    </div>
  )
}

