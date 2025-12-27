'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { Heart, MessageCircle, ArrowLeft, Eye, CornerDownRight } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { initArticlesSocket } from '@/lib/socket'
import type { Socket } from 'socket.io-client'
import DOMPurify from 'dompurify'

const CommentLikeButton = dynamic(() => import('@/components/CommentLikeButton'), {
  ssr: false,
  loading: () => null,
})

interface Comment {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    username: string
    avatar?: string | null
    fullName?: string | null
  }
  replies?: Comment[]
  isLikedByCurrentUser?: boolean
  likesCount?: number
}

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
    likes?: number
    comments?: number
  }
  comments?: Comment[]
}

export default function ArticleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isPostingComment, setIsPostingComment] = useState(false)
  const articlesSocketRef = useRef<Socket | null>(null)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({})
  const [isPostingReply, setIsPostingReply] = useState<{ [key: string]: boolean }>({})
  const [highlightId, setHighlightId] = useState<string | null>(null)

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

  // Hash ile gelen URL'de otomatik scroll ve highlight
  useEffect(() => {
    if (!loading && article) {
      const hash = window.location.hash
      if (hash.startsWith('#cmt-')) {
        const commentId = hash.replace('#cmt-', '')
        setHighlightId(commentId)
        
        setTimeout(() => {
          const element = document.getElementById(`cmt-${commentId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 400) // Yorumların yüklenmesini bekle
        
        // 2 saniye sonra highlight'ı kaldır
        setTimeout(() => setHighlightId(null), 2000)
      }
    }
  }, [loading, article])

  // Gerçek zamanlı yorum sistemi
  useEffect(() => {
    if (!accessToken || !params.id || !article) return

    const socket = initArticlesSocket(accessToken)
    articlesSocketRef.current = socket

    // Yazı odasına katıl
    socket.emit('joinArticleRoom', params.id)

    // Yeni yorum geldiğinde state'e ekle
    socket.on('commentAdded', (newComment: any) => {
      setArticle((prev) => {
        if (!prev) return prev
        
        // Aynı içerikli temp comment varsa değiştir, yoksa yeni ekle
        const existingTempIndex = prev.comments?.findIndex((c) => 
          c.id?.startsWith('temp_') && 
          c.content === newComment.content && 
          c.author.id === newComment.author.id
        ) ?? -1

        if (existingTempIndex !== -1) {
          // Temp comment'i gerçek olanla değiştir
          const updatedComments = [...(prev.comments || [])]
          updatedComments[existingTempIndex] = newComment
          return {
            ...prev,
            comments: updatedComments,
          }
        }

        // Çift eklemeyi önle
        if (prev.comments?.some((c) => c.id === newComment.id)) {
          return prev
        }

        // Yeni yorum ekle
        return {
          ...prev,
          comments: [newComment, ...(prev.comments || [])],
          _count: {
            ...prev._count,
            comments: (prev._count?.comments || 0) + 1,
          },
        }
      })
    })

    // Yorum silindiğinde state'ten çıkar
    socket.on('commentDeleted', (data: { id: string }) => {
      setArticle((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          comments: prev.comments?.filter((c) => c.id !== data.id) || [],
          _count: {
            ...prev._count,
            comments: Math.max(0, (prev._count?.comments || 0) - 1),
          },
        }
      })
    })

    // Reply geldiğinde state'e ekle
    socket.on('replyAdded', (newReply: any) => {
      setArticle((prev) => {
        if (!prev) return prev
        
        return {
          ...prev,
          comments: prev.comments?.map((comment) => {
            if (comment.id === newReply.parentId) {
              // Temp reply varsa gerçek olanla değiştir
              const existingTempIndex = (comment.replies || []).findIndex((r) => 
                r.id?.startsWith('temp_reply_') && 
                r.content === newReply.content && 
                r.author.id === newReply.author.id
              )

              if (existingTempIndex !== -1) {
                const updatedReplies = [...(comment.replies || [])]
                updatedReplies[existingTempIndex] = newReply
                return {
                  ...comment,
                  replies: updatedReplies,
                }
              }

              // 🔍 Çift eklemeyi önle - aynı ID varsa tekrar ekleme
              const alreadyExists = (comment.replies || []).some((r) => r.id === newReply.id)
              if (alreadyExists) {
                return comment
              }

              // Bu yoruma ekle
              return {
                ...comment,
                replies: [...(comment.replies || []), newReply],
              }
            }
            return comment
          }) || [],
        }
      })
    })

    socket.on('connect', () => {
      console.log('✅ Articles socket connected')
    })

    return () => {
      socket.off('commentAdded')
      socket.off('commentDeleted')
      socket.off('replyAdded')
      socket.off('connect')
      socket.disconnect()
      articlesSocketRef.current = null
    }
  }, [accessToken, params.id, article])

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || !user || isPostingComment) return

    const commentToSend = commentText.trim()
    setCommentText('')
    setIsPostingComment(true)

    // Optimistic update - yorumu hemen UI'a ekle
    const tempComment = {
      id: `temp_${Date.now()}`,
      content: commentToSend,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        fullName: user.fullName,
      },
      replies: [],
    }

    setArticle((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        comments: [tempComment, ...(prev.comments || [])],
        _count: {
          ...prev._count,
          comments: (prev._count?.comments || 0) + 1,
        },
      }
    })

    try {
      // Backend'e kaydet - socket zaten backend'den commentAdded yayınlayacak
      await api.post(`/articles/${params.id}/comments`, { content: commentToSend })
      
      // Temp comment'i gerçek olanla değiştir (socket'ten gelecek)
      // Çift eklemeyi önlemek için socket listener'da zaten kontrol var
    } catch (error) {
      console.error('Failed to post comment:', error)
      
      // Hata durumunda optimistic update'i geri al
      setArticle((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          comments: prev.comments?.filter((c) => c.id !== tempComment.id) || [],
          _count: {
            ...prev._count,
            comments: Math.max(0, (prev._count?.comments || 0) - 1),
          },
        }
      })
      
      // Yazıyı geri ekle ve hata mesajı göster
      setCommentText(commentToSend)
      alert('Yorum gönderilemedi, tekrar deneyin')
    } finally {
      setIsPostingComment(false)
    }
  }

  const handleReply = async (e: React.FormEvent, commentId: string) => {
    e.preventDefault()
    if (!replyContent[commentId]?.trim() || !user || isPostingReply[commentId]) return

    const replyToSend = replyContent[commentId].trim()
    setReplyContent({ ...replyContent, [commentId]: '' })
    setIsPostingReply({ ...isPostingReply, [commentId]: true })

    // Optimistic update
    const tempReply = {
      id: `temp_reply_${Date.now()}`,
      content: replyToSend,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        fullName: user.fullName,
      },
    }

    setArticle((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        comments: prev.comments?.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), tempReply],
            }
          }
          return comment
        }) || [],
      }
    })

    try {
      await api.post(`/articles/comments/${commentId}/reply`, { content: replyToSend })
      setReplyingTo(null)
    } catch (error) {
      console.error('Failed to post reply:', error)
      
      // Revert optimistic update
      setArticle((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          comments: prev.comments?.map((comment) => {
            if (comment.id === commentId) {
              return {
                ...comment,
                replies: (comment.replies || []).filter((r) => r.id !== tempReply.id),
              }
            }
            return comment
          }) || [],
        }
      })
      
      setReplyContent({ ...replyContent, [commentId]: replyToSend })
      alert('Yanıt gönderilemedi, tekrar deneyin')
    } finally {
      setIsPostingReply({ ...isPostingReply, [commentId]: false })
    }
  }

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
        <div
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(article.content, {
              ALLOWED_TAGS: ['p', 'strong', 'em', 's', 'u', 'a', 'h2', 'h3', 'ul', 'ol', 'li', 'br'],
              ALLOWED_ATTR: ['href', 'target', 'rel'],
              ALLOW_DATA_ATTR: false,
            }),
          }}
        />
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
                <form onSubmit={handleComment}>
                  <textarea
                    placeholder="Yorumunuzu yazın..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleComment(e)
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] transition-all resize-none"
                    rows={3}
                  />
                  <button
                    type="submit"
                    disabled={isPostingComment || !commentText.trim()}
                    className="mt-2 px-4 py-2 bg-[#ff7b00] text-white rounded-lg hover:bg-[#e36f00] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPostingComment ? 'Gönderiliyor...' : 'Yorum Yap'}
                  </button>
                </form>
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
                id={`cmt-${comment.id}`}
                className={`border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-[#1a1a1a] animate-fadeIn transition-all duration-500 ${
                  highlightId === comment.id ? 'highlighted' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                      {comment.author?.avatar ? (
                        <img
                          src={comment.author.avatar}
                          alt={comment.author.username || 'User'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/default.png'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          {(comment.author?.username || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      @{comment.author?.username || 'Kullanıcı'}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(comment.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  {/* Beğeni butonu - her zaman görünür */}
                  <div className="flex-shrink-0">
                    <CommentLikeButton
                      commentId={comment.id}
                      initialLiked={comment.isLikedByCurrentUser || false}
                      initialCount={comment.likesCount || 0}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {comment.content}
                </p>

                {/* Yanıtla butonu */}
                {user && (
                  <button
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="text-xs text-[#ff7b00] hover:text-[#e36f00] font-medium transition-colors mt-2 flex items-center gap-1"
                  >
                    <CornerDownRight size={14} />
                    Yanıtla
                  </button>
                )}

                {/* Reply formu */}
                {replyingTo === comment.id && user && (
                  <form
                    onSubmit={(e) => handleReply(e, comment.id)}
                    className="mt-3 ml-8 border-l-2 border-[#ff7b00]/30 pl-4"
                  >
                    <textarea
                      value={replyContent[comment.id] || ''}
                      onChange={(e) => setReplyContent({ ...replyContent, [comment.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleReply(e, comment.id)
                        }
                      }}
                      placeholder="Yanıt yazın..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] transition-all resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        type="submit"
                        disabled={isPostingReply[comment.id] || !replyContent[comment.id]?.trim()}
                        className="px-3 py-1.5 bg-[#ff7b00] text-white rounded-lg text-xs hover:bg-[#e36f00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPostingReply[comment.id] ? 'Gönderiliyor...' : 'Gönder'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(null)
                          setReplyContent({ ...replyContent, [comment.id]: '' })
                        }}
                        className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        İptal
                      </button>
                    </div>
                  </form>
                )}

                {/* Yanıtlar (replies) */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 ml-6 space-y-2 border-l-2 border-gray-300 dark:border-gray-700 pl-4">
                    {comment.replies.map((reply) => (
                      <div
                        key={reply.id}
                        id={`cmt-${reply.id}`}
                        className={`flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg p-2 transition-all duration-500 ${
                          highlightId === reply.id ? 'highlighted' : ''
                        }`}
                      >
                        <div className="relative w-5 h-5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                          {reply.author?.avatar ? (
                            <img
                              src={reply.author.avatar}
                              alt={reply.author.username || 'User'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/default.png'
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              {(reply.author?.username || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <span className="font-medium text-[#ff7b00]">@{reply.author?.username || 'Kullanıcı'}</span>{' '}
                              <span>{reply.content}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Beğeni butonu - her zaman görünür */}
                        <div className="flex-shrink-0">
                          <CommentLikeButton
                            commentId={reply.id}
                            initialLiked={reply.isLikedByCurrentUser || false}
                            initialCount={reply.likesCount || 0}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

