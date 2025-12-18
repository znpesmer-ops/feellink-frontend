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
    items?: Array<{
      id: string
      post: {
        id: string
        imageUrl: string | null
        caption: string | null
        title: string | null
      }
    }>
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

  // Modal açıldığında initial state'i set et - ÖNCE highlight prop, SONRA currentHighlight query
  useEffect(() => {
    let existingPostIds: string[] = []
    
    // ÖNCE highlight prop'undan direkt al (modal açıldığında hemen kullanılabilir)
    if (highlight?.items && highlight.items.length > 0) {
      existingPostIds = highlight.items.map((item: any) => item.post?.id).filter(Boolean)
      console.log('🔍 AddArtworkToHighlightModal - highlight prop items:', existingPostIds)
    } 
    // SONRA query'den gelen veriyi kullan (daha güncel olabilir)
    else if (currentHighlight?.items && currentHighlight.items.length > 0) {
      existingPostIds = currentHighlight.items.map((item: any) => item.post?.id).filter(Boolean)
      console.log('🔍 AddArtworkToHighlightModal - currentHighlight items:', existingPostIds)
    }
    
    if (existingPostIds.length > 0) {
      setInitialWorkIds(existingPostIds)
      setSelectedWorkIds(existingPostIds) // Başlangıçta mevcut eserler seçili
    } else {
      console.log('⚠️ AddArtworkToHighlightModal - Hiç eser bulunamadı, highlight:', highlight, 'currentHighlight:', currentHighlight)
    }
  }, [highlight, currentHighlight])

  // TÜM eserleri göster (ekli olmayanlar + ekli olanlar)
  const allArtworks = posts ?? []

  // Toggle logic: Ekle/Çıkar - Artık zaten ekli olanlar da çıkarılabilir
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

      // 🔥 KRİTİK: Query'yi refetch et ama await etme (background'da çalışır)
      // invalidateQueries yerine refetchQueries kullan - daha güvenli, placeholderData ile UI kaybolmaz
      // userId varsa query key'e ekle (daha stabil cache)
      const queryKey = userId ? ['highlights', userId, username] : ['highlights', username]
      queryClient.refetchQueries({ queryKey }).catch(() => {
        // Refetch hatası olsa bile UI kaybolmasın
      })
      
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
      // 🔥 KRİTİK: Modal kapanınca hiçbir state reset yapma - highlights query'si kendi güncellenecek
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
          <div className="max-h-[400px] overflow-y-auto pr-1 custom-scrollbar mb-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
              {allArtworks.map((artwork: any, index: number) => {
                const isSelected = selectedWorkIds.includes(artwork.id)
                const wasInitiallyAdded = initialWorkIds.includes(artwork.id)
                const imageUrl = artwork.media?.[0]?.url || artwork.imageUrl
                
                // Güvenli başlık çıkarma - tüm olası field'ları kontrol et
                let artworkTitle = ''
                if (artwork?.title && typeof artwork.title === 'string' && artwork.title.trim().length > 0) {
                  artworkTitle = artwork.title.trim()
                } else if (artwork?.caption && typeof artwork.caption === 'string' && artwork.caption.trim().length > 0) {
                  artworkTitle = artwork.caption.trim()
                } else if (artwork?.name && typeof artwork.name === 'string' && artwork.name.trim().length > 0) {
                  artworkTitle = artwork.name.trim()
                } else if (artwork?.artworkTitle && typeof artwork.artworkTitle === 'string' && artwork.artworkTitle.trim().length > 0) {
                  artworkTitle = artwork.artworkTitle.trim()
                }
                
                // Fallback sadece gerçekten boşsa
                if (!artworkTitle || artworkTitle.length === 0) {
                  artworkTitle = 'İsimsiz Eser'
                }
                
                // Artık zaten ekli olanlar da tıklanabilir (çıkarılabilir)
                const isDisabled = false

                // Index bazlı ritmik renk ataması (turuncu → mavi → beyaz) - Normal çerçeve
                const colorClass = index % 3 === 0 
                  ? 'artwork-card--orange' 
                  : index % 3 === 1 
                  ? 'artwork-card--blue' 
                  : 'artwork-card--white'

                // Index bazlı hover çerçeve rengi (döngüsel)
                const hoverColorClass = index % 3 === 0 
                  ? 'hover-outline-orange' 
                  : index % 3 === 1 
                  ? 'hover-outline-blue' 
                  : 'hover-outline-white'

                return (
                  <button
                    key={artwork.id}
                    type="button"
                    onClick={() => {
                      toggleWork(artwork.id)
                    }}
                    className={cn(
                      'artwork-card relative aspect-[3/4] rounded-xl overflow-hidden border transition-all group',
                      // Dark mode uyumlu arka plan
                      'bg-[#0f172a] dark:bg-[#0f172a]',
                      // Index bazlı ritmik renk ataması (normal çerçeve)
                      colorClass,
                      // Index bazlı hover çerçeve rengi (döngüsel)
                      hoverColorClass,
                      // Cursor ve scale - Artık zaten ekli olanlar da tıklanabilir
                      wasInitiallyAdded && isSelected
                        ? 'cursor-pointer hover:scale-[1.02] hover:bg-[#111827]' // Zaten ekli ama seçili (çıkarılabilir)
                        : 'cursor-pointer hover:scale-[1.02] hover:bg-[#111827]', // Normal hover efekti
                      // Border renkleri - Dark mode uyumlu
                      isSelected
                        ? 'border-brand-orange ring-2 ring-brand-orange/50'
                        : 'border-white/6 dark:border-white/6 hover:border-white/10 dark:hover:border-white/10'
                    )}
                  >
                  {imageUrl ? (
                    <>
                      <img
                        src={resolveImageUrl(imageUrl)}
                        alt={artworkTitle}
                        className={cn(
                          'w-full h-full object-cover transition-all',
                          wasInitiallyAdded && isSelected ? 'opacity-75' : ''
                        )}
                        style={wasInitiallyAdded && isSelected ? {
                          filter: 'blur(2px) grayscale(40%)',
                          WebkitFilter: 'blur(2px) grayscale(40%)'
                        } : {}}
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                        }}
                      />
                      {/* Çok hafif overlay - Sadece zaten temada olan VE hala seçili olan eserler için */}
                      {wasInitiallyAdded && isSelected && (
                        <div className="absolute inset-0 bg-black/20 z-10" />
                      )}
                    </>
                  ) : (
                    <div className={cn(
                      'w-full h-full bg-[#1e293b] dark:bg-[#1e293b] flex items-center justify-center',
                      wasInitiallyAdded && isSelected ? 'opacity-75' : ''
                    )}>
                      <span className="text-white/60 dark:text-white/60 text-xs">Eser</span>
                      {wasInitiallyAdded && isSelected && (
                        <div className="absolute inset-0 bg-black/20 z-10" />
                      )}
                    </div>
                  )}

                  {/* Instagram tarzı: ZATEN TEMADA → SABİT YEŞİL TİK (sağ üst) - Sadece hala seçiliyse */}
                  {wasInitiallyAdded && isSelected && (
                    <>
                      <div className="absolute top-2 right-2 z-40 pointer-events-none">
                        <div className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#22c55e] shadow-xl border-2 border-white">
                          <span className="text-black text-[16px] font-bold">✓</span>
                        </div>
                      </div>
                      {/* "Ekli" Badge - Ortada - En yüksek z-index - Arka plan yok */}
                      <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                        <span className="text-white text-sm font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Ekli</span>
                      </div>
                    </>
                  )}

                  {/* Instagram tarzı: SEÇİLDİ → TURUNCU TİK (sağ üst) - Sadece yeni eklenenler için */}
                  {!wasInitiallyAdded && isSelected && (
                    <div className="absolute top-2 right-2 z-20 pointer-events-none">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange shadow-lg">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    </div>
                  )}

                  {/* Hover Overlay - Tüm eserlerde - Blur'dan etkilenmemesi için yüksek z-index */}
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl flex items-end pointer-events-none z-20'
                    )}
                  >
                    <div className="p-2 w-full">
                      <p className="text-white/90 dark:text-white/90 text-xs font-medium line-clamp-1 leading-tight">
                        {artworkTitle}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
            </div>
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


