'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import api, { getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { containsBadWord } from '@/lib/utils/containsBadWord'
import { AuthGuard } from '@/lib/auth-guard'

function CreateContent() {
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles(selectedFiles)

      // Create previews
      const previewPromises = selectedFiles.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            resolve(e.target?.result as string)
          }
          reader.readAsDataURL(file)
        })
      })

      Promise.all(previewPromises).then((previewUrls) => {
        setPreviews(previewUrls)
      })
    }
  }

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async () => {
      setUploading(true)
      const formData = new FormData()
      
      files.forEach((file) => {
        formData.append('files', file)
      })
      
      if (caption) {
        formData.append('caption', caption)
      }
      
      if (location) {
        formData.append('location', location)
      }

      // Post type ekle - normal gönderi (artwork değil)
      formData.append('type', 'post')

      // Axios automatically sets Content-Type for FormData
      const response = await api.post('/posts/create', formData)
      
      return response.data
    },
    onSuccess: () => {
      router.push('/feed')
    },
    onError: (error: any) => {
      console.error('Error creating post:', error)
      const responseData = error?.response?.data
      const nested = typeof responseData?.message === 'object' ? responseData.message : null
      const errorCode = nested?.code ?? responseData?.code

      if (errorCode === 'LIMIT_REACHED') {
        const errorMessage = nested?.message ?? (typeof responseData?.message === 'string' ? responseData.message : responseData?.error)
        setError(errorMessage ?? 'Bu ayki eser limitinize ulaştınız.')
      } else {
        setError(getErrorMessage(error))
      }
    },
    onSettled: () => {
      setUploading(false)
    },
  })

  // Küfür kontrolü
  const hasBadWord = containsBadWord(caption)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (files.length === 0) {
      setError('Lütfen en az bir fotoğraf veya video seçin')
      return
    }
    if (hasBadWord) {
      setError('Bu içerik Feellink topluluk kurallarına uygun değil.')
      return
    }
    createPostMutation.mutate()
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  if (!accessToken) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Yeni Gönderi Oluştur</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fotoğraf / Video
          </label>
          {previews.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-[#ff7b00] dark:hover:border-[#ff7b00] bg-gray-50 dark:bg-gray-800 transition-colors"
            >
              <p className="text-4xl mb-3">📷</p>
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">Fotoğraf veya video seç</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">En fazla 10 dosya seçebilirsin</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative aspect-square group">
                  {files[index].type.startsWith('video/') ? (
                    <video
                      src={preview}
                      className="w-full h-full object-cover rounded-xl"
                      controls
                    />
                  ) : (
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    disabled={uploading}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {files.length < 10 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center cursor-pointer hover:border-[#ff7b00] dark:hover:border-[#ff7b00] bg-gray-50 dark:bg-gray-800 transition-colors"
                >
                  <span className="text-3xl text-gray-400 dark:text-gray-500">➕</span>
                </div>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </div>

        {/* Caption */}
        <div>
          <label htmlFor="caption" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Açıklama
          </label>
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Açıklama yaz... #hashtag kullanabilirsin"
            rows={4}
            disabled={uploading}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/20 focus:border-[#ff7b00] transition-all resize-none"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Açıklamana #hashtag ekleyerek gönderini kategorize edebilirsin
          </p>
          {hasBadWord && (
            <p className="text-xs text-orange-500 mt-1">
              Bu içerik Feellink topluluk kurallarına uygun değil.
            </p>
          )}
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Konum (opsiyonel)
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Konum ekle..."
            disabled={uploading}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/20 focus:border-[#ff7b00] transition-all"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            disabled={uploading}
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={uploading || files.length === 0 || hasBadWord}
            className="flex-1 px-4 py-3 bg-[#ff7b00] text-white rounded-xl hover:bg-[#e36f00] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Yükleniyor...' : 'Paylaş'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function CreatePage() {
  return (
    <AuthGuard>
      <CreateContent />
    </AuthGuard>
  )
}

