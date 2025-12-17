'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { FileText, Edit, Eye, Heart, MessageCircle, Calendar, X } from 'lucide-react'
import api from '@/lib/api'
import { initArticlesSocket } from '@/lib/socket'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import toast from 'react-hot-toast'

interface Article {
  id: string
  title: string
  content: string
  coverImage?: string | null
  excerpt?: string | null
  views?: number
  authorId?: string
  createdAt: string
  scheduledAt?: string | null
  isPublished?: boolean
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
  const [activeTab, setActiveTab] = useState<'published' | 'scheduled'>('published')
  const [publishedArticles, setPublishedArticles] = useState<Article[]>([])
  const [scheduledArticles, setScheduledArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  // authorId prop varsa onu kullan, yoksa current user'ın id'sini kullan
  const targetUserId = authorId || user?.id
  const isOwnArticles = targetUserId === user?.id

  useEffect(() => {
    // ✅ Önce state'leri sıfırla
    setPublishedArticles([])
    setScheduledArticles([])
    setLoading(true)

    if (!targetUserId) {
      setLoading(false)
      return
    }

    let isCancelled = false

    const loadArticles = async () => {
      try {
        // Yayınlanan yazıları çek
        const publishedResponse = await api.get(`/articles/user/${targetUserId}`)
        
        // ✅ Cleanup kontrolü: Eğer component unmount olduysa veya targetUserId değiştiyse state güncelleme
        if (isCancelled) return
        
        const allArticles: Article[] = publishedResponse.data || []
        
        // ✅ Duplicate kontrolü: Aynı ID'ye sahip article'ları filtrele
        const uniqueArticles = Array.from(
          new Map(allArticles.map((a: Article) => [a.id, a])).values()
        ) as Article[]
        
        // Yayınlanan ve zamanlanmış yazıları ayır
        const published = uniqueArticles.filter((a: Article) => a.isPublished)
        const scheduled = uniqueArticles.filter((a: Article) => !a.isPublished && a.scheduledAt)
        
        // ✅ Replace yap, append değil (çift render'ı önle)
        if (!isCancelled) {
          setPublishedArticles(published)
          setScheduledArticles(scheduled)
        }
      } catch (error) {
        if (isCancelled) return
        console.error('Failed to load articles:', error)
        if (!isCancelled) {
          setPublishedArticles([])
          setScheduledArticles([])
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadArticles()

    // Socket.IO ile gerçek zamanlı güncelleme
    let articlesSocket: any = null
    if (accessToken) {
      articlesSocket = initArticlesSocket(accessToken as string)

      const handleArticleCreated = (article: any) => {
        if (isCancelled) return
        if (article.authorId === targetUserId || article.author?.id === targetUserId) {
          if (article.isPublished) {
            setPublishedArticles((prev) => {
              // ✅ Duplicate kontrolü
              if (prev.some((a) => a.id === article.id)) return prev
              return [article, ...prev]
            })
          } else if (article.scheduledAt) {
            setScheduledArticles((prev) => {
              // ✅ Duplicate kontrolü
              if (prev.some((a) => a.id === article.id)) return prev
              return [article, ...prev]
            })
          }
        }
      }

      const handleArticleUpdated = (updatedArticle: any) => {
        if (isCancelled) return
        setPublishedArticles((prev) =>
          prev.map((a) => 
            a.id === updatedArticle.id 
              ? { ...a, _count: updatedArticle._count || a._count, ...updatedArticle }
              : a
          )
        )
        setScheduledArticles((prev) =>
          prev.map((a) => 
            a.id === updatedArticle.id 
              ? { ...a, _count: updatedArticle._count || a._count, ...updatedArticle }
              : a
          )
        )
      }

      const handleArticleDeleted = ({ id }: { id: string }) => {
        if (isCancelled) return
        setPublishedArticles((prev) => prev.filter((a) => a.id !== id))
        setScheduledArticles((prev) => prev.filter((a) => a.id !== id))
      }

      articlesSocket.on('articleCreated', handleArticleCreated)
      articlesSocket.on('articleUpdated', handleArticleUpdated)
      articlesSocket.on('articleDeleted', handleArticleDeleted)
    }
    
    // ✅ Cleanup: targetUserId değiştiğinde veya component unmount olduğunda
    return () => {
      isCancelled = true
      if (articlesSocket) {
        articlesSocket.off('articleCreated')
        articlesSocket.off('articleUpdated')
        articlesSocket.off('articleDeleted')
      }
    }
  }, [targetUserId, accessToken, user?.id, isOwnArticles])

  // ✅ useMemo ile unique articles hesapla (duplicate kontrolü garantili)
  const uniquePublishedArticles = useMemo(() => {
    return Array.from(
      new Map(publishedArticles.map((a) => [a.id, a])).values()
    ) as Article[]
  }, [publishedArticles])

  const uniqueScheduledArticles = useMemo(() => {
    return Array.from(
      new Map(scheduledArticles.map((a) => [a.id, a])).values()
    ) as Article[]
  }, [scheduledArticles])

  const handleCancelSchedule = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('Bu yazının zamanlamasını iptal etmek istediğinize emin misiniz? Yazı taslak olarak kalacak.')) {
      return
    }

    try {
      await api.put(`/articles/${articleId}`, { scheduledAt: null })
      toast.success('Zamanlama iptal edildi')
      setScheduledArticles((prev) => prev.filter((a) => a.id !== articleId))
    } catch (error: any) {
      console.error('Failed to cancel schedule:', error)
      toast.error('Zamanlama iptal edilirken bir hata oluştu')
    }
  }

  const renderArticleCard = (article: Article, isScheduled: boolean = false) => (
    <div
      key={article.id}
      className="bg-white/80 dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700/40 
                 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group relative"
    >
      {article.coverImage ? (
        <div 
          className="relative w-full aspect-square overflow-hidden cursor-pointer"
          onClick={() => router.push(isScheduled ? `/articles/edit/${article.id}` : `/articles/${article.id}`)}
        >
          <img
            src={resolveImageUrl(article.coverImage)}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* 🏷️ Yazı ikon rozeti */}
          <div className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-sm text-white p-1.5 shadow-lg z-10">
            <FileText size={14} strokeWidth={2.5} />
          </div>
          {/* Zamanlanmış rozeti */}
          {isScheduled && (
            <div className="absolute top-2 left-2 rounded-full bg-orange-500/90 backdrop-blur-sm text-white px-2 py-1 text-xs font-semibold shadow-lg z-10 flex items-center gap-1">
              <Calendar size={12} />
              <span>Zamanlanmış</span>
            </div>
          )}
        </div>
      ) : (
        <div 
          className="relative w-full aspect-square bg-gradient-to-br from-orange-100/50 to-orange-200/30 dark:from-orange-950/30 dark:to-orange-900/20 flex items-center justify-center cursor-pointer"
          onClick={() => router.push(isScheduled ? `/articles/edit/${article.id}` : `/articles/${article.id}`)}
        >
          <span className="text-gray-400 dark:text-gray-500 text-xs">Kapak görseli yok</span>
          {/* 🏷️ Yazı ikon rozeti */}
          <div className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-sm text-white p-1.5 shadow-lg z-10">
            <FileText size={14} strokeWidth={2.5} />
          </div>
          {/* Zamanlanmış rozeti */}
          {isScheduled && (
            <div className="absolute top-2 left-2 rounded-full bg-orange-500/90 backdrop-blur-sm text-white px-2 py-1 text-xs font-semibold shadow-lg z-10 flex items-center gap-1">
              <Calendar size={12} />
              <span>Zamanlanmış</span>
            </div>
          )}
        </div>
      )}
      <div className="p-3">
        <h3 
          className="text-sm font-semibold text-[#111] dark:text-white line-clamp-2 mb-2 group-hover:text-[#ff7b00] transition-colors cursor-pointer"
          onClick={() => router.push(isScheduled ? `/articles/edit/${article.id}` : `/articles/${article.id}`)}
        >
          {article.title}
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {article.excerpt || article.content.slice(0, 120) + (article.content.length > 120 ? '...' : '')}
        </p>
        
        {/* Zamanlanmış yazılar için yayınlanma tarihi */}
        {isScheduled && article.scheduledAt && (
          <div className={`mb-3 p-2 rounded-lg ${new Date(article.scheduledAt) < new Date() ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'}`}>
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar size={12} className={new Date(article.scheduledAt) < new Date() ? 'text-red-500' : 'text-orange-500'} />
              <span className={`font-medium ${new Date(article.scheduledAt) < new Date() ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {new Date(article.scheduledAt) < new Date() ? 'Geçmiş tarih' : 'Yayınlanacak'}
              </span>
            </div>
            <p className={`text-xs mt-1 ${new Date(article.scheduledAt) < new Date() ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {new Date(article.scheduledAt).toLocaleString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}

        {/* Yayınlanan yazılar için istatistikler */}
        {!isScheduled && (
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
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(article.createdAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'short',
            })}
          </p>
          {isOwnArticles && (
            <div className="flex items-center gap-1">
              {isScheduled && (
                <button
                  onClick={(e) => handleCancelSchedule(article.id, e)}
                  className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Zamanlamayı iptal et"
                >
                  <X size={14} />
                </button>
              )}
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
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Sadece kendi yazıları için alt sekmeler göster
  const showTabs = isOwnArticles

  return (
    <div>
      {/* ✅ Alt Sekmeler - Sadece kendi yazıları için */}
      {showTabs && (
        <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-700 pb-3 mb-6">
          <button
            onClick={() => setActiveTab('published')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'published'
                ? 'text-[#ff7b00] border-b-2 border-[#ff7b00]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Yayınlanan
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'scheduled'
                ? 'text-[#ff7b00] border-b-2 border-[#ff7b00]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Zamanlanmış
          </button>
          <div className="ml-auto">
            <Link
              href="/articles/new"
              className="px-4 py-2 text-sm font-medium bg-[#FF8A00] text-white rounded-lg shadow-sm hover:bg-[#e67a00] transition"
            >
              Yeni Yazı Oluştur
            </Link>
          </div>
        </div>
      )}

      {/* ✅ Yayınlanan Yazılar */}
      {activeTab === 'published' && (
        <>
          {uniquePublishedArticles.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
                {isOwnArticles ? 'Henüz yazı yayımlamadın.' : 'Henüz yazı yayımlanmamış.'}
              </p>
              {isOwnArticles && (
                <button
                  onClick={() => router.push('/articles/new')}
                  className="text-sm text-[#ff7b00] hover:underline"
                >
                  İlk yazını oluştur →
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniquePublishedArticles.map((article) => renderArticleCard(article, false))}
            </div>
          )}
        </>
      )}

      {/* ✅ Zamanlanmış Yazılar */}
      {activeTab === 'scheduled' && (
        <>
          {uniqueScheduledArticles.length === 0 ? (
            <div className="text-center py-12">
              <Calendar size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
                Zamanlanmış yazınız bulunmuyor.
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs">
                Yazı oluştururken yayın zamanı belirleyerek zamanlanmış yazı oluşturabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueScheduledArticles.map((article) => renderArticleCard(article, true))}
            </div>
          )}
        </>
      )}

      {/* ✅ Başkasının profili için sadece yayınlanan yazıları göster - activeTab === 'published' koşulunda zaten render ediliyor, bu blok kaldırıldı */}
    </div>
  )
}

