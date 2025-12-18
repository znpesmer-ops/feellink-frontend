'use client'

import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MoreVertical, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

interface Article {
  id: string
  title: string
  content: string
  excerpt?: string | null
  coverImage?: string | null
  createdAt: string
  author: {
    id: string
    username: string
    avatar?: string | null
    fullName?: string | null
  }
}

export default function PublishedArticlesPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (articleId: string) => {
      await api.delete(`/articles/${articleId}`)
    },
    onSuccess: (_, articleId) => {
      toast.success('Yazı başarıyla silindi')
      setArticles((prev) => prev.filter((a) => a.id !== articleId))
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      setMenuOpen(null)
      setConfirmDelete(null)
    },
    onError: (error: any) => {
      console.error('Delete error:', error)
      toast.error(error.response?.data?.message || 'Yazı silinirken bir hata oluştu')
      setConfirmDelete(null)
    },
  })

  const handleDeleteClick = (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation()
    e.preventDefault()
    setConfirmDelete(articleId)
    setMenuOpen(null)
  }

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (confirmDelete) {
      deleteMutation.mutate(confirmDelete)
    }
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setConfirmDelete(null)
  }

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.values(menuRefs.current).forEach((ref) => {
        if (ref && !ref.contains(event.target as Node)) {
          setMenuOpen(null)
        }
      })
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await api.get('/articles/published/all')
        setArticles(response.data)
      } catch (error) {
        console.error('Failed to fetch articles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [])

  if (loading) {
    return (
      <div className="w-full max-w-[720px] mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      <h2 className="text-center text-lg font-semibold mb-6 text-gray-900 dark:text-white">
        Tüm Yayınlanan Yazılar
      </h2>

      {articles.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-900 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            Henüz yayınlanmış yazı yok.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => {
            const isOwner = user?.id === article.author.id
            return (
              <div
                key={article.id}
                className="relative w-full min-w-[320px] rounded-xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-[#1a1a1a] hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all shadow-sm hover:shadow-md overflow-hidden"
              >
                {/* Menü butonu - Sadece yazı sahibi görür */}
                {isOwner && (
                  <div
                    ref={(el) => {
                      if (article.id) menuRefs.current[article.id] = el
                    }}
                    className="absolute top-5 right-5 z-10"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(menuOpen === article.id ? null : article.id)
                      }}
                      className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors"
                      title="Menü"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {/* Açılır menü */}
                    {menuOpen === article.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-10 right-0 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[120px] z-10"
                      >
                        <button
                          onClick={(e) => handleDeleteClick(e, article.id)}
                          disabled={deleteMutation.isPending}
                          className="w-full px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={16} />
                          Yazıyı Sil
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <Link
                  href={`/articles/${article.id}`}
                  className="block"
                >
              {/* Yazar Bilgisi */}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {article.author.avatar ? (
                    <img
                      src={article.author.avatar}
                      alt={article.author.username}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/default.png'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      {article.author.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    @{article.author.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(article.createdAt).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* İçerik */}
              <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white line-clamp-2">
                {article.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                {article.excerpt || article.content.slice(0, 200) + (article.content.length > 200 ? '...' : '')}
              </p>

              {/* Kapak Görseli (varsa) */}
              {article.coverImage && (
                <div className="mt-3 relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    className="w-full h-full aspect-[4/3] object-cover"
                  />
                </div>
              )}
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Silme Onay Modalı */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
          onClick={handleCancelDelete}
        >
          <div
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Yazıyı Sil
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Bu yazıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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

