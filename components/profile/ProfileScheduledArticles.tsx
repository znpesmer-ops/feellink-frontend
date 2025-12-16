'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Calendar, Edit, X } from 'lucide-react'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import toast from 'react-hot-toast'

interface ScheduledArticle {
  id: string
  title: string
  content: string
  coverImage?: string | null
  excerpt?: string | null
  scheduledAt: string
  createdAt: string
  author: {
    id: string
    username: string
    avatar: string | null
    fullName: string | null
  }
}

interface ProfileScheduledArticlesProps {
  authorId?: string
}

export default function ProfileScheduledArticles({ authorId }: ProfileScheduledArticlesProps) {
  const router = useRouter()
  const [articles, setArticles] = useState<ScheduledArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authorId) {
      setLoading(false)
      return
    }

    const loadScheduledArticles = async () => {
      try {
        const response = await api.get('/articles/scheduled')
        setArticles(response.data)
      } catch (error) {
        console.error('Failed to load scheduled articles:', error)
        setArticles([])
      } finally {
        setLoading(false)
      }
    }

    loadScheduledArticles()
  }, [authorId])

  const handleCancelSchedule = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('Bu yazının zamanlamasını iptal etmek istediğinize emin misiniz? Yazı taslak olarak kalacak.')) {
      return
    }

    try {
      await api.put(`/articles/${articleId}`, { scheduledAt: null })
      toast.success('Zamanlama iptal edildi')
      setArticles((prev) => prev.filter((a) => a.id !== articleId))
    } catch (error: any) {
      console.error('Failed to cancel schedule:', error)
      toast.error('Zamanlama iptal edilirken bir hata oluştu')
    }
  }

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
        <Calendar size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
          Zamanlanmış yazınız bulunmuyor.
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs">
          Yazı oluştururken yayın zamanı belirleyerek zamanlanmış yazı oluşturabilirsiniz.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {articles.map((article) => {
        const scheduledDate = new Date(article.scheduledAt)
        const isPast = scheduledDate < new Date()
        
        return (
          <div
            key={article.id}
            className="bg-white/80 dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700/40 
                       rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group relative"
          >
            {article.coverImage ? (
              <div 
                className="relative w-full aspect-square overflow-hidden cursor-pointer"
                onClick={() => router.push(`/articles/edit/${article.id}`)}
              >
                <img
                  src={resolveImageUrl(article.coverImage)}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* 🏷️ Zamanlanmış rozeti */}
                <div className="absolute top-2 right-2 rounded-full bg-orange-500/90 backdrop-blur-sm text-white px-2 py-1 text-xs font-semibold shadow-lg z-10 flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Zamanlanmış</span>
                </div>
              </div>
            ) : (
              <div 
                className="relative w-full aspect-square bg-gradient-to-br from-orange-100/50 to-orange-200/30 dark:from-orange-950/30 dark:to-orange-900/20 flex items-center justify-center cursor-pointer"
                onClick={() => router.push(`/articles/edit/${article.id}`)}
              >
                <span className="text-gray-400 dark:text-gray-500 text-xs">Kapak görseli yok</span>
                {/* 🏷️ Zamanlanmış rozeti */}
                <div className="absolute top-2 right-2 rounded-full bg-orange-500/90 backdrop-blur-sm text-white px-2 py-1 text-xs font-semibold shadow-lg z-10 flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Zamanlanmış</span>
                </div>
              </div>
            )}
            <div className="p-3">
              <h3 
                className="text-sm font-semibold text-[#111] dark:text-white line-clamp-2 mb-2 group-hover:text-[#ff7b00] transition-colors cursor-pointer"
                onClick={() => router.push(`/articles/edit/${article.id}`)}
              >
                {article.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                {article.excerpt || article.content.slice(0, 120) + (article.content.length > 120 ? '...' : '')}
              </p>
              
              {/* Yayınlanma zamanı */}
              <div className={`mb-3 p-2 rounded-lg ${isPast ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'}`}>
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar size={12} className={isPast ? 'text-red-500' : 'text-orange-500'} />
                  <span className={`font-medium ${isPast ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {isPast ? 'Geçmiş tarih' : 'Yayınlanacak'}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isPast ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {scheduledDate.toLocaleString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => router.push(`/articles/edit/${article.id}`)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-[#ff7b00] hover:bg-[#ff7b00]/10 dark:hover:bg-[#ff7b00]/20 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Edit size={14} />
                  <span>Düzenle</span>
                </button>
                <button
                  onClick={(e) => handleCancelSchedule(article.id, e)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-1"
                  title="Zamanlamayı iptal et"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}








