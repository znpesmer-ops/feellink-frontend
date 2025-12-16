'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import toast from 'react-hot-toast'
// Simple cn utility for className merging
const cn = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(' ')
}

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
  // STATE MODELİ: İki ayrı state (initial ve selected)
  const [initialWorkIds, setInitialWorkIds] = useState<string[]>([]) // Backend'den gelen mevcut eserler
  const [selectedWorkIds, setSelectedWorkIds] = useState<string[]>([]) // Kullanıcının şu anki seçimi
  const queryClient = useQueryClient()

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

  // Mevcut highlight'taki eserleri al
  const { data: currentHighlight } = useQuery({
    queryKey: ['highlights', username],
    queryFn: async () => {
      const response = await api.get(`/highlights/${username}`)
      const highlights = response.data || []
      return highlights.find((h: any) => h.id === highlight.id)
    },
    enabled: !!username,
  })

  // Modal açıldığında initial state'i set et
  useEffect(() => {
    if (currentHighlight?.items) {
      const existingPostIds = currentHighlight.items.map((item: any) => item.post?.id).filter(Boolean)
      setInitialWorkIds(existingPostIds)
      setSelectedWorkIds(existingPostIds) // Başlangıçta mevcut eserler seçili
    }
  }, [currentHighlight])

  // TÜM eserleri göster (ekli olmayanlar + ekli olanlar)
  const allArtworks = posts ?? []

  // Toggle logic: Ekle/Çıkar
  const toggleWork = (workId: string) => {
    setSelectedWorkIds((prev) =>
      prev.includes(workId) ? prev.filter((id) => id !== workId) : [...prev, workId]
    )
  }

  // DELTA LOGIC: Eklenecekler ve kaldırılacaklar
  const worksToAdd = selectedWorkIds.filter((id) => !initialWorkIds.includes(id))
  const worksToRemove = initialWorkIds.filter((id) => !selectedWorkIds.includes(id))

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async (postIds: string[]) => {
      if (postIds.length === 0) return null
      return (await api.post(`/highlights/${highlight.id}/add-posts`, { postIds })).data
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Eserler eklenirken bir hata oluştu')
    },
  })

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: async (postIds: string[]) => {
      if (postIds.length === 0) return null
      return (await api.delete(`/highlights/${highlight.id}/remove-posts`, { data: { postIds } })).data
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Eserler kaldırılırken bir hata oluştu')
    },
  })

  // Combined save handler
  const handleSave = async () => {
    if (selectedWorkIds.length === 0) {
      toast.error('En az bir eser seçmelisiniz')
      return
    }

    // Hiç değişiklik yoksa kaydetme
    if (worksToAdd.length === 0 && worksToRemove.length === 0) {
      onClose()
      return
    }

    try {
      // Paralel olarak ekle ve kaldır
      await Promise.all([
        worksToAdd.length > 0 ? addMutation.mutateAsync(worksToAdd) : Promise.resolve(),
        worksToRemove.length > 0 ? removeMutation.mutateAsync(worksToRemove) : Promise.resolve(),
      ])

      // Refetch highlights
      await queryClient.refetchQueries({ queryKey: ['highlights', username] })
      
      const addCount = worksToAdd.length
      const removeCount = worksToRemove.length
      let message = ''
      if (addCount > 0 && removeCount > 0) {
        message = `${addCount} eser eklendi, ${removeCount} eser kaldırıldı`
      } else if (addCount > 0) {
        message = `${addCount} eser eklendi`
      } else if (removeCount > 0) {
        message = `${removeCount} eser kaldırıldı`
      }
      toast.success(message || 'Güncelleme başarılı')
      onClose()
    } catch (error) {
      // Error handling zaten mutation'larda var
    }
  }

  const isSaving = addMutation.isPending || removeMutation.isPending
  const hasChanges = worksToAdd.length > 0 || worksToRemove.length > 0

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
          "{highlight.title}" temasına eklenecek/kaldırılacak kendi eserlerinizi seçin
          <br />
          <span className="text-xs text-neutral-500 dark:text-neutral-600">
            Not: Sadece kendi yüklediğiniz eserler burada görünür. Seçili eserler temaya ekli.
          </span>
        </div>

        {allArtworks.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 dark:text-neutral-500">
            Henüz eser paylaşmadınız.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar mb-4">
            {allArtworks.map((artwork: any) => {
              const isSelected = selectedWorkIds.includes(artwork.id)
              const wasInitiallyAdded = initialWorkIds.includes(artwork.id)
              const imageUrl = artwork.media?.[0]?.url || artwork.imageUrl
              const artworkTitle = artwork.caption || artwork.title || 'İsimsiz Eser'

              return (
                <button
                  key={artwork.id}
                  type="button"
                  onClick={() => toggleWork(artwork.id)}
                  className={cn(
                    'relative aspect-square rounded-xl overflow-hidden border transition-all group cursor-pointer',
                    isSelected
                      ? 'border-brand-orange ring-2 ring-brand-orange/50'
                      : wasInitiallyAdded
                      ? 'border-brand-orange/70 ring-2 ring-brand-orange/30' // Temada ekli olanlar için turuncu border
                      : 'border-neutral-800 dark:border-neutral-700 hover:border-neutral-600 dark:hover:border-neutral-600'
                  )}
                >
                  {imageUrl ? (
                    <img
                      src={resolveImageUrl(imageUrl)}
                      alt={artworkTitle}
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

                  {/* Temada ekli olanlar için koyu overlay */}
                  {wasInitiallyAdded && (
                    <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />
                  )}

                  {/* "Ekli" rozeti - sadece temada ekli olanlarda */}
                  {wasInitiallyAdded && (
                    <div className="absolute top-2 right-2 z-20 pointer-events-none">
                      <span className="text-[10px] bg-brand-orange text-black px-2 py-0.5 rounded-full font-semibold shadow-lg">
                        ✓ Ekli
                      </span>
                    </div>
                  )}

                  {/* Hover Overlay - SADECE eser adı (kullanıcı adı YOK) */}
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl flex items-end pointer-events-none z-20'
                    )}
                  >
                    <div className="p-2 w-full">
                      <p className="text-white text-sm font-medium line-clamp-1 leading-tight">
                        {artworkTitle}
                      </p>
                    </div>
                  </div>

                  {/* Seçili eser overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none z-30">
                      <div className="w-6 h-6 rounded-full bg-brand-orange flex items-center justify-center shadow-lg">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Footer bilgi */}
        <div className="text-xs text-neutral-500 dark:text-neutral-600 mb-2 text-center">
          Seçili: {selectedWorkIds.length} eser
          {hasChanges && (
            <span className="ml-2 text-brand-orange">
              ({worksToAdd.length > 0 && `+${worksToAdd.length}`} {worksToRemove.length > 0 && `-${worksToRemove.length}`})
            </span>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-neutral-800 dark:border-neutral-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-neutral-800 dark:bg-gray-800 hover:bg-neutral-700 dark:hover:bg-gray-700 text-gray-100 dark:text-gray-200 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={selectedWorkIds.length === 0 || isSaving || !hasChanges}
            className="px-4 py-2 rounded-lg text-sm bg-brand-orange text-black font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#e67a00] transition-colors"
          >
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}


