'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import { Upload, X } from 'lucide-react'
import ArticleImageCropper from '@/components/articles/ArticleImageCropper'

function EditArticleContent() {
  const params = useParams()
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const articleId = Array.isArray(params.id) ? params.id[0] : params.id
  
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [excerpt, setExcerpt] = useState('')
  const [scheduledAt, setScheduledAt] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [tempImage, setTempImage] = useState<string | null>(null)
  const [originalCoverImage, setOriginalCoverImage] = useState<string | null>(null)

  // ✅ Yazı verilerini yükle (edit modunda)
  useEffect(() => {
    if (!articleId) {
      setLoading(false)
      return
    }

    const loadArticle = async () => {
      try {
        const response = await api.get(`/articles/${articleId}`)
        const article = response.data
        
        setTitle(article.title || '')
        setContent(article.content || '')
        setExcerpt(article.excerpt || '')
        setScheduledAt(article.scheduledAt || '')
        
        if (article.coverImage) {
          setOriginalCoverImage(article.coverImage)
          setCoverPreview(article.coverImage)
        }
      } catch (error: any) {
        console.error('Failed to load article:', error)
        setError('Yazı yüklenirken bir hata oluştu')
        router.push('/feed')
      } finally {
        setLoading(false)
      }
    }

    loadArticle()
  }, [articleId, router])

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setTempImage(imageUrl)
        setShowCropper(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCropDone = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'cover-image.jpg', { type: 'image/jpeg' })
    setCoverImage(file)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      setCoverPreview(e.target?.result as string)
    }
    reader.readAsDataURL(croppedBlob)
    
    setShowCropper(false)
    setTempImage(null)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    setTempImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeCover = () => {
    setCoverImage(null)
    setCoverPreview(originalCoverImage)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      let coverImageUrl: string | undefined = undefined

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
      } else if (originalCoverImage) {
        // Eğer yeni görsel yoksa eski görseli kullan
        coverImageUrl = originalCoverImage
      }

      // Yazıyı güncelle
      const updatePayload: any = {
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() || content.trim().slice(0, 200) + (content.trim().length > 200 ? '...' : ''),
        publish: true,
      }
      if (coverImageUrl) updatePayload.coverImage = coverImageUrl
      if (scheduledAt) updatePayload.scheduledAt = scheduledAt
      
      await api.put(`/articles/${articleId}`, updatePayload)

      const { useAuthStore } = await import('@/lib/store')
      const username = useAuthStore.getState().user?.username
      router.push(`/articles/${articleId}`)
    } catch (error: any) {
      console.error('Failed to update article:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Yazı güncellenirken bir hata oluştu'
      setError(errorMessage)
      
      if (error?.response?.status === 401) {
        console.error('Authentication error, token may be expired')
      }
    } finally {
      setUploading(false)
    }
  }

  if (!accessToken) {
    return null
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7b00]"></div>
        </div>
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
          Yazını düzenle ve güncelle
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Kapak Görseli */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kapak Görseli (Opsiyonel)
            </label>
            {coverPreview ? (
              <div className="relative">
                <img
                  src={coverPreview}
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

          {/* Zamanlanmış Yayın */}
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

          {/* Butonlar */}
          <div className="flex flex-wrap items-center gap-4 pt-6">
            <button
              type="button"
              onClick={async () => {
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
                  let coverImageUrl: string | undefined = undefined
                  if (coverImage) {
                    const formData = new FormData()
                    formData.append('file', coverImage)
                    const uploadResponse = await api.post('/media/upload?type=image', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    })
                    coverImageUrl = uploadResponse.data.url || uploadResponse.data.imageUrl || uploadResponse.data.path
                  } else if (originalCoverImage) {
                    coverImageUrl = originalCoverImage
                  }
                  const payload: any = {
                    title: title.trim(),
                    content: content.trim(),
                    excerpt: excerpt.trim() || content.trim().slice(0, 200) + (content.trim().length > 200 ? '...' : ''),
                    publish: false,
                  }
                  if (coverImageUrl) payload.coverImage = coverImageUrl
                  if (scheduledAt) payload.scheduledAt = scheduledAt
                  await api.put(`/articles/${articleId}`, payload)
                  const { useAuthStore } = await import('@/lib/store')
                  const username = useAuthStore.getState().user?.username
                  router.push(`/profile/${username}`)
                } catch (error: any) {
                  console.error('Failed to save draft:', error)
                  const errorMessage = error?.response?.data?.message || error?.message || 'Taslak kaydedilirken bir hata oluştu'
                  setError(errorMessage)
                } finally {
                  setUploading(false)
                }
              }}
              disabled={uploading}
              className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span>Kaydediliyor...</span>
                </div>
              ) : (
                'Taslak Olarak Kaydet'
              )}
            </button>
            <button
              type="submit"
              disabled={uploading || !!scheduledAt}
              className="flex-1 px-6 py-3 rounded-xl bg-[#ff7b00] text-white font-semibold hover:bg-[#e36f00] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Güncelleniyor...</span>
                </div>
              ) : (
                'Düzenlemeyi Kaydet'
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
            >
              İptal
            </button>
          </div>
        </form>
      </div>

      {/* Crop Modal */}
      {showCropper && tempImage && (
        <ArticleImageCropper
          image={tempImage}
          onCropDone={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}
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
