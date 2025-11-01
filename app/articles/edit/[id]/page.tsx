'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import { Upload, X } from 'lucide-react'

function EditArticleContent() {
  const router = useRouter()
  const params = useParams()
  const { accessToken } = useAuthStore()
  const articleId = params.id as string

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [existingCoverImage, setExistingCoverImage] = useState<string | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [scheduledAt, setScheduledAt] = useState<string>('')
  const [existingScheduledAt, setExistingScheduledAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Yazıyı yükle
  useEffect(() => {
    const loadArticle = async () => {
      try {
        const response = await api.get(`/articles/${articleId}`)
        const article = response.data

        setTitle(article.title || '')
        setContent(article.content || '')
        setExcerpt(article.excerpt || '')
        setExistingCoverImage(article.coverImage)
        setIsPublished(article.isPublished || false)
        if (article.scheduledAt) {
          const scheduledDate = new Date(article.scheduledAt)
          setScheduledAt(scheduledDate.toISOString().slice(0, 16))
          setExistingScheduledAt(article.scheduledAt)
        }
      } catch (error: any) {
        console.error('Failed to load article:', error)
        setError('Yazı yüklenirken bir hata oluştu')
      } finally {
        setLoading(false)
      }
    }

    if (articleId) {
      loadArticle()
    }
  }, [articleId])

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setCoverPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeCover = () => {
    setCoverImage(null)
    setCoverPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSave = async (shouldPublish: boolean = false) => {
    setError('')

    if (!title.trim()) {
      setError('Başlık gereklidir')
      return
    }

    if (!content.trim()) {
      setError('İçerik gereklidir')
      return
    }

    setUploading(true)

    try {
      let coverImageUrl: string | undefined = existingCoverImage || undefined

      // Eğer yeni kapak görseli seçildiyse önce yükle
      if (coverImage) {
        const formData = new FormData()
        formData.append('file', coverImage)

        const uploadResponse = await api.post('/media/upload?type=image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        coverImageUrl = uploadResponse.data.url || uploadResponse.data.imageUrl || uploadResponse.data.path
      }

      // Yazıyı güncelle
      await api.put(`/articles/${articleId}`, {
        title: title.trim(),
        content: content.trim(),
        coverImage: coverImageUrl,
        excerpt: excerpt.trim() || content.trim().slice(0, 200) + (content.trim().length > 200 ? '...' : ''),
        scheduledAt: scheduledAt || null,
      })

      // Eğer yayınlanmamışsa ve yayınla seçeneği seçildiyse
      if (shouldPublish && !isPublished) {
        await api.put(`/articles/${articleId}/publish`)
      }

      // Profile yönlendir
      const { useAuthStore } = await import('@/lib/store')
      const username = useAuthStore.getState().user?.username
      router.push(`/profile/${username}`)
    } catch (error: any) {
      console.error('Failed to update article:', error)
      setError(error.response?.data?.message || 'Yazı güncellenirken bir hata oluştu')
    } finally {
      setUploading(false)
    }
  }

  if (!accessToken) {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-900 p-6 md:p-8 transition-colors">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <span>✏️</span>
          Yazıyı Düzenle
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Yazınızı düzenleyip kaydedebilir veya yayınlayabilirsiniz
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Kapak Görseli */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kapak Görseli
            </label>
            {coverPreview || existingCoverImage ? (
              <div className="relative">
                <img
                  src={coverPreview || existingCoverImage || ''}
                  alt="Kapak önizleme"
                  className="w-full h-64 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={removeCover}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:border-[#ff7b00] transition-colors">
                <div className="flex flex-col items-center gap-2">
                  <Upload size={32} className="text-gray-400 dark:text-gray-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Kapak görseli seç (opsiyonel)
                  </span>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Başlık */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Başlık *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Yazının başlığını girin..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] transition-all"
            />
          </div>

          {/* Özet (Opsiyonel) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Özet (Opsiyonel)
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Yazının kısa bir özeti..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] transition-all resize-none"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Boş bırakılırsa içerikten otomatik oluşturulur
            </p>
          </div>

          {/* İçerik */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              İçerik *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Yazının içeriğini buraya yaz..."
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] transition-all resize-none"
            />
          </div>

          {/* Zamanlanmış Yayın (Sadece taslaklar için) */}
          {!isPublished && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🕒 Yayın Zamanı (Opsiyonel)
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] transition-all"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {scheduledAt
                  ? `Yazı ${new Date(scheduledAt).toLocaleString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })} tarihinde otomatik yayınlanacak`
                  : 'Belirli bir tarih ve saatte otomatik yayınlamak için seçin'}
              </p>
            </div>
          )}

          {/* Durum Bilgisi */}
          {isPublished && (
            <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <p className="text-sm text-green-700 dark:text-green-400">
                ✅ Bu yazı yayınlanmış durumda
              </p>
            </div>
          )}

          {!isPublished && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                📝 Bu yazı taslak durumunda
              </p>
            </div>
          )}

          {/* Butonlar */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={uploading}
              className="px-6 py-3 border-2 border-[#ff7b00] text-[#ff7b00] rounded-xl font-medium hover:bg-[#ff7b00]/10 dark:hover:bg-[#ff7b00]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin" />
                  <span>Kaydediliyor...</span>
                </div>
              ) : (
                '💾 Kaydet'
              )}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={uploading}
              className="flex-1 bg-[#ff7b00] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#e36f00] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Kaydediliyor...</span>
                </div>
              ) : (
                `📤 ${isPublished ? 'Güncelle' : 'Kaydet & Yayınla'}`
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              İptal
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EditArticlePage() {
  return (
    <AuthGuard>
      <EditArticleContent />
    </AuthGuard>
  )
}

