'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Search, Trash2, Image, Heart, MessageCircle, Calendar, Palette, User } from 'lucide-react'
import ConfirmModal from '@/components/common/ConfirmModal'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

interface Artwork {
  id: string
  title?: string
  caption?: string
  code?: string
  location?: string
  colorPalette?: string[]
  createdAt: string
  user: {
    id: string
    username: string
    avatar: string | null
    fullName?: string
  }
  media: Array<{
    id: string
    type: string
    url: string
    thumbnailUrl?: string
    order: number
  }>
  _count: {
    likes: number
    comments: number
  }
}

export default function AdminArtworksPage() {
  const { accessToken } = useAuthStore()
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  useEffect(() => {
    fetchArtworks()
  }, [page, searchQuery, userFilter])

  const fetchArtworks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', '20')
      if (searchQuery) {
        params.append('search', searchQuery)
      }
      if (userFilter) {
        params.append('userId', userFilter)
      }
      
      const response = await api.get(`/admin/artworks?${params.toString()}`)
      const artworksWithMedia = response.data.artworks.map((a: Artwork) => ({
        ...a,
        media: a.media || [],
      }))
      setArtworks(artworksWithMedia)
      setTotal(response.data.total)
    } catch (err) {
      console.error('Error fetching artworks:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (artworkId: string) => {
    try {
      await api.delete(`/admin/artworks/${artworkId}`)
      setArtworks(artworks.filter((a) => a.id !== artworkId))
      setConfirmDelete(null)
    } catch (error) {
      console.error('Error deleting artwork:', error)
      alert('Eser silinirken bir hata oluştu')
      setConfirmDelete(null)
    }
  }

  const formatFullDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredArtworks = artworks.filter((artwork) => {
    if (searchQuery.trim() === '') return true
    const query = searchQuery.toLowerCase()
    return (
      artwork.title?.toLowerCase().includes(query) ||
      artwork.caption?.toLowerCase().includes(query) ||
      artwork.code?.toLowerCase().includes(query) ||
      artwork.user.username.toLowerCase().includes(query) ||
      artwork.location?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7b00]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[var(--text)] flex items-center gap-2">
            <Palette className="w-8 h-8 text-[#ff7b00]" />
            Eserler
          </h2>
          <p className="text-sm mt-1 text-[var(--sub)]">
            Toplam {total} eser
          </p>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--sub)]" size={20} />
          <input
            type="text"
            placeholder="Eser ara (başlık, açıklama, kod, kullanıcı)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-[var(--card)] text-[var(--text)]"
          />
        </div>
        <div className="relative">
          <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--sub)]" size={20} />
          <input
            type="text"
            placeholder="Kullanıcı ID"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full sm:w-48 pl-12 pr-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-[var(--card)] text-[var(--text)]"
          />
        </div>
      </div>

      {/* Eserler Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArtworks.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[var(--sub)]">
            Eser bulunamadı
          </div>
        ) : (
          filteredArtworks.map((artwork) => (
            <div
              key={artwork.id}
              className="flex flex-col bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] p-4 transition-all hover:shadow-md hover:border-[var(--accent)]/30"
            >
              {/* Eser Görseli */}
              <div className="relative w-full h-64 rounded-xl overflow-hidden bg-[var(--muted)] border border-[var(--border)] mb-4">
                {(() => {
                  let imageUrl: string | null = null

                  if (artwork.media && Array.isArray(artwork.media) && artwork.media.length > 0) {
                    const firstMedia = artwork.media[0]
                    imageUrl = firstMedia?.thumbnailUrl || firstMedia?.url || null
                  }

                  const resolvedImageUrl = imageUrl ? resolveImageUrl(imageUrl) : null

                  if (resolvedImageUrl && !imageErrors.has(artwork.id)) {
                    return (
                      <>
                        <img
                          src={resolvedImageUrl}
                          alt={artwork.title || artwork.caption || 'Eser'}
                          className="object-cover w-full h-full transition-transform duration-300 hover:scale-[1.03]"
                          onError={(e) => {
                            console.error('❌ Artwork image load error:', {
                              artworkId: artwork.id,
                              src: resolvedImageUrl,
                            })
                            setImageErrors((prev) => new Set(prev).add(artwork.id))
                          }}
                        />
                        {artwork.media && artwork.media.length > 1 && (
                          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                            <Image size={12} />
                            {artwork.media.length}
                          </div>
                        )}
                      </>
                    )
                  }

                  return (
                    <div className="flex items-center justify-center h-full text-[var(--sub)] text-sm italic">
                      {imageErrors.has(artwork.id) ? 'Görsel yüklenemedi' : 'Görsel yok'}
                    </div>
                  )
                })()}
              </div>

              {/* Eser İçeriği */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {artwork.user.avatar ? (
                      <img
                        src={resolveImageUrl(artwork.user.avatar)}
                        alt={artwork.user.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#ff7a00] flex items-center justify-center text-white text-xs font-semibold">
                        {artwork.user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-[var(--text)]">
                        {artwork.user.fullName || artwork.user.username}
                      </span>
                      {artwork.code && (
                        <span className="text-xs text-[var(--sub)]">Kod: {artwork.code}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmDelete(artwork.id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Eseri sil"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {artwork.title && (
                  <h3 className="text-lg font-bold text-[var(--text)] mb-2">{artwork.title}</h3>
                )}

                {artwork.caption && (
                  <p className="text-sm text-[var(--sub)] mb-3 line-clamp-2 flex-1">
                    {artwork.caption}
                  </p>
                )}

                {artwork.location && (
                  <div className="text-xs text-[var(--sub)] mb-3 flex items-center gap-1">
                    <span>📍</span>
                    <span>{artwork.location}</span>
                  </div>
                )}

                {artwork.colorPalette && artwork.colorPalette.length > 0 && (
                  <div className="flex items-center gap-1 mb-3">
                    {artwork.colorPalette.slice(0, 5).map((color, idx) => (
                      <div
                        key={idx}
                        className="w-6 h-6 rounded-full border border-[var(--border)]"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-[var(--sub)] mt-auto pt-3 border-t border-[var(--border)]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Heart size={16} className="text-[#ff7a00]" />
                      <span className="text-sm font-medium">{artwork._count.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle size={16} />
                      <span className="text-sm font-medium">{artwork._count.comments}</span>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1 text-xs relative"
                    onMouseEnter={() => setHoveredDate(artwork.id)}
                    onMouseLeave={() => setHoveredDate(null)}
                  >
                    <Calendar size={12} />
                    <span className="cursor-help">
                      {new Date(artwork.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                    {hoveredDate === artwork.id && (
                      <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10 pointer-events-none">
                        {formatFullDate(artwork.createdAt)}
                        <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--sub)]">
          Toplam {total} eser
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--muted)] transition-colors"
          >
            Önceki
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 20 >= total}
            className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--muted)] transition-colors"
          >
            Sonraki
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Eseri Sil"
        message="Bu eseri silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        cancelText="İptal"
        variant="danger"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}








