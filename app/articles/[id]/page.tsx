'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Heart, MessageCircle, ArrowLeft, Eye } from 'lucide-react'
import { useAuthStore } from '@/lib/store'

interface Article {
  id: string
  title: string
  content: string
  excerpt?: string | null
  coverImage?: string | null
  views?: number
  createdAt: string
  author: {
    id: string
    username: string
    avatar?: string | null
    fullName?: string | null
  }
  _count?: {
    likes: number
    comments: number
  }
  comments?: Array<{
    id: string
    content: string
    createdAt: string
    author: {
      id: string
      username: string
      avatar?: string | null
    }
  }>
}

export default function ArticleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await api.get(`/articles/${params.id}`)
        setArticle(response.data)
        setLoading(false)
        
        // Okunma sayısını artır (localStorage ile aynı kullanıcı tekrar okumazsa)
        const viewedKey = `article_viewed_${params.id}`
        if (typeof window !== 'undefined' && !localStorage.getItem(viewedKey)) {
          api.post(`/articles/${params.id}/view`).catch(() => {})
          localStorage.setItem(viewedKey, 'true')
        }
      } catch (error) {
        console.error('Failed to fetch article:', error)
        setLoading(false)
      }
    }

    if (params.id) {
      fetchArticle()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Yazı bulunamadı.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Geri Butonu */}
      <button
        onClick={() => router.back()}
        className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-6 hover:text-[#ff7b00] transition-colors group"
      >
        <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
        Geri dön
      </button>

      {/* Başlık */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight flex-1">
          {article.title}
        </h1>
        {user && article.author.id === user.id && (
          <button
            onClick={() => router.push(`/articles/edit/${article.id}`)}
            className="text-sm text-[#ff7b00] hover:text-[#e36f00] font-medium px-4 py-2 border border-[#ff7b00] rounded-xl hover:bg-[#ff7b00]/10 dark:hover:bg-[#ff7b00]/20 transition-all whitespace-nowrap flex-shrink-0"
          >
            ✏️ Yazıyı Düzenle
          </button>
        )}
      </div>

      {/* Yazar Bilgisi */}
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
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
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">
              {article.author.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-800 dark:text-gray-200">
            {article.author.fullName || `@${article.author.username}`}
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

      {/* Kapak Görseli */}
      {article.coverImage && (
        <div className="mb-10 relative w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      {/* İçerik */}
      <div className="prose prose-lg dark:prose-invert max-w-none mb-10 text-gray-800 dark:text-gray-200 leading-relaxed">
        <div className="whitespace-pre-wrap">{article.content}</div>
      </div>

      {/* Beğeni / Yorum / Okunma İstatistikleri */}
      <div className="flex items-center gap-6 mb-10 pb-8 border-b border-gray-200 dark:border-gray-800">
        <button
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            liked
              ? 'text-[#ff7b00]'
              : 'text-gray-500 dark:text-gray-400 hover:text-[#ff7b00]'
          }`}
          onClick={() => setLiked(!liked)}
        >
          <Heart
            size={20}
            className={liked ? 'fill-[#ff7b00]' : ''}
          />
          <span>{article._count?.likes || 0}</span>
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <MessageCircle size={20} />
          <span>{article._count?.comments || 0}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Eye size={20} />
          <span>{article.views || 0}</span>
        </div>
      </div>

      {/* Yorum Bölümü */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Yorumlar
        </h3>

        {user && (
          <div className="mb-6">
            <div className="flex items-start gap-3">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <textarea
                  placeholder="Yorumunuzu yazın..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] transition-all resize-none"
                  rows={3}
                />
                <button
                  className="mt-2 px-4 py-2 bg-[#ff7b00] text-white rounded-lg hover:bg-[#e36f00] transition-colors text-sm font-medium"
                >
                  Yorum Yap
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Yorum Listesi */}
        {article.comments && article.comments.length > 0 ? (
          <div className="space-y-4">
            {article.comments.map((comment) => (
              <div
                key={comment.id}
                className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-[#1a1a1a]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                    {comment.author.avatar ? (
                      <img
                        src={comment.author.avatar}
                        alt={comment.author.username}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/default.png'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        {comment.author.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    @{comment.author.username}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(comment.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            Henüz yorum yok. İlk yorumu sen yap!
          </div>
        )}
      </div>
    </div>
  )
}

