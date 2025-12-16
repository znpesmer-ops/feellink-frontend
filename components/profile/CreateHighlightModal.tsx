'use client'

import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

interface CreateHighlightModalProps {
  username: string
  userId?: string // Kullanıcı ID'si (eserleri çekmek için)
  onClose: () => void
}

export function CreateHighlightModal({ username, userId, onClose }: CreateHighlightModalProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [coverId, setCoverId] = useState<string | null>(null)

  // ÖNE ÇIKAN TEMALAR: Sadece kullanıcının KENDİ eserlerini göster
  // ❌ Genel arama YOK
  // ❌ Başkalarının eserleri YOK
  // ❌ Koleksiyon mantığı YOK
  // ✅ Sadece kullanıcının kendi yüklediği eserler (type === 'artwork')
  const { data: posts, isLoading: isLoadingArtworks } = useQuery({
    queryKey: ['profile-artworks', userId || username],
    queryFn: async () => {
      // Sadece kullanıcının kendi post'larını çek
      const endpoint = userId ? `/posts/user/${userId}` : `/posts/user/${username}`
      const response = await api.get(endpoint)
      const allPosts = response.data || []
      
      // SADECE ESERLERİ filtrele (type === 'artwork')
      // Backend zaten userId kontrolü yapıyor, burada sadece type filtresi
      const artworks = allPosts.filter((p: any) => p.type === 'artwork')
      
      return artworks
    },
    enabled: !!(userId || username),
  })

  // Sadece eserler (artworks) - zaten filtrelenmiş
  const selectableArtworks = posts ?? []

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || selectedIds.length === 0) {
        throw new Error('Tema adı ve en az bir eser seçmelisiniz')
      }
      return (
        await api.post('/highlights', {
          title: title.trim(),
          coverPostId: coverId || selectedIds[0], // Kapak eser ID'si
          postIds: selectedIds, // Seçilen eser ID'leri
        })
      ).data
    },
    onSuccess: async () => {
      // Çözüm A: Optimistic update yapma, sadece refetch et
      await queryClient.refetchQueries({ queryKey: ['highlights', username] })
      onClose()
    },
  })

  const toggleSelect = (postId: string) => {
    setSelectedIds((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId]
    )
    // Eğer seçilen post kapak ise ve seçimden çıkarılıyorsa, kapak'ı da temizle
    if (coverId === postId && selectedIds.includes(postId)) {
      setCoverId(null)
    }
  }

  const handleSetCover = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setCoverId(postId)
    if (!selectedIds.includes(postId)) {
      setSelectedIds((prev) => [...prev, postId])
    }
  }

  if (isLoadingArtworks) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60">
        <div className="w-full max-w-3xl max-h-[80vh] bg-[#111] dark:bg-gray-900 rounded-2xl p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[80vh] bg-[#111] dark:bg-gray-900 rounded-2xl p-6 flex flex-col gap-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100 dark:text-gray-100">Yeni Tema Oluştur</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 dark:text-neutral-500 dark:hover:text-neutral-300"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          <label className="text-sm text-neutral-300 dark:text-neutral-400">
            Tema Adı
            <input
              className="mt-1 w-full rounded-lg bg-[#181818] dark:bg-gray-800 border border-neutral-700 dark:border-neutral-600 px-3 py-2 text-sm text-gray-100 dark:text-gray-200 focus:outline-none focus:border-orange-500"
              placeholder="Örn: Doğa, Manzara, Kuşlar Serisi..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <div className="text-sm text-neutral-400 dark:text-neutral-500">
            Kendi eserlerinden seç (en az 1). Birine sağ üstten tıklayarak kapak olarak işaretleyebilirsin.
            <br />
            <span className="text-xs text-neutral-500 dark:text-neutral-600">
              Not: Sadece kendi yüklediğin eserler burada görünür.
            </span>
          </div>

          {!selectableArtworks || selectableArtworks.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 dark:text-neutral-500">
              Henüz eser paylaşmadınız. Önce bir eser paylaşmalısınız.
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {selectableArtworks.map((artwork: any) => {
                const selected = selectedIds.includes(artwork.id)
                const isCover = coverId === artwork.id
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
                          (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
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

                    <button
                      type="button"
                      onClick={(e) => handleSetCover(artwork.id, e)}
                      className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                        isCover
                          ? 'bg-brand-orange text-black'
                          : 'bg-black/60 text-neutral-100 hover:bg-black/80'
                      }`}
                    >
                      {isCover ? 'Kapak' : 'Kapak Yap'}
                    </button>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800 dark:border-neutral-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-neutral-800 dark:bg-gray-800 hover:bg-neutral-700 dark:hover:bg-gray-700 text-gray-100 dark:text-gray-200 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || selectedIds.length === 0 || createMutation.isPending}
            className="px-4 py-2 rounded-lg text-sm bg-brand-orange text-black font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#e67a00] transition-colors"
          >
            {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>

        {createMutation.isError && (
          <div className="text-sm text-red-400">
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : 'Bir hata oluştu'}
          </div>
        )}
      </div>
    </div>
  )
}

