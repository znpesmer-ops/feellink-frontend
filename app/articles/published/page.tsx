'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'

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
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

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
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
        <span>🌍</span>
        Tüm Yayınlanan Yazılar
      </h1>

      {articles.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-900 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            Henüz yayınlanmış yazı yok.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {articles.map((article) => (
            <Link
              href={`/articles/${article.id}`}
              key={article.id}
              className="block border border-gray-200 dark:border-gray-800 rounded-xl p-5 bg-white dark:bg-[#1a1a1a] hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all shadow-sm hover:shadow-md"
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
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

