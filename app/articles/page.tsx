'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import { FileText, Plus, Edit, Clock } from 'lucide-react'
import { initPostsSocket } from '@/lib/socket'

interface Article {
  id: string
  title: string
  content: string
  coverImage?: string | null
  excerpt?: string | null
  isPublished: boolean
  scheduledAt?: string | null
  authorId: string
  createdAt: string
  updatedAt: string
  author?: {
    id: string
    username: string
    avatar?: string | null
    fullName?: string | null
  }
}

function ArticlesPageContent() {
  const router = useRouter()
  const { accessToken, user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'published' | 'drafts' | 'all'>('published')
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  // Sekmeye göre veriyi getir
  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      return
    }

    const loadArticles = async () => {
      setLoading(true)
      try {
        let endpoint = ''
        if (activeTab === 'published') {
          endpoint = '/articles/published'
        } else if (activeTab === 'drafts') {
          endpoint = '/articles/drafts'
        } else {
          endpoint = '/articles/public'
        }

        const response = await api.get(endpoint)
        setArticles(response.data || [])
      } catch (error) {
        console.error('Failed to load articles:', error)
        setArticles([])
      } finally {
        setLoading(false)
      }
    }

    loadArticles()

    // Socket.IO ile gerçek zamanlı güncelleme
    if (accessToken) {
      const postsSocket = initPostsSocket(accessToken)

      const handleArticleCreated = (article: Article) => {
        setArticles((prev) => {
          // Zaten varsa ekleme
          if (prev.some((a) => a.id === article.id)) return prev
          // Yeni eklenen yazıyı başa ekle
          return [article, ...prev]
        })
      }

      const handleArticleDeleted = ({ id }: { id: string }) => {
        setArticles((prev) => prev.filter((a) => a.id !== id))
      }

      postsSocket.on('articleCreated', handleArticleCreated)
      postsSocket.on('articleDeleted', handleArticleDeleted)

      return () => {
        postsSocket.off('articleCreated', handleArticleCreated)
        postsSocket.off('articleDeleted', handleArticleDeleted)
      }
    }
  }, [activeTab, accessToken])

  if (!accessToken) {
    return null
  }

  const tabs = [
    { key: 'published' as const, label: 'Yayınlananlar' },
    { key: 'drafts' as const, label: 'Taslaklar' },
    { key: 'all' as const, label: 'Tüm Yazılar' },
  ]

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Üst başlık ve Yeni Yazı butonu */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="text-[#ff7b00]" size={28} />
          Yazılar
        </h1>
        <button
          onClick={() => router.push('/articles/new')}
          className="flex items-center gap-2 bg-[#ff7b00] text-white px-4 py-2.5 rounded-xl font-medium hover:bg-[#e36f00] transition-all shadow-sm hover:shadow-md"
        >
          <Plus size={18} />
          Yeni Yazı
        </button>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative pb-3 px-4 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-[#ff7b00] dark:text-orange-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-[#ff7b00] dark:hover:text-orange-400'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff7b00] dark:bg-orange-400 rounded-full"></div>
            )}
          </button>
        ))}
      </div>

      {/* İçerik */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
          <FileText size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
            {activeTab === 'published' && 'Henüz yayınlanmış yazın yok'}
            {activeTab === 'drafts' && 'Henüz taslak yazın yok'}
            {activeTab === 'all' && 'Henüz yazı paylaşılmamış'}
          </p>
          {activeTab !== 'all' && (
            <button
              onClick={() => router.push('/articles/new')}
              className="text-sm text-[#ff7b00] hover:underline"
            >
              İlk yazını oluştur →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <div
              key={article.id}
              className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 bg-white dark:bg-[#1a1a1a] hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all duration-200 hover:shadow-md group"
            >
              <div className="flex gap-4">
                {/* Kapak Görseli */}
                {article.coverImage && (
                  <div className="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* İçerik */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3
                      className={`text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 ${
                        activeTab === 'all' ? 'cursor-pointer hover:text-[#ff7b00]' : ''
                      }`}
                      onClick={() => {
                        if (activeTab === 'all') {
                          router.push(`/articles/${article.id}`)
                        }
                      }}
                    >
                      {article.title}
                    </h3>
                    {activeTab !== 'all' && (
                      <button
                        onClick={() => router.push(`/articles/edit/${article.id}`)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-[#ff7b00] hover:bg-[#ff7b00]/10 dark:hover:bg-[#ff7b00]/20 rounded-lg transition-all"
                        title="Düzenle"
                      >
                        <Edit size={18} />
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                    {article.excerpt || article.content?.slice(0, 200) || 'İçerik yok'}
                    {!article.excerpt && article.content && article.content.length > 200 && '...'}
                  </p>

                  {/* Alt Bilgi */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <FileText size={14} />
                        <span>Yazı</span>
                      </span>
                      {article.scheduledAt && (
                        <span className="flex items-center gap-1.5 text-[#ff7b00]">
                          <Clock size={14} />
                          <span>
                            {new Date(article.scheduledAt).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' tarihinde yayınlanacak'}
                          </span>
                        </span>
                      )}
                      {!article.scheduledAt && (
                        <span>
                          {new Date(article.createdAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>

                    {activeTab === 'all' && article.author && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {article.author?.avatar ? (
                            <img
                              src={article.author.avatar}
                              alt={article.author.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                              {article.author?.username?.[0]?.toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          @{article.author.username}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ArticlesPage() {
  return (
    <AuthGuard>
      <ArticlesPageContent />
    </AuthGuard>
  )
}
