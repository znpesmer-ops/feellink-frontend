'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  username: string
}

export function CreatePostModal({ isOpen, onClose, username }: CreatePostModalProps) {
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createPostMutation = useMutation({
    mutationFn: async () => {
      setUploading(true)
      setError('')
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

      const response = await api.post('/posts/create', formData)
      return response.data
    },
    onSuccess: () => {
      // Reset form
      setFiles([])
      setPreviews([])
      setCaption('')
      setLocation('')
      setError('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Invalidate profile query to refresh posts
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      
      // Close modal
      onClose()
    },
    onError: (error: any) => {
      console.error('Error creating post:', error)
      const responseData = error?.response?.data
      const nested = typeof responseData?.message === 'object' ? responseData.message : null
      const errorCode = nested?.code ?? responseData?.code
      const errorMessage =
        nested?.message ?? (typeof responseData?.message === 'string' ? responseData.message : responseData?.error)

      if (errorCode === 'LIMIT_REACHED') {
        setError(errorMessage ?? 'Bu ayki eser limitinize ulaştınız.')
      } else {
        setError(errorMessage || 'Gönderi oluşturulurken bir hata oluştu')
      }
    },
    onSettled: () => {
      setUploading(false)
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      const newFiles = [...files, ...selectedFiles].slice(0, 10) // Max 10 files
      setFiles(newFiles)

      // Create previews
      const previewPromises = newFiles.map((file) => {
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

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (files.length === 0) {
      setError('Lütfen en az bir fotoğraf veya video seçin')
      return
    }
    createPostMutation.mutate()
  }

  const handleClose = () => {
    if (uploading) return
    setFiles([])
    setPreviews([])
    setCaption('')
    setLocation('')
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-lg rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-all shadow-2xl border border-gray-200/50 dark:border-gray-700/50 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Yeni Gönderi Oluştur</h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none disabled:opacity-50 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* File Upload */}
          <div>
            {previews.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-[#ff7b00] dark:hover:border-[#ff7b00] bg-gray-50 dark:bg-gray-700 transition-colors"
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
                      disabled={uploading}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {files.length < 10 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center cursor-pointer hover:border-[#ff7b00] dark:hover:border-[#ff7b00] bg-gray-50 dark:bg-gray-700 transition-colors"
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
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              disabled={uploading}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={uploading || files.length === 0}
              className="flex-1 px-4 py-3 bg-[#ff7b00] text-white rounded-xl hover:bg-[#e36f00] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              {uploading ? 'Yükleniyor...' : 'Paylaş'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


