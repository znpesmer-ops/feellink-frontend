'use client'

import { useState, useRef } from 'react'
import { X, Loader2, AlertCircle, Upload, File } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface ApplyModalProps {
  jobListingId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ApplyModal({ jobListingId, open, onClose, onSuccess }: ApplyModalProps) {
  const [coverLetter, setCoverLetter] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null)
  const [portfolioFileUrl, setPortfolioFileUrl] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Dosya tipi kontrolü - Portfolyo ve CV için tüm formatlar
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ]
    if (!allowedTypes.includes(file.type)) {
      setError('Sadece PDF, DOC/DOCX, JPG veya PNG formatında dosya yükleyebilirsiniz.')
      return
    }

    // Dosya boyutu kontrolü (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Dosya boyutu 10MB\'dan küçük olmalıdır.')
      return
    }

    // Link alanını temizle (dosya yüklendiğinde link devre dışı)
    setPortfolioUrl('')
    setPortfolioFile(file)
    setError(null)
    setUploadingFile(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      // Dosya tipine göre klasör seç
      const isDocument = file.type.includes('pdf') || file.type.includes('word') || file.type.includes('document')
      const uploadType = isDocument ? 'cv' : 'portfolio'
      
      const response = await api.post(`/media/upload?type=${uploadType}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setPortfolioFileUrl(response.data.url)
      toast.success('Dosya yüklendi')
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Dosya yüklenemedi')
      setPortfolioFile(null)
    } finally {
      setUploadingFile(false)
    }
  }

  // Link yazıldığında dosya upload'ı temizle
  const handlePortfolioUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPortfolioUrl(value)
    
    // Link yazılmaya başlandığında dosya temizle
    if (value.length > 0 && portfolioFile) {
      setPortfolioFile(null)
      setPortfolioFileUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation: Artık opsiyonel - hiçbiri zorunlu değil

    try {
      // Payload hazırlama: Link VEYA dosya (ikisi aynı anda değil)
      const payload: any = {
        coverLetter: coverLetter.trim() || undefined,
      }

      // Portfolyo / CV: Link veya dosya (sadece biri)
      if (portfolioUrl.trim() && !portfolioFileUrl) {
        // Sadece link varsa - URL formatında olmalı
        const trimmedUrl = portfolioUrl.trim()
        if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
          payload.portfolioUrl = trimmedUrl
        } else {
          // Protocol yoksa ekle
          payload.portfolioUrl = `https://${trimmedUrl}`
        }
      } else if (portfolioFileUrl && !portfolioUrl.trim()) {
        // Sadece dosya varsa - upload sonrası URL zaten geçerli
        // Dosya tipine göre portfolioFileUrl veya cvUrl gönder
        const isDocument = portfolioFile?.type.includes('pdf') || 
                          portfolioFile?.type.includes('word') || 
                          portfolioFile?.type.includes('document')
        
        if (isDocument) {
          // CV dosyası - geçerli URL olduğundan emin ol
          if (portfolioFileUrl && typeof portfolioFileUrl === 'string' && portfolioFileUrl.length > 0) {
            payload.cvUrl = portfolioFileUrl
          }
        } else {
          // Portfolyo görseli
          if (portfolioFileUrl && typeof portfolioFileUrl === 'string' && portfolioFileUrl.length > 0) {
            payload.portfolioFileUrl = portfolioFileUrl
          }
        }
      }

      await api.post(`/jobs/${jobListingId}/applications`, payload)
      
      // Profesyonel başarı mesajı
      toast.success('Başvurunuz alındı. Başvurunuz başarıyla iletildi. İlan sahibi başvurunuzu incelediğinde durum güncellenecektir.', {
        duration: 4000,
      })
      
      onSuccess?.()
      onClose()
      // Reset form
      setCoverLetter('')
      setPortfolioUrl('')
      setPortfolioFile(null)
      setPortfolioFileUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Başvuru gönderilemedi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 w-full max-w-md shadow-lg border border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">İlana Başvur</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Başvuru Mesajı <span className="text-gray-400">(opsiyonel)</span>
            </label>
            <textarea
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/30 focus:border-[#ff7b00] dark:bg-gray-900 dark:text-gray-100"
              placeholder="Kısaca kendinden ve neden başvurduğundan bahset..."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              maxLength={1000}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-400">{coverLetter.length}/1000</p>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/60 p-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Portfolyo / CV <span className="text-gray-400">(opsiyonel)</span>
            </label>
            
            <div className="space-y-3">
              {/* Link alanı */}
              <div>
                <input
                  type="url"
                  className={`w-full border border-gray-200 dark:border-neutral-700 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/30 focus:border-[#ff7b00] dark:bg-neutral-800 dark:text-gray-100 ${
                    portfolioFileUrl ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''
                  }`}
                  placeholder="Behance, Drive linki ekleyebilir veya dosya yükleyebilirsiniz"
                  value={portfolioUrl}
                  onChange={handlePortfolioUrlChange}
                  disabled={loading || uploadingFile || !!portfolioFileUrl}
                />
                {portfolioFileUrl && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Dosya yüklendi, link alanı devre dışı
                  </p>
                )}
              </div>

              <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-1">
                — veya —
              </div>

              {/* Tek dosya upload alanı - Portfolyo ve CV için */}
              <div>
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    disabled={loading || uploadingFile || !!portfolioUrl.trim()}
                    className="hidden"
                    id="portfolio-cv-file"
                  />
                  <label
                    htmlFor="portfolio-cv-file"
                    className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-lg p-3 text-sm cursor-pointer transition hover:border-[#ff7b00] hover:bg-[#ff7b00]/5 ${
                      loading || uploadingFile || !!portfolioUrl.trim() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {uploadingFile ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-[#ff7b00]" />
                        <span className="text-gray-600 dark:text-gray-400">Yükleniyor...</span>
                      </>
                    ) : portfolioFile ? (
                      <>
                        <File className="h-4 w-4 text-[#ff7b00]" />
                        <span className="text-gray-700 dark:text-gray-300 text-xs">{portfolioFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPortfolioFile(null)
                            setPortfolioFileUrl(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          className="ml-auto text-red-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400 text-xs">Dosya Yükle: PDF, DOC/DOCX, JPG veya PNG (max 10MB)</span>
                      </>
                    )}
                  </label>
                </div>
                {portfolioUrl.trim() && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Link girildi, dosya yükleme devre dışı
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
              Link ekleyebilir veya dosya yükleyebilirsiniz. İkisi aynı anda kullanılamaz.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
              onClick={onClose}
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[#FF8A00] text-white shadow-sm hover:bg-[#e67a00] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}











