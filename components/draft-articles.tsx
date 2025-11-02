'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { FileText, Send, Edit, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { initPostsSocket } from '@/lib/socket'

interface DraftArticle {
  id: string
  title: string
  content: string
  coverImage?: string | null
  excerpt?: string | null
  createdAt: string
  updatedAt: string
}

interface DraftArticlesProps {
  authorId?: string
}

export default function DraftArticles({ authorId }: DraftArticlesProps) {
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const [drafts, setDrafts] = useState<DraftArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [publishingId, setPublishingId] = useState<string | null>(null)

  const targetUserId = authorId || user?.id

  useEffect(() => {
    if (!targetUserId || !accessToken) {
      setLoading(false)
      return
    }

    const loadDrafts = async () => {
      try {
        const response = await api.get('/articles/drafts')
        setDrafts(response.data)
      } catch (error) {
        console.error('Failed to load drafts:', error)
        setDrafts([])
      } finally {
        setLoading(false)
      }
    }

    loadDrafts()

    // Socket.IO ile gerçek zamanlı güncelleme
    const postsSocket = initPostsSocket(accessToken)

    const handleArticlePublished = (article: any) => {
      // Yayınlanan yazı taslak listesinden çıkar
      setDrafts((prev) => prev.filter((d) => d.id !== article.id))
    }

    postsSocket.on('articleCreated', handleArticlePublished)

    return () => {
      postsSocket.off('articleCreated', handleArticlePublished)
    }
  }, [targetUserId, accessToken])

  const handlePublish = async (id: string) => {
    setPublishingId(id)
    try {
      await api.put(`/articles/${id}/publish`)
      // Taslak listesinden kaldır
      setDrafts((prev) => prev.filter((d) => d.id !== id))
    } catch (error) {
      console.error('Failed to publish article:', error)
      alert('Yayınlanırken bir hata oluştu')
    } finally {
      setPublishingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu taslağı silmek istediğinizden emin misiniz?')) return

    try {
      await api.delete(`/articles/${id}`)
      setDrafts((prev) => prev.filter((d) => d.id !== id))
    } catch (error) {
      console.error('Failed to delete draft:', error)
      alert('Silinirken bir hata oluştu')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (drafts.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
        <FileText size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
          Henüz taslak yok.
        </p>
        <button
          onClick={() => router.push('/articles/new')}
          className="text-sm text-[#ff7b00] hover:underline"
        >
          İlk taslağını oluştur →
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-[#1a1a1a] hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-1">
                  {draft.title}
                </h3>
                <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                  Taslak
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-3">
                {draft.excerpt || draft.content.slice(0, 120)}
                {!draft.excerpt && draft.content.length > 120 && '...'}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                <span>
                  Oluşturulma: {new Date(draft.createdAt).toLocaleDateString('tr-TR')}
                </span>
                <span>
                  Son güncelleme: {new Date(draft.updatedAt).toLocaleDateString('tr-TR')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => router.push(`/articles/edit/${draft.id}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-[#ff7b00] hover:bg-[#ff7b00]/10 dark:hover:bg-[#ff7b00]/20 rounded-lg transition-colors"
                title="Düzenle"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={() => handlePublish(draft.id)}
                disabled={publishingId === draft.id}
                className="px-4 py-2 bg-[#ff7b00] text-white rounded-lg hover:bg-[#e36f00] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
              >
                {publishingId === draft.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Yayınlanıyor...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Yayınla</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleDelete(draft.id)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                title="Sil"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

