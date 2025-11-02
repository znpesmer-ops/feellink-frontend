'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { FileText, Edit, Eye, Heart, MessageCircle } from 'lucide-react'
import api from '@/lib/api'
import { initArticlesSocket } from '@/lib/socket'

interface Article {
  id: string
  title: string
  content: string
  coverImage?: string | null
  excerpt?: string | null
  views?: number
  authorId?: string
  createdAt: string
  _count?: {
    likes: number
    comments: number
  }
}

interface UserArticlesProps {
  authorId?: string
}

export default function UserArticles({ authorId }: UserArticlesProps) {
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  // authorId prop varsa onu kullan, yoksa current user'ın id'sini kullan
  const targetUserId = authorId || user?.id

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false)
      return
    }

    const loadArticles = async () => {
      try {
        const response = await api.get(`/articles/user/${targetUserId}`)
        setArticles(response.data)
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
      const articlesSocket = initArticlesSocket(accessToken)

      const handleArticleCreated = (article: any) => {
        // Sadece ilgili author'a ait yazıları ekle
        if (article.authorId === targetUserId || article.author?.id === targetUserId) {
          setArticles((prev) => {
            // Duplicate check
            if (prev.some((a) => a.id === article.id)) return prev
            return [article, ...prev]
          })
        }
      }

      const handleArticleUpdated = (updatedArticle: any) => {
        // Yorum veya beğeni sayısı güncellendiğinde
        setArticles((prev) =>
          prev.map((a) => 
            a.id === updatedArticle.id 
              ? { ...a, _count: updatedArticle._count || a._count }
              : a
          )
        )
      }

      const handleArticleDeleted = ({ id }: { id: string }) => {
        setArticles((prev) => prev.filter((a) => a.id !== id))
      }

      articlesSocket.on('articleCreated', handleArticleCreated)
      articlesSocket.on('articleUpdated', handleArticleUpdated)
      articlesSocket.on('articleDeleted', handleArticleDeleted)

      return () => {
        articlesSocket.off('articleCreated', handleArticleCreated)
        articlesSocket.off('articleUpdated', handleArticleUpdated)
        articlesSocket.off('articleDeleted', handleArticleDeleted)
      }
    }
  }, [targetUserId, accessToken, user?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
        <FileText size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
          Henüz yazı yayımlamadın.
        </p>
        <button
          onClick={() => router.push('/articles/new')}
          className="text-sm text-[#ff7b00] hover:underline"
        >
          İlk yazını oluştur →
        </button>
      </div>
    )
  }

  // Sadece kendi yazıları için düzenleme butonu göster
  const isOwnArticles = targetUserId === user?.id

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {articles.map((article) => (
        <div
          key={article.id}
          className="bg-white/80 dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700/40 
                     rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group relative"
        >
          {article.coverImage ? (
            <div 
              className="relative w-full aspect-square overflow-hidden cursor-pointer"
              onClick={() => router.push(`/articles/${article.id}`)}
            >
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* 🏷️ Yazı ikon rozeti */}
              <div className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-sm text-white p-1.5 shadow-lg z-10">
                <FileText size={14} strokeWidth={2.5} />
              </div>
            </div>
          ) : (
            <div 
              className="relative w-full aspect-square bg-gradient-to-br from-orange-100/50 to-orange-200/30 dark:from-orange-950/30 dark:to-orange-900/20 flex items-center justify-center cursor-pointer"
              onClick={() => router.push(`/articles/${article.id}`)}
            >
              <span className="text-gray-400 dark:text-gray-500 text-xs">Kapak görseli yok</span>
              {/* 🏷️ Yazı ikon rozeti */}
              <div className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-sm text-white p-1.5 shadow-lg z-10">
                <FileText size={14} strokeWidth={2.5} />
              </div>
            </div>
          )}
          <div className="p-3">
            <h3 
              className="text-sm font-semibold text-[#111] dark:text-white line-clamp-2 mb-2 group-hover:text-[#ff7b00] transition-colors cursor-pointer"
              onClick={() => router.push(`/articles/${article.id}`)}
            >
              {article.title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
              {article.excerpt || article.content.slice(0, 120) + (article.content.length > 120 ? '...' : '')}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
              <div className="flex items-center gap-1">
                <Eye size={14} />
                <span>{article.views || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart size={14} />
                <span>{article._count?.likes || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle size={14} />
                <span>{article._count?.comments || 0}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(article.createdAt).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
              {isOwnArticles && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/articles/edit/${article.id}`)
                  }}
                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-[#ff7b00] hover:bg-[#ff7b00]/10 dark:hover:bg-[#ff7b00]/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Düzenle"
                >
                  <Edit size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

