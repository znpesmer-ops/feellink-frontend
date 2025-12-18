'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { Bookmark, Heart, MessageCircle, Image as ImageIcon } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

interface SavedArtworksProps {
  userId: string
}

export function SavedArtworks({ userId }: SavedArtworksProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  // Fetch saved items (both posts and artworks)
  const { data: savedItems, isLoading } = useQuery({
    queryKey: ['saved', userId],
    queryFn: async () => {
      const response = await api.get(`/users/${userId}/saved`)
      return response.data || []
    },
    enabled: !!userId,
  })

  // Unsave mutation (works for both posts and artworks)
  const unsaveMutation = useMutation({
    mutationFn: async ({ postId, type }: { postId: string; type: 'post' | 'artwork' }) => {
      if (type === 'artwork') {
        await api.delete(`/posts/${postId}/save-artwork`)
      } else {
        await api.delete(`/posts/${postId}/save`)
      }
    },
    onSuccess: async (_, { type }) => {
      toast.success(type === 'artwork' ? 'Eser kaydedilenlerden kaldırıldı' : 'Gönderi kaydedilenlerden kaldırıldı')
      
      // 🔥 KRİTİK: Query'leri invalidate et VE explicit refetch yap
      queryClient.invalidateQueries({ queryKey: ['saved', userId] })
      queryClient.invalidateQueries({ queryKey: ['saved'] })
      
      // Explicit refetch to ensure UI updates immediately
      await queryClient.refetchQueries({ queryKey: ['saved', userId] })
    },
    onError: (error: any) => {
      console.error('Unsave error:', error)
      toast.error(error.response?.data?.message || 'Kaldırılırken bir hata oluştu')
    },
  })

  const handleUnsave = (e: React.MouseEvent, postId: string, type: 'post' | 'artwork') => {
    e.stopPropagation()
    unsaveMutation.mutate({ postId, type })
  }

  const handleItemClick = (item: any) => {
    if (item.type === 'artwork') {
      router.push(`/profile/${item.user?.username || 'me'}?artwork=${item.id}`)
    } else {
      router.push(`/posts/${item.id}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
      </div>
    )
  }

  if (!savedItems || savedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Bookmark className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Henüz kaydedilmiş içerik yok
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
          Beğendiğin eser ve gönderileri kaydederek daha sonra buradan kolayca erişebilirsin.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {savedItems.map((item: any) => {
        const imageUrl = item.media?.[0]?.url 
          ? resolveImageUrl(item.media[0].url)
          : null

        return (
          <div
            key={item.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 group cursor-pointer"
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => handleItemClick(item)}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={item.title || item.caption || (item.type === 'artwork' ? 'Eser' : 'Gönderi')}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-gray-400" />
              </div>
            )}

            {/* Hover Overlay */}
            {hoveredItem === item.id && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-4">
                <div className="flex items-center gap-2 text-white">
                  <Heart className="w-5 h-5" fill={item.isLiked ? 'currentColor' : 'none'} />
                  <span className="text-sm font-medium">{item._count?.likes || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{item._count?.comments || 0}</span>
                </div>
                <button
                  onClick={(e) => handleUnsave(e, item.id, item.type)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                  title="Kaydedilenlerden kaldır"
                >
                  <Bookmark className="w-5 h-5 text-white" fill="currentColor" />
                </button>
              </div>
            )}

            {/* Artist Info Overlay (Bottom) */}
            {item.user && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-sm font-medium truncate">
                  {item.user.fullName || item.user.username}
                </p>
                {(item.title || item.caption) && (
                  <p className="text-white/80 text-xs truncate mt-1">
                    {item.title || item.caption}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

