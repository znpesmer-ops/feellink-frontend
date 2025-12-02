'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import toast from 'react-hot-toast'

interface AddArtworkToHighlightModalProps {
  highlight: {
    id: string
    title: string
  }
  username: string
  userId?: string
  onClose: () => void
}

export function AddArtworkToHighlightModal({
  highlight,
  username,
  userId,
  onClose,
}: AddArtworkToHighlightModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const queryClient = useQueryClient()

  // Kullanıcının SADECE ESERLERİNİ çek (type === 'artwork')
  const { data: posts, isLoading: isLoadingArtworks } = useQuery({
    queryKey: ['profile-artworks', userId || username],
    queryFn: async () => {
      const endpoint = userId ? `/posts/user/${userId}` : `/posts/user/${username}`
      const response = await api.get(endpoint)
      const allPosts = response.data || []
      
      // SADECE ESERLERİ filtrele (type === 'artwork')
      const artworks = allPosts.filter((p: any) => p.type === 'artwork')
      
      return artworks
    },
    enabled: !!(userId || username),
  })

  // Mevcut highlight'taki eserleri al (duplicate önleme için)
  const { data: currentHighlight } = useQuery({
    queryKey: ['highlights', username],
    queryFn: async () => {
      const response = await api.get(`/highlights/${username}`)
      const highlights = response.data || []
      return highlights.find((h: any) => h.id === highlight.id)
    },
    enabled: !!username,
  })

  const existingPostIds = currentHighlight?.items?.map((item: any) => item.post?.id) || []

  // Sadece mevcut highlight'ta olmayan eserleri göster
  const selectableArtworks = (posts ?? []).filter(
    (artwork: any) => !existingPostIds.includes(artwork.id)
  )

  const toggleSelect = (postId: string) => {
    setSelectedIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    )
  }

  const addMutation = useMutation({
    mutationFn: async (postIds: string[]) => {
      return (await api.post(`/highlights/${highlight.id}/add-posts`, { postIds })).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights', username] })
      toast.success('Eserler temaya eklendi')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Eserler eklenirken bir hata oluştu')
    },
  })

  const handleAdd = () => {
    if (selectedIds.length === 0) {
      toast.error('En az bir eser seçmelisiniz')
      return
    }
    addMutation.mutate(selectedIds)
  }

  if (isLoadingArtworks) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose}>
        <div
          className="bg-[#0d0d10] dark:bg-gray-900 p-6 rounded-xl w-[400px] shadow-xl flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#0d0d10] dark:bg-gray-900 p-6 rounded-xl w-[400px] max-h-[80vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-xl font-semibold">Eser Ekle</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 dark:text-neutral-500 dark:hover:text-neutral-300"
          >
            ✕
          </button>
        </div>

        <div className="text-sm text-neutral-400 dark:text-neutral-500 mb-4">
          "{highlight.title}" temasına eklenecek eserleri seçin
        </div>

        {selectableArtworks.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 dark:text-neutral-500">
            Eklenebilecek yeni eser bulunmuyor. Tüm eserler zaten bu temada.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar mb-4">
            {selectableArtworks.map((artwork: any) => {
              const selected = selectedIds.includes(artwork.id)
              const imageUrl = artwork.media?.[0]?.url || artwork.imageUrl

              return (
                <button
                  key={artwork.id}
                  type="button"
                  onClick={() => toggleSelect(artwork.id)}
                  className={`relative aspect-square rounded-xl overflow-hidden border transition-all ${
                    selected
                      ? 'border-brand-orange ring-2 ring-brand-orange/50'
                      : 'border-neutral-800 dark:border-neutral-700 hover:border-neutral-600 dark:hover:border-neutral-600'
                  }`}
                >
                  {imageUrl ? (
                    <img
                      src={resolveImageUrl(imageUrl)}
                      alt={artwork.caption ?? ''}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-800 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-neutral-500 text-xs">Eser</span>
                    </div>
                  )}

                  {selected && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-brand-orange flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-neutral-800 dark:border-neutral-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-neutral-800 dark:bg-gray-800 hover:bg-neutral-700 dark:hover:bg-gray-700 text-gray-100 dark:text-gray-200 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleAdd}
            disabled={selectedIds.length === 0 || addMutation.isPending}
            className="px-4 py-2 rounded-lg text-sm bg-brand-orange text-black font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#e67a00] transition-colors"
          >
            {addMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </div>
      </div>
    </div>
  )
}

