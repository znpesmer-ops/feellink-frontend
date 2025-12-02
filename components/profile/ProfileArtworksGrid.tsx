'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { Image as ImageIcon, QrCode, Download, Loader2, MoreVertical, Trash2, Heart, MessageCircle } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/store'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface ProfileArtworksGridProps {
  username: string
  artworks: any[]
  userId?: string // Kullanıcı ID'si (sahip kontrolü için)
}

export function ProfileArtworksGrid({ artworks, username, userId }: ProfileArtworksGridProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  // Sahip kontrolü: user store'dan veya userId prop'undan
  const isOwner = user?.username === username || (userId && user?.id === userId)
  const [downloadingQr, setDownloadingQr] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const handleDownloadQr = async (e: React.MouseEvent, artworkId: string) => {
    e.stopPropagation() // Card click'i engelle

    try {
      setDownloadingQr(artworkId)
      
      // PDF'i indir - Yeni QR Label endpoint'i
      const response = await api.get(`/posts/${artworkId}/qr-label`, {
        responseType: 'blob',
      })

      // Blob'dan URL oluştur ve indir
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Feellink_Eser_Etiketi_${artworkId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success('🎟️ QR kod etiketi başarıyla indirildi!')
    } catch (error: any) {
      console.error('QR PDF indirme hatası:', error)
      toast.error(error.response?.data?.message || 'QR kod etiketi indirilemedi. Lütfen tekrar deneyin.')
    } finally {
      setDownloadingQr(null)
    }
  }

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (artworkId: string) => {
      await api.delete(`/posts/${artworkId}`)
    },
    onSuccess: (_, artworkId) => {
      toast.success('Eser başarıyla silindi')
      queryClient.invalidateQueries({ queryKey: ['user-artworks', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-artworks', username] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      
      setMenuOpen(null)
      setConfirmDelete(null)
    },
    onError: (error: any) => {
      console.error('Delete error:', error)
      toast.error(error.response?.data?.message || 'Eser silinirken bir hata oluştu')
      setConfirmDelete(null)
    },
  })

  const handleDeleteClick = (e: React.MouseEvent, artworkId: string) => {
    e.stopPropagation()
    setConfirmDelete(artworkId)
    setMenuOpen(null)
  }

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDelete) {
      deleteMutation.mutate(confirmDelete)
    }
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete(null)
  }

  // Close menu when clicking outside - Only check clicks outside the menu container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen) {
        const menuElement = menuRefs.current[menuOpen]
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setMenuOpen(null)
        }
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

  if (!artworks || artworks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Henüz eklenmiş eser bulunmuyor.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {artworks.map((artwork) => (
        <div
          key={artwork.id}
          className="aspect-square relative cursor-pointer group overflow-visible rounded-xl transition-all duration-300 hover:ring-2 hover:ring-[#ff7b00] hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-gray-950"
          onClick={() => router.push(`/posts/${artwork.id}`)}
        >
          {/* İçerik container - overflow-hidden burada, görselleri sınırlıyor */}
          <div className="w-full h-full rounded-xl overflow-hidden">
            {artwork.media && artwork.media.length > 0 ? (
              <>
                {artwork.media[0].type === 'video' ? (
                  <video
                    src={resolveImageUrl(artwork.media[0].url)}
                    className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                    muted
                  />
                ) : (
                  <img
                    src={resolveImageUrl(artwork.media[0].url)}
                    alt={artwork.caption || 'Eser'}
                    className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                    }}
                  />
                )}
              </>
            ) : (
              <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-xl">
                <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
            )}
          </div>

          {/* Eser ikon rozeti - Yüksek z-index ile görünür */}
          {artwork.media && artwork.media.length > 0 && (
            <div className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-sm text-white p-1.5 shadow-lg z-[115]">
              <ImageIcon size={14} strokeWidth={2.5} />
            </div>
          )}
              
          {/* QR Kod Butonu ve Silme Menüsü - Sadece eser sahibi görür - Yüksek z-index */}
          {isOwner && (
            <>
              <button
                onClick={(e) => handleDownloadQr(e, artwork.id)}
                disabled={downloadingQr === artwork.id}
                className="absolute top-2 left-2 rounded-full bg-[#ff7b00] hover:bg-[#e36f00] text-white p-1.5 shadow-lg z-[115] transition-colors disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto"
                title="QR Kod Etiketi İndir"
              >
                {downloadingQr === artwork.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <QrCode size={14} strokeWidth={2.5} />
                )}
              </button>
              
              {/* Menü butonu - Silme seçeneği - En yüksek z-index (tema menüsünden üstte) */}
              <div 
                ref={(el) => {
                  menuRefs.current[artwork.id] = el
                }}
                className="absolute bottom-2 right-2 z-[120]"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(menuOpen === artwork.id ? null : artwork.id)
                  }}
                  className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors pointer-events-auto"
                  title="Menü"
                >
                  <MoreVertical size={14} strokeWidth={2.5} />
                </button>
                
                {/* Açılır menü - En yüksek z-index ile tema menüsünden üstte */}
                {menuOpen === artwork.id && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-10 right-0 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[120px] z-[120]"
                  >
                    <button
                      onClick={(e) => handleDeleteClick(e, artwork.id)}
                      disabled={deleteMutation.isPending}
                      className="w-full px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} />
                      Sil
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Modern Hover Overlay - Glass Effect - Düşük z-index ile menü butonlarının altında */}
          {artwork.media && artwork.media.length > 0 && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center rounded-xl z-[5] pointer-events-none">
              <div className="flex items-center gap-8">
                {/* Likes */}
                <div className="flex items-center gap-2 text-white text-lg font-semibold">
                  <Heart className="w-6 h-6" fill="currentColor" />
                  <span>{artwork._count?.likes || artwork.likeCount || 0}</span>
                </div>
                
                {/* Comments */}
                <div className="flex items-center gap-2 text-white text-lg font-semibold">
                  <MessageCircle className="w-6 h-6" />
                  <span>{artwork._count?.comments || artwork.commentCount || 0}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* 🎨 Renk Paleti Gösterimi */}
          {artwork.colorPalette && Array.isArray(artwork.colorPalette) && artwork.colorPalette.length > 0 && (
            <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[50]">
              {artwork.colorPalette.slice(0, 5).map((hex: string, idx: number) => (
                <div
                  key={idx}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    backgroundColor: hex,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  title={hex}
                />
              ))}
            </div>
          )}
        </div>
      ))}
      
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
              Eseri Sil
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Bu eseri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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







