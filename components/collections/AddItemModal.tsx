'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, Search, Image as ImageIcon, UserCircle2, X as XIcon } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

interface Artwork {
  id: string
  title: string
  caption?: string | null
  coverUrl: string | null
  owner: {
    id: string
    username: string | null
    fullName: string | null
    avatar: string | null
  }
}

interface User {
  id: string
  username: string | null
  fullName: string | null
  avatar: string | null
}

interface SearchResults {
  artworks: Artwork[]
  users: User[]
  nextCursor?: string | null
}

interface AddItemModalProps {
  collectionId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddItemModal({ collectionId, open, onClose, onSuccess }: AddItemModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null)
  const [selectedOwner, setSelectedOwner] = useState<User | null>(null)
  const [results, setResults] = useState<SearchResults>({ artworks: [], users: [] })
  const [loading, setLoading] = useState(false)
  const [addingPostId, setAddingPostId] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  // Debounce search query (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setDebouncedQuery('')
      setSelectedOwnerId(null)
      setSelectedOwner(null)
      setResults({ artworks: [], users: [] })
      setNextCursor(null)
    }
  }, [open])

  // Search function
  const performSearch = useCallback(
    async (query: string, ownerId?: string | null, cursor?: string | null) => {
      if (!open) return

      // Minimum 2 characters for search
      if (query.length < 2 && !ownerId) {
        setResults({ artworks: [], users: [] })
        setNextCursor(null)
        return
      }

      try {
        if (cursor) {
          setLoadingMore(true)
        } else {
          setLoading(true)
        }

        const params = new URLSearchParams()
        if (query.trim()) params.append('q', query.trim())
        if (ownerId) params.append('ownerId', ownerId)
        if (cursor) params.append('cursor', cursor)
        params.append('take', '20')

        const res = await api.get<SearchResults>(`/collections/${collectionId}/search-addable?${params.toString()}`)

        if (cursor) {
          // Append to existing results
          setResults((prev) => ({
            artworks: [...prev.artworks, ...res.data.artworks],
            users: prev.users, // Users only shown on first search
          }))
        } else {
          // Replace results
          setResults(res.data)
        }

        setNextCursor(res.data.nextCursor || null)
      } catch (error: any) {
        console.error('Arama hatası:', error)
        if (!cursor) {
          toast.error(error?.response?.data?.message || 'Arama yapılamadı')
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [collectionId, open],
  )

  // Trigger search when debounced query or owner filter changes
  useEffect(() => {
    performSearch(debouncedQuery, selectedOwnerId, undefined)
  }, [debouncedQuery, selectedOwnerId, performSearch])

  // Load more (infinite scroll)
  const loadMore = useCallback(() => {
    if (nextCursor && !loadingMore && !loading) {
      performSearch(debouncedQuery, selectedOwnerId, nextCursor)
    }
  }, [nextCursor, loadingMore, loading, debouncedQuery, selectedOwnerId, performSearch])

  const handleAddItem = async (artworkId: string) => {
    try {
      setAddingPostId(artworkId)
      await api.post(`/collections/${collectionId}/items`, { postId: artworkId })
      toast.success('Eser koleksiyona eklendi')

      // Optimistic update: Remove from list
      setResults((prev) => ({
        ...prev,
        artworks: prev.artworks.filter((a) => a.id !== artworkId),
      }))

      onSuccess()
    } catch (error: any) {
      if (error?.response?.status === 409) {
        toast.error('Bu eser zaten koleksiyonda')
        // Remove from list anyway
        setResults((prev) => ({
          ...prev,
          artworks: prev.artworks.filter((a) => a.id !== artworkId),
        }))
      } else {
        toast.error(error?.response?.data?.message || 'Eser eklenemedi')
      }
    } finally {
      setAddingPostId(null)
    }
  }

  const handleUserClick = (user: User) => {
    setSelectedOwnerId(user.id)
    setSelectedOwner(user)
    setSearchQuery('') // Clear search when filtering by user
  }

  const handleRemoveOwnerFilter = () => {
    setSelectedOwnerId(null)
    setSelectedOwner(null)
  }

  if (!open) return null

  const showEmptyState = !loading && debouncedQuery.length < 2 && !selectedOwnerId && results.artworks.length === 0
  const showNoResults = !loading && debouncedQuery.length >= 2 && results.artworks.length === 0 && results.users.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-950 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-lg border border-gray-200 dark:border-white/10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Eser Ekle</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            disabled={addingPostId !== null}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Owner Filter Chip */}
        {selectedOwner && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Filtre:</span>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20 border border-[#ff7b00]/30">
              {selectedOwner.avatar ? (
                <img
                  src={resolveImageUrl(selectedOwner.avatar)}
                  alt={selectedOwner.username || 'Kullanıcı'}
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <UserCircle2 className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm font-medium text-[#ff7b00]">@{selectedOwner.username}</span>
              <button
                onClick={handleRemoveOwnerFilter}
                className="text-[#ff7b00] hover:text-[#e36f00] transition"
              >
                <XIcon className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={selectedOwnerId ? "Bu kullanıcının eserlerini ara..." : "Eser, kullanıcı adı veya başlık ara..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/30 focus:border-[#ff7b00] dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto">
          {loading && !loadingMore ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#ff7b00]" />
            </div>
          ) : showEmptyState ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {selectedOwnerId ? 'Bu kullanıcının eserlerini görmek için arama yapın' : 'Aramak için en az 2 karakter yazın'}
              </p>
            </div>
          ) : showNoResults ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Sonuç bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Users List (only on first search, not when owner filter is active) */}
              {!selectedOwnerId && results.users.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Kullanıcılar</h3>
                  <div className="space-y-2">
                    {results.users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleUserClick(user)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#ff7b00] hover:bg-[#ff7b00]/5 transition"
                      >
                        {user.avatar ? (
                          <img
                            src={resolveImageUrl(user.avatar)}
                            alt={user.username || 'Kullanıcı'}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <UserCircle2 className="w-10 h-10 text-gray-400" />
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {user.fullName || user.username || 'Kullanıcı'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">@{user.username}</p>
                        </div>
                        <span className="text-xs text-[#ff7b00]">Eserlerini Gör</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Artworks List */}
              {results.artworks.length > 0 && (
                <div>
                  {!selectedOwnerId && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Eserler</h3>}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {results.artworks.map((artwork) => (
                      <div
                        key={artwork.id}
                        className="group relative rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-[#ff7b00] transition cursor-pointer"
                        onClick={() => handleAddItem(artwork.id)}
                      >
                        {/* Media */}
                        <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          {artwork.coverUrl ? (
                            <img
                              src={resolveImageUrl(artwork.coverUrl)}
                              alt={artwork.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          )}

                          {/* Loading Overlay */}
                          {addingPostId === artwork.id && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin text-white" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 line-clamp-1 mb-1">
                            {artwork.title}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            {artwork.owner.avatar ? (
                              <img
                                src={resolveImageUrl(artwork.owner.avatar)}
                                alt={artwork.owner.username || 'Kullanıcı'}
                                className="w-3 h-3 rounded-full object-cover"
                              />
                            ) : (
                              <UserCircle2 className="w-3 h-3" />
                            )}
                            <span className="truncate">@{artwork.owner.username || 'bilinmeyen'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Load More Button */}
              {nextCursor && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Daha Fazla Yükle'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
