'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Plus } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Collection {
  id: string
  title: string
  description?: string | null
  coverImage?: string | null
  createdAt: string
}

interface AddToCollectionModalProps {
  postId: string
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddToCollectionModal({ postId, open, onClose, onSuccess }: AddToCollectionModalProps) {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(false)
  const [addingToCollectionId, setAddingToCollectionId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setCollections([])
      return
    }

    async function fetchCollections() {
      try {
        setLoading(true)
        const res = await api.get<Collection[]>('/collections/my')
        setCollections(res.data || [])
      } catch (error) {
        console.error('Koleksiyonlar yüklenemedi:', error)
        toast.error('Koleksiyonlar yüklenemedi')
      } finally {
        setLoading(false)
      }
    }

    fetchCollections()
  }, [open])

  const handleAddToCollection = async (collectionId: string) => {
    try {
      setAddingToCollectionId(collectionId)
      await api.post(`/collections/${collectionId}/items`, { postId })
      toast.success('Eser koleksiyona eklendi')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      if (error?.response?.status === 409) {
        toast.error('Bu eser zaten bu koleksiyonda')
      } else {
        toast.error(error?.response?.data?.message || 'Eser eklenemedi')
      }
    } finally {
      setAddingToCollectionId(null)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-950 rounded-2xl p-6 w-full max-w-md shadow-lg border border-gray-200 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Koleksiyona Ekle</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            disabled={addingToCollectionId !== null}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#ff7b00]" />
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">Henüz koleksiyonunuz yok</p>
            <button
              onClick={() => {
                onClose()
                router.push('/collections')
              }}
              className="px-4 py-2 rounded-lg bg-[#ff7b00] hover:bg-[#e36f00] text-white font-medium transition shadow-md flex items-center gap-2 mx-auto"
            >
              <Plus size={18} />
              Koleksiyon Oluştur
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => handleAddToCollection(collection.id)}
                disabled={addingToCollectionId !== null}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#ff7b00] hover:bg-[#ff7b00]/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                  {collection.coverImage ? (
                    <img
                      src={resolveImageUrl(collection.coverImage)}
                      alt={collection.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#ff7b00]/20 to-[#ff7b00]/5 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-[#ff7b00]/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {collection.title}
                  </p>
                  {collection.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {collection.description}
                    </p>
                  )}
                </div>
                {addingToCollectionId === collection.id && (
                  <Loader2 className="w-4 h-4 animate-spin text-[#ff7b00]" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

