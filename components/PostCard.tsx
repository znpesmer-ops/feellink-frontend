'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { initPostsSocket } from '@/lib/socket'
import { ProRoleBadge } from './ProRoleBadge'

interface PostCardProps {
  post: {
    id: string
    title: string
    content: string
    cover?: string | null
    author: string
    authorUsername?: string
    authorAvatar?: string | null
    likes: number
    likedBy?: string[]
    date: string
    createdAt: string
  }
  onLike?: (id: string) => void
}

export default function PostCard({ post, onLike }: PostCardProps) {
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const [isLiked, setIsLiked] = useState(
    post.likedBy?.includes(user?.id || '') || false
  )
  const [likesCount, setLikesCount] = useState(post.likes || 0)
  const [animateLike, setAnimateLike] = useState(false)
  const [pingAnimating, setPingAnimating] = useState(false)

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

  return (
    <div
      onClick={handleCardClick}
      className="bg-white/80 dark:bg-[#1a1a1a]/70 backdrop-blur-md border border-gray-200 dark:border-gray-700/40 rounded-2xl shadow-sm p-5 transition-all hover:shadow-md cursor-pointer group"
    >
      {/* Kapak görseli - Kare form */}
      {post.cover && (
        <div className="relative w-full aspect-square mb-4 rounded-2xl overflow-hidden">
          <img
            src={post.cover}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      {/* Başlık */}
      <h3 className="text-lg font-semibold text-[#111] dark:text-white mb-2 line-clamp-2">
        {post.title}
      </h3>

      {/* İçerik önizleme */}
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug mb-4 line-clamp-3">
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
              src={post.authorAvatar}
              alt={post.author}
              className="w-6 h-6 rounded-full object-cover"
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

        {/* Beğeni butonu - Animasyonlu */}
        <button
          onClick={handleLike}
          disabled={likeMutation.isPending}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 ${
            isLiked
              ? 'text-[#ff7b00] bg-orange-50 dark:bg-orange-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-[#ff7b00]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Heart
            size={18}
            className={`transition-all duration-300 ${animateLike ? 'scale-125' : 'scale-100'} ${
              isLiked ? 'fill-[#ff7b00] text-[#ff7b00]' : ''
            }`}
            strokeWidth={isLiked ? 0 : 2}
          />
          {(animateLike || pingAnimating) && (
            <span className="absolute inset-0 animate-ping bg-[#ff7b00]/40 rounded-lg"></span>
          )}
          <span className="text-sm font-medium">{likesCount}</span>
        </button>
      </div>
    </div>
  )
}

