'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2, Edit2, ArrowLeft, UserCircle2 } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { ProRoleBadge } from '@/components/ProRoleBadge'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import toast from 'react-hot-toast'
import { PostModal } from '@/components/post-modal'
import { AddItemModal } from '@/components/collections/AddItemModal'

interface CollectionItem {
  id: string
  order: number
  post: {
    id: string
    title?: string | null
    caption?: string | null
    type: string
    media: Array<{
      id: string
      url: string
      type: string
      thumbnailUrl?: string | null
    }>
    user: {
      id: string
      username: string | null
      fullName: string | null
      avatar: string | null
    }
  }
}

interface Collection {
  id: string
  title: string
  description?: string | null
  coverImage?: string | null
  isPublic: boolean
  ownerId: string
  createdAt: string
  owner: {
    id: string
    username: string | null
    fullName: string | null
    avatar: string | null
    roles: string[]
  }
  items: CollectionItem[]
}

export default function CollectionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, accessToken, capabilities } = useAuthStore()
  const collectionId = params.id as string

  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [removingItem, setRemovingItem] = useState<string | null>(null)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const roles = capabilities?.roles ?? user?.roles ?? []
  const canManageCollections = roles.includes('corporate') || roles.includes('collector')
  const isOwner = collection?.ownerId === user?.id

  useEffect(() => {
    if (!accessToken) {
      router.push('/login')
      return
    }

    if (!collectionId) {
      console.error('Collection ID bulunamadı')
      router.push('/collections')
      return
    }

    async function fetchCollection() {
      try {
        setLoading(true)
        console.log('Fetching collection:', collectionId)
        const res = await api.get<Collection>(`/collections/${collectionId}`)
        setCollection(res.data)
      } catch (error: any) {
        console.error('Koleksiyon yüklenemedi:', error)
        console.error('Error response:', error?.response?.data)
        toast.error(error?.response?.data?.message || 'Koleksiyon yüklenemedi')
        router.push('/collections')
      } finally {
        setLoading(false)
      }
    }

    fetchCollection()
  }, [collectionId, accessToken, router])

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm('Bu eseri koleksiyondan çıkarmak istediğinize emin misiniz?')) {
      return
    }

    try {
      setRemovingItem(itemId)
      await api.delete(`/collections/${collectionId}/items/${itemId}`)
      toast.success('Eser koleksiyondan çıkarıldı')
      
      // Local state'i güncelle
      if (collection) {
        setCollection({
          ...collection,
          items: collection.items.filter((item) => item.id !== itemId),
        })
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Eser çıkarılamadı')
    } finally {
      setRemovingItem(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff7b00]" />
      </div>
    )
  }

  if (!collection) {
    return null
  }

  return (
    <div className="w-full px-6 py-4">
      <div className="max-w-[1600px] mx-auto text-gray-900 dark:text-gray-100">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/collections')}
            className="mb-4 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-[#ff7b00] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Koleksiyonlara Dön
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-[#ff7b00] mb-2">
                {collection.title}
              </h1>
              {collection.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">{collection.description}</p>
              )}
              <div className="flex items-center gap-3">
                {collection.owner.avatar ? (
                  <img
                    src={resolveImageUrl(collection.owner.avatar)}
                    alt={collection.owner.username || 'Kullanıcı'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle2 className="w-8 h-8 text-gray-400" />
                )}
                <div>
                  <Link
                    href={`/profile/${collection.owner.username}`}
                    className="font-medium hover:text-[#ff7b00] transition flex items-center gap-2"
                  >
                    @{collection.owner.username || 'bilinmeyen'}
                    <ProRoleBadge roles={collection.owner.roles} plan={undefined} />
                  </Link>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(collection.createdAt).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 rounded-lg bg-[#ff7b00] hover:bg-[#e36f00] text-white font-medium transition shadow-md flex items-center gap-2"
                >
                  <Plus size={18} />
                  Eser Ekle
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Items Grid */}
        {collection.items.length === 0 ? (
          <div className="w-full py-20 flex flex-col items-center text-center opacity-70">
            <p className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
              Bu koleksiyonda henüz eser yok
            </p>
            {isOwner && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-4 py-2 rounded-lg bg-[#ff7b00] hover:bg-[#e36f00] text-white font-medium transition shadow-md"
              >
                İlk Eseri Ekle
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {collection.items.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-white/5 hover:scale-[1.02] transition-all duration-300 shadow-sm hover:shadow-lg cursor-pointer"
                onClick={() => setSelectedPostId(item.post.id)}
              >
                {/* Media */}
                <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  {item.post.media && item.post.media.length > 0 ? (
                    item.post.media[0].type === 'video' ? (
                      <video
                        src={resolveImageUrl(item.post.media[0].url)}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={resolveImageUrl(item.post.media[0].url)}
                        alt={item.post.title || item.post.caption || 'Eser'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#ff7b00]/20 to-[#ff7b00]/5 flex items-center justify-center">
                      <p className="text-gray-400">Görsel yok</p>
                    </div>
                  )}

                  {/* Remove Button (Owner only) */}
                  {isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveItem(item.id)
                      }}
                      disabled={removingItem === item.id}
                      className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {removingItem === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 mb-1">
                    {item.post.title || item.post.caption || 'İsimsiz Eser'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {item.post.user.avatar ? (
                      <img
                        src={resolveImageUrl(item.post.user.avatar)}
                        alt={item.post.user.username || 'Kullanıcı'}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    ) : (
                      <UserCircle2 className="w-4 h-4" />
                    )}
                    <span>@{item.post.user.username || 'bilinmeyen'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post Modal */}
      {selectedPostId && (
        <PostModal postId={selectedPostId} onClose={() => setSelectedPostId(null)} />
      )}

      {/* Add Item Modal */}
      <AddItemModal
        collectionId={collectionId}
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          // Refresh collection data
          api.get<Collection>(`/collections/${collectionId}`).then((res) => {
            setCollection(res.data)
          })
        }}
      />
    </div>
  )
}

