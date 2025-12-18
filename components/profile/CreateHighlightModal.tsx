'use client'

import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import toast from 'react-hot-toast'

interface CreateHighlightModalProps {
  username: string
  userId?: string // Kullanıcı ID'si (eserleri çekmek için)
  onClose: () => void
}

export function CreateHighlightModal({ username, userId, onClose }: CreateHighlightModalProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [selectedCoverArtwork, setSelectedCoverArtwork] = useState<string | null>(null)
  const [selectedArtworks, setSelectedArtworks] = useState<string[]>([]) // Tema içeriği için çoklu seçim

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
  
  // 🔥 DEBUG: Eserlerin media yapısını kontrol et
  if (selectableArtworks.length > 0 && process.env.NODE_ENV === 'development') {
    console.log('🔍 Selectable artworks sample:', {
      firstArtwork: selectableArtworks[0],
      hasMedia: !!selectableArtworks[0]?.media,
      mediaLength: selectableArtworks[0]?.media?.length || 0,
      mediaFirst: selectableArtworks[0]?.media?.[0],
      imageUrl: selectableArtworks[0]?.imageUrl,
    })
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      // 🔥 KRİTİK: Tüm validasyonlar burada (Kullanıcının istediği gibi)
      if (!title.trim()) {
        toast.error('Tema adı girmelisiniz')
        throw new Error('Tema adı girmelisiniz')
      }
      if (!selectedCoverArtwork) {
        toast.error('Kapak eseri seçmelisiniz')
        throw new Error('Kapak eseri seçmelisiniz')
      }
      if (!selectedArtworks || selectedArtworks.length === 0) {
        toast.error('Kapak ve en az 1 eser seçmelisiniz')
        throw new Error('Tema içeriği için en az bir eser seçmelisiniz')
      }
      
      // 🔥 KRİTİK: Kapak eseri tema içeriğine de eklenmeli (eğer yoksa)
      // Ama önce selectedArtworks'in dolu olduğundan emin ol
      const allPostIds = selectedCoverArtwork && !selectedArtworks.includes(selectedCoverArtwork)
        ? [selectedCoverArtwork, ...selectedArtworks]
        : selectedArtworks.length > 0
        ? selectedArtworks
        : selectedCoverArtwork
        ? [selectedCoverArtwork]
        : []
      
      // 🔥 DEBUG: Backend'e gönderilen payload'u logla
      console.log('📤 Sending to backend:', {
        title: title.trim(),
        coverPostId: selectedCoverArtwork,
        postIds: allPostIds,
        postIdsCount: allPostIds.length,
        selectedArtworksCount: selectedArtworks.length,
      })
      
      try {
        const response = await api.post('/highlights', {
          title: title.trim(),
          coverPostId: selectedCoverArtwork, // Kapak eser ID'si (sadece 1 eser)
          postIds: allPostIds, // Kapak + tema içeriği eserleri
        })
        
        const createdTheme = response.data
        
        // 🔥 KRİTİK: Response'u kontrol et - ID yoksa hata fırlat
        if (!createdTheme || !createdTheme.id) {
          console.error('❌ Tema oluşturuldu ama ID yok:', createdTheme)
          throw new Error('Tema oluşturulamadı. Lütfen tekrar deneyin.')
        }
        
        // Response'u logla (debug için)
        console.log('🟢 Tema oluşturuldu:', {
          id: createdTheme.id,
          title: createdTheme.title,
          userId: createdTheme.userId,
          coverPostId: createdTheme.coverPostId
        })
        
        return createdTheme
      } catch (error: any) {
        // Hata detaylarını logla
        console.error('❌ Tema oluşturma hatası:', {
          status: error?.response?.status,
          message: error?.response?.data?.message || error?.message,
          data: error?.response?.data,
          error: error,
          stack: error?.stack,
        })
        
        // Backend'den gelen hata mesajını göster
        const errorMessage = error?.response?.data?.message || error?.message || 'Tema oluşturulurken bir hata oluştu'
        toast.error(errorMessage)
        
        throw error
      }
    },
    onSuccess: async (data) => {
      // 🔥 KRİTİK: Response'u kontrol et
      if (!data || !data.id) {
        toast.error('Tema oluşturulamadı. Lütfen tekrar deneyin.')
        return
      }
      
      console.log('🟢 Tema oluşturuldu - Backend response:', JSON.stringify(data, null, 2))
      
      // 🔥 KRİTİK: Query key'leri ArtistHighlights ile TAM EŞLEŞTİR
      const exactQueryKey = userId ? ['highlights', userId, username] : ['highlights', username]
      console.log('🔑 Exact query key:', exactQueryKey)
      
      // 🔥 INSTAGRAM MANTIĞI: Backend'den dönen data'yı direkt kullan
      // Backend zaten doğru formatta dönüyor (getByUsername ile aynı)
      const newTheme = {
        ...data,
        coverPost: data.coverPost ? {
          ...data.coverPost,
          imageUrl: data.coverPost.imageUrl || data.coverPost.media?.[0]?.url || null
        } : null
      }
      
      console.log('📦 New theme:', newTheme)
      console.log('📦 CoverPost imageUrl:', newTheme.coverPost?.imageUrl)
      
      // Mevcut cache'i al
      const currentHighlights = queryClient.getQueryData(exactQueryKey) as any[] || []
      console.log('📦 Current highlights in cache:', currentHighlights.length)
      
      // Yeni temayı en başa ekle (Instagram mantığı)
      const exists = currentHighlights.some((h: any) => h.id === newTheme.id)
      const updatedHighlights = exists 
        ? currentHighlights.map((h: any) => h.id === newTheme.id ? newTheme : h)
        : [newTheme, ...currentHighlights]
      
      console.log('📦 Updated highlights count:', updatedHighlights.length)
      
      // 🔥 KRİTİK: Cache'e yaz (ANINDA GÖRÜNSÜN)
      queryClient.setQueryData(exactQueryKey, updatedHighlights)
      
      // Cache'i kontrol et
      const cachedAfterWrite = queryClient.getQueryData(exactQueryKey) as any[]
      console.log('✅ Cache\'e yazıldı. Cache\'deki highlight sayısı:', cachedAfterWrite?.length || 0)
      
      // 🔥 KRİTİK: Query'yi invalidate et ve refetch et (UI'ı zorla güncelle)
      queryClient.invalidateQueries({ queryKey: ['highlights'] })
      queryClient.invalidateQueries({ queryKey: exactQueryKey })
      
      // 🔥 KRİTİK: Query'yi refetch et (UI'ı zorla güncelle)
      await queryClient.refetchQueries({ 
        queryKey: exactQueryKey,
        type: 'active'
      })
      console.log('✅ Query refetched')
      
      // 🔥 KRİTİK: Bir kez daha cache'i kontrol et
      const finalCache = queryClient.getQueryData(exactQueryKey) as any[]
      console.log('✅ Final cache count:', finalCache?.length || 0)
      console.log('✅ Final cache:', finalCache)
      
      // Toast mesajı göster
      toast.success('Tema başarıyla oluşturuldu')
      
      // State'i temizle
      setTitle('')
      setSelectedCoverArtwork(null)
      setSelectedArtworks([])
      
      // Modal'ı kapat (kısa gecikme ile UI güncellemesi için)
      setTimeout(() => {
        handleClose()
      }, 100)
    },
    onError: (error: any) => {
      // Hata detaylarını logla
      console.error('❌ Mutation onError:', {
        status: error?.response?.status,
        message: error?.response?.data?.message || error?.message,
        data: error?.response?.data,
        error: error,
      })
      
      // Hata mesajını göster
      const errorMessage = error?.response?.data?.message || error?.message || 'Tema oluşturulurken bir hata oluştu'
      toast.error(errorMessage)
    },
  })

  // Kapak seçimi - sadece 1 eser seçilebilir (SADECE STATE DEĞİŞTİRİR, TEMA OLUŞTURMAZ)
  const handleSelectCover = (artworkId: string) => {
    setSelectedCoverArtwork(artworkId)
    // 🔥 KRİTİK: Kapak seçimi tema oluşturmaz, sadece state değiştirir
  }

  // Tema içeriği seçimi - çoklu seçim
  const toggleArtworkSelection = (artworkId: string) => {
    setSelectedArtworks((prev) =>
      prev.includes(artworkId)
        ? prev.filter((id) => id !== artworkId)
        : [...prev, artworkId]
    )
  }

  // Modal kapandığında state'i temizle
  const handleClose = () => {
    setTitle('')
    setSelectedCoverArtwork(null)
    setSelectedArtworks([])
    onClose()
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={handleClose}>
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
            <div className="mb-2">
              <strong>1. Kapak Eseri:</strong> Tema için kapak olarak görünecek eseri seç (sadece 1 eser).
            </div>
            <div className="mb-2">
              <strong>2. Tema İçeriği:</strong> Temaya eklenecek eserleri seç (çoklu seçim, en az 1 eser).
            </div>
            <span className="text-xs text-neutral-500 dark:text-neutral-600">
              Not: Sadece kendi yüklediğin eserler burada görünür.
            </span>
          </div>

          {!selectableArtworks || selectableArtworks.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 dark:text-neutral-500">
              Henüz eser paylaşmadınız. Önce bir eser paylaşmalısınız.
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
                {selectableArtworks.map((artwork: any) => {
                  const isCover = selectedCoverArtwork === artwork.id
                  const isInContent = selectedArtworks.includes(artwork.id)
                  
                  // 🔥 KRİTİK: Media URL'ini doğru şekilde al
                  // Backend'den gelen format: { media: [{ url: '...', type: 'image', order: 0 }] }
                  // Veya: { imageUrl: '...' } (eski format)
                  let imageUrl: string | null = null
                  
                  if (artwork.media && Array.isArray(artwork.media) && artwork.media.length > 0) {
                    // Media array'den ilk görseli al
                    imageUrl = artwork.media[0]?.url || null
                  } else if (artwork.imageUrl) {
                    // Eski format (imageUrl direkt property)
                    imageUrl = artwork.imageUrl
                  } else if (artwork.media?.[0]?.url) {
                    // Nested media (eğer varsa)
                    imageUrl = artwork.media[0].url
                  }
                  
                  // 🔥 DEBUG: Eğer imageUrl yoksa logla
                  if (!imageUrl && process.env.NODE_ENV === 'development') {
                    console.warn('⚠️ Artwork has no image URL:', {
                      artworkId: artwork.id,
                      hasMedia: !!artwork.media,
                      mediaLength: artwork.media?.length || 0,
                      media: artwork.media,
                      imageUrl: artwork.imageUrl,
                    })
                  }

                  // Eser başlığını veya açıklamasını al
                  const artworkTitle = artwork.title && typeof artwork.title === 'string' && artwork.title.trim().length > 0
                    ? artwork.title.trim()
                    : artwork.caption && typeof artwork.caption === 'string' && artwork.caption.trim().length > 0
                    ? artwork.caption.trim()
                    : null

                  return (
                    <div
                      key={artwork.id}
                      className={`relative flex flex-col rounded-xl overflow-hidden border transition-all ${
                        isCover
                          ? 'border-brand-orange ring-2 ring-brand-orange/50'
                          : isInContent
                          ? 'border-blue-500 ring-2 ring-blue-500/50'
                          : 'border-neutral-800 dark:border-neutral-700 hover:border-neutral-600 dark:hover:border-neutral-600'
                      }`}
                    >
                    {/* Görsel Container */}
                    <div className="relative aspect-[3/4] w-full">
                      {imageUrl ? (
                        <img
                          src={resolveImageUrl(imageUrl)}
                          alt={artworkTitle || 'Eser'}
                          className="w-full h-full object-cover"
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                            if (process.env.NODE_ENV === 'development') {
                              console.error('❌ Image load error for artwork:', artwork.id, imageUrl)
                            }
                            e.currentTarget.src = '/images/avatar-placeholder.png'
                          }}
                          onLoad={() => {
                            if (process.env.NODE_ENV === 'development') {
                              const resolvedUrl = resolveImageUrl(imageUrl)
                              console.log('✅ Image loaded successfully:', artwork.id, resolvedUrl)
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-800 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-neutral-500 text-xs">Görsel Yok</span>
                        </div>
                      )}

                      {/* Kapak seçimi badge */}
                      {isCover && (
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-medium bg-brand-orange text-black z-10">
                          Kapak
                        </div>
                      )}

                      {/* Tema içeriği seçimi badge */}
                      {isInContent && !isCover && (
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-medium bg-blue-500 text-white z-10">
                          Seçili
                        </div>
                      )}
                    </div>

                    {/* Eser Başlığı/Açıklaması - Alt kısımda göster */}
                    {artworkTitle && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2 pb-10 z-10">
                        <p className="text-xs text-white font-medium line-clamp-2 truncate" title={artworkTitle}>
                          {artworkTitle}
                        </p>
                      </div>
                    )}

                    {/* Action buttons - Her zaman altta, başlık varsa onun üstünde */}
                    <div className="absolute bottom-2 left-2 right-2 flex gap-2 z-20">
                      {/* Kapak Yap butonu */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectCover(artwork.id)
                        }}
                        className={`flex-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                          isCover
                            ? 'bg-brand-orange text-black'
                            : 'bg-black/60 text-neutral-100 hover:bg-black/80'
                        }`}
                      >
                        {isCover ? 'Kapak' : 'Kapak Yap'}
                      </button>

                      {/* Tema İçeriğine Ekle butonu */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleArtworkSelection(artwork.id)
                        }}
                        className={`flex-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                          isInContent
                            ? 'bg-blue-500 text-white'
                            : 'bg-black/60 text-neutral-100 hover:bg-black/80'
                        }`}
                      >
                        {isInContent ? 'Çıkar' : 'Ekle'}
                      </button>
                    </div>
                  </div>
                )
              })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800 dark:border-neutral-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm bg-neutral-800 dark:bg-gray-800 hover:bg-neutral-700 dark:hover:bg-gray-700 text-gray-100 dark:text-gray-200 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || !selectedCoverArtwork || selectedArtworks.length === 0 || createMutation.isPending}
            className="px-4 py-2 rounded-lg text-sm bg-brand-orange text-black font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#e67a00] transition-colors"
          >
            {createMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
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

