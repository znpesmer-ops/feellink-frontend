'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import { Upload, X, Calendar } from 'lucide-react'
import ArticleImageCropper from '@/components/articles/ArticleImageCropper'
import RichTextEditor from '@/components/articles/RichTextEditor'

function NewArticleContent() {
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [excerpt, setExcerpt] = useState('')
  const [scheduledAt, setScheduledAt] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [tempImage, setTempImage] = useState<string | null>(null)

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Önce geçici görsel oluştur ve crop modalını aç
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
    // Cropped blob'u File'a çevir
    const file = new File([croppedBlob], 'cover-image.jpg', { type: 'image/jpeg' })
    setCoverImage(file)
    
    // Preview oluştur
    const reader = new FileReader()
    reader.onload = (e) => {
      setCoverPreview(e.target?.result as string)
    }
    reader.readAsDataURL(croppedBlob)
    
    setShowCropper(false)
    setTempImage(null)
    
    // File input'u temizle
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
    setCoverPreview(null)
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

      // Eğer kapak görseli seçildiyse önce yükle
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

      // Yazıyı oluştur ve yayınla
      const publishPayload: any = {
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() || content.trim().slice(0, 200) + (content.trim().length > 200 ? '...' : ''),
        publish: true,
      }
      if (coverImageUrl) publishPayload.coverImage = coverImageUrl
      if (scheduledAt) publishPayload.scheduledAt = scheduledAt
      await api.post('/articles', publishPayload)

      const { useAuthStore } = await import('@/lib/store')
      const username = useAuthStore.getState().user?.username
      router.push(`/profile/${username}`)
    } catch (error: any) {
      console.error('Failed to create article:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Yazı oluşturulurken bir hata oluştu'
      setError(errorMessage)
      
      // 401 Unauthorized hatası için refresh token dene veya login sayfasına yönlendir
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

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-900 p-6 md:p-8 transition-colors">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Yeni Yazı Oluştur
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Düşüncelerini, deneyimlerini veya bilgilerini paylaş
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

          {/* İçerik - Rich Text Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              İçerik *
            </label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Yazının içeriğini buraya yaz..."
            />
          </div>

          {/* Zamanlanmış Yayın */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Yayın Zamanı (Opsiyonel)
            </label>
            <div className="relative flex items-center bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 shadow-sm hover:shadow-md hover:border-[#ff7b00]/50 transition-all focus-within:ring-2 focus-within:ring-[#ff7b00] focus-within:border-[#ff7b00]">
              {/* Takvim ikonu */}
              <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              
              {/* Tarih-saat inputu */}
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                placeholder="Tarih ve saat seçin"
                className="ml-3 w-full bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              {scheduledAt
                ? `Yazı ${new Date(scheduledAt).toLocaleString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })} tarihinde otomatik yayınlanacak`
                : 'Belirli bir tarih ve saatte otomatik yayınlanması için seçin'}
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
                  }
                  const payload: any = {
                    title: title.trim(),
                    content: content.trim(),
                    excerpt: excerpt.trim() || content.trim().slice(0, 200) + (content.trim().length > 200 ? '...' : ''),
                    publish: false,
                  }
                  if (coverImageUrl) payload.coverImage = coverImageUrl
                  if (scheduledAt) payload.scheduledAt = scheduledAt
                  await api.post('/articles', payload)
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
            {scheduledAt && (
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
                  if (!scheduledAt) {
                    setError('Yayın zamanı seçmelisiniz')
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
                    }
                    const schedulePayload: any = {
                      title: title.trim(),
                      content: content.trim(),
                      excerpt: excerpt.trim() || content.trim().slice(0, 200) + (content.trim().length > 200 ? '...' : ''),
                      publish: false, // Zamanlanmış yazılar henüz yayınlanmamalı
                      scheduledAt: scheduledAt,
                    }
                    if (coverImageUrl) schedulePayload.coverImage = coverImageUrl
                    await api.post('/articles', schedulePayload)
                    const { useAuthStore } = await import('@/lib/store')
                    const username = useAuthStore.getState().user?.username
                    router.push(`/profile/${username}`)
                  } catch (error: any) {
                    console.error('Failed to schedule article:', error)
                    const errorMessage = error?.response?.data?.message || error?.message || 'Yazı zamanlanırken bir hata oluştu'
                    setError(errorMessage)
                  } finally {
                    setUploading(false)
                  }
                }}
                disabled={uploading || !scheduledAt}
                className="px-6 py-3 rounded-xl bg-[#ff7b00] text-white font-semibold hover:bg-[#e36f00] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Zamanlanıyor...</span>
                  </div>
                ) : (
                  'Zamanla ve Kaydet'
                )}
              </button>
            )}
            <button
              type="submit"
              disabled={uploading || !!scheduledAt}
              className="flex-1 px-6 py-3 rounded-xl bg-[#ff7b00] text-white font-semibold hover:bg-[#e36f00] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Yayınlanıyor...</span>
                </div>
              ) : (
                'Hemen Yayınla'
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

export default function NewArticlePage() {
  return (
    <AuthGuard>
      <NewArticleContent />
    </AuthGuard>
  )
}

