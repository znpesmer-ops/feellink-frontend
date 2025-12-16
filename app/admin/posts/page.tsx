'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { initPostsSocket } from '@/lib/socket'
import { Search, Trash2, Image, Heart, MessageCircle, Calendar } from 'lucide-react'
import ConfirmModal from '@/components/common/ConfirmModal'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

interface Post {
  id: string
  caption?: string
  location?: string
  createdAt: string
  user: {
    id: string
    username: string
    avatar: string | null
  }
  media: Array<{
    id: string
    type: string
    url: string
    thumbnailUrl?: string
  }>
  _count: {
    likes: number
    comments: number
  }
}

export default function AdminPostsPage() {
  const { accessToken } = useAuthStore()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [page])

  // Socket connection for real-time updates
  useEffect(() => {
    if (!accessToken) return

    const postsSocket = initPostsSocket(accessToken)

    postsSocket.on('post:updated', (updatedPost: Post) => {
      setPosts((prev) =>
        prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
      )
    })

    postsSocket.on('post:deleted', (deletedId: string) => {
      setPosts((prev) => prev.filter((p) => p.id !== deletedId))
      setConfirmDelete(null)
    })

    postsSocket.on('post:like', (data: { postId: string; likes: number }) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === data.postId
            ? { ...p, _count: { ...p._count, likes: data.likes } }
            : p
        )
      )
    })

    postsSocket.on(
      'post:comment',
      (data: { postId: string; comments: number }) => {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === data.postId
              ? { ...p, _count: { ...p._count, comments: data.comments } }
              : p
          )
        )
      }
    )

    postsSocket.on('connect', () => {
      console.log('Posts socket connected')
    })

    postsSocket.on('disconnect', () => {
      console.log('Posts socket disconnected')
    })

    return () => {
      postsSocket.disconnect()
    }
  }, [accessToken])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/admin/posts?page=${page}&limit=20`)
      // Ensure media array exists for all posts
      const postsWithMedia = response.data.posts.map((p: Post) => {
        // Debug: Log first post to see structure
        if (p.id === response.data.posts[0]?.id) {
          console.log('🔍 Admin Posts - First post structure:', {
            id: p.id,
            hasMedia: !!p.media,
            mediaLength: p.media?.length || 0,
            media: p.media,
            caption: p.caption,
          })
        }
        return {
          ...p,
          media: p.media || [],
        }
      })
      setPosts(postsWithMedia)
      setTotal(response.data.total)
    } catch (err) {
      console.error('Error fetching posts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (postId: string) => {
    try {
      await api.delete(`/admin/posts/${postId}`)
      setPosts(posts.filter((p) => p.id !== postId))
      setConfirmDelete(null)
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Gönderi silinirken bir hata oluştu')
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

  const filteredPosts = posts.filter((post) => {
    if (searchQuery.trim() === '') return true
    const query = searchQuery.toLowerCase()
    return (
      post.caption?.toLowerCase().includes(query) ||
      post.user.username.toLowerCase().includes(query) ||
      post.location?.toLowerCase().includes(query)
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
          <h2 className="text-3xl font-bold text-[var(--text)]">Gönderiler</h2>
          <p className="text-sm mt-1 text-[var(--sub)]">
            Toplam {total} gönderi
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--sub)]" size={20} />
        <input
          type="text"
          placeholder="Gönderi ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-[var(--card)] text-[var(--text)]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[var(--sub)]">
            Gönderi bulunamadı
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              className="flex flex-col bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] p-4 transition-all hover:shadow-md hover:border-[var(--accent)]/30"
            >
              {/* Post Media */}
              <div className="relative w-full h-64 rounded-xl overflow-hidden bg-[var(--muted)] border border-[var(--border)] mb-4">
                {(() => {
                  // ✅ Tüm olası görsel alanlarını kontrol et
                  let imageUrl: string | null = null

                  // Öncelik sırası: media array > diğer alanlar
                  if (post.media && Array.isArray(post.media) && post.media.length > 0) {
                    const firstMedia = post.media[0]
                    imageUrl = firstMedia?.thumbnailUrl || firstMedia?.url || null
                  }

                  // Fallback: diğer olası alanlar
                  if (!imageUrl) {
                    imageUrl =
                      (post as any).image ||
                      (post as any).imageUrl ||
                      (post as any).images?.[0] ||
                      null
                  }

                  // URL'yi resolve et
                  const resolvedImageUrl = imageUrl ? resolveImageUrl(imageUrl) : null

                  // Debug log (sadece ilk post için)
                  if (post.id === filteredPosts[0]?.id && resolvedImageUrl) {
                    console.log('🖼️ Admin Post Image:', {
                      postId: post.id,
                      hasMedia: !!post.media,
                      mediaLength: post.media?.length || 0,
                      imageUrl,
                      resolvedImageUrl,
                    })
                  }

                  if (resolvedImageUrl && !imageErrors.has(post.id)) {
                    return (
                      <>
                        <img
                          src={resolvedImageUrl}
                          alt={post.caption || 'Gönderi'}
                          className="object-cover w-full h-full transition-transform duration-300 hover:scale-[1.03]"
                          onError={(e) => {
                            console.error('❌ Image load error:', {
                              postId: post.id,
                              src: resolvedImageUrl,
                              error: e,
                            })
                            setImageErrors((prev) => new Set(prev).add(post.id))
                          }}
                        />
                        {post.media && post.media.length > 1 && (
                          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                            <Image size={12} />
                            {post.media.length}
                          </div>
                        )}
                      </>
                    )
                  }

                  return (
                    <div className="flex items-center justify-center h-full text-[var(--sub)] text-sm italic">
                      {imageErrors.has(post.id) ? 'Görsel yüklenemedi' : 'Görsel yok'}
                    </div>
                  )
                })()}
              </div>

              {/* Post Content */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {post.user.avatar ? (
                      <img
                        src={post.user.avatar}
                        alt={post.user.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#ff7a00] flex items-center justify-center text-white text-xs font-semibold">
                        {post.user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-semibold text-[var(--text)]">
                      {post.user.username}
                    </span>
                  </div>
                  <button
                    onClick={() => setConfirmDelete(post.id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Gönderiyi sil"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {post.caption && (
                  <p className="text-sm text-[var(--sub)] mb-3 line-clamp-2 flex-1">
                    {post.caption}
                  </p>
                )}

                {post.location && (
                  <div className="text-xs text-[var(--sub)] mb-3 flex items-center gap-1">
                    <span>📍</span>
                    <span>{post.location}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[var(--sub)] mt-auto pt-3 border-t border-[var(--border)]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Heart size={16} className="text-[#ff7a00]" />
                      <span className="text-sm font-medium">{post._count.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle size={16} />
                      <span className="text-sm font-medium">{post._count.comments}</span>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1 text-xs relative"
                    onMouseEnter={() => setHoveredDate(post.id)}
                    onMouseLeave={() => setHoveredDate(null)}
                  >
                    <Calendar size={12} />
                    <span className="cursor-help">
                      {new Date(post.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                    {hoveredDate === post.id && (
                      <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10 pointer-events-none">
                        {formatFullDate(post.createdAt)}
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
          Toplam {total} gönderi
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
        title="Gönderiyi Sil"
        message="Bu gönderiyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        cancelText="İptal"
        variant="danger"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
