'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api, { getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { extractColorsFromFile } from '@/utils/extractColors'
import Slider, { Settings } from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { containsBadWord } from '@/lib/utils/containsBadWord'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  username: string
  userId?: string // Profile user ID for query invalidation
  postType?: 'post' | 'artwork' // Default: 'post'
}

export function CreatePostModal({ isOpen, onClose, username, userId, postType = 'post' }: CreatePostModalProps) {
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [title, setTitle] = useState('') // 🎨 Eser adı (artwork için)
  const [location, setLocation] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [colorPalette, setColorPalette] = useState<string[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sliderRef = useRef<Slider | null>(null)

  // Küfür kontrolü
  const hasBadWord = containsBadWord(caption)

  const createPostMutation = useMutation({
    mutationFn: async () => {
      setUploading(true)
      setError('')
      
      // Küfür kontrolü
      if (hasBadWord) {
        setError('Bu içerik Feellink topluluk kurallarına uygun değil.')
        setUploading(false)
        return
      }
      
      const formData = new FormData()
      
      // Backend her zaman 'files' field name'ini bekliyor (FilesInterceptor('files', 10))
      // Artwork için tek dosya, Post için çoklu dosya - ama field name aynı: 'files'
      files.forEach((file) => {
        formData.append('files', file)
      })
      
      if (caption) {
        formData.append('caption', caption)
      }
      
      // 🎨 Eser adı ekle (artwork için)
      if (title) {
        formData.append('title', title)
      }
      
      // Konum alanı kaldırıldı - artık gönderilmiyor

      // Post type ekle
      formData.append('type', postType)

      // 🎨 Renk paleti ekle
      if (colorPalette.length > 0) {
        formData.append('colorPalette', JSON.stringify(colorPalette))
      }

      const response = await api.post('/posts/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    onSuccess: () => {
      // Reset form
      setFiles([])
      setPreviews([])
      setCaption('')
      setTitle('')
      setLocation('')
      setColorPalette([])
      setCurrentSlide(0)
      setError('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Invalidate queries to refresh posts
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      
      // Invalidate user posts query (critical for profile page)
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['user-posts', userId] })
      }
      
      // Also invalidate by username pattern (fallback)
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      
      // Invalidate profile-posts query for highlights modal
      queryClient.invalidateQueries({ queryKey: ['profile-posts', username] })
      
      // Invalidate user-artworks query for artworks tab
      queryClient.invalidateQueries({ queryKey: ['user-artworks', userId || username] })
      
      // Close modal
      onClose()
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      
      // 🎨 Eser için sadece 1 dosya kontrolü
      if (postType === 'artwork') {
        if (selectedFiles.length > 1) {
          setError('Eser için yalnızca 1 görsel yüklenebilir.')
          e.target.value = '' // Input'u temizle
          return
        }
        if (files.length >= 1) {
          setError('Eser için sadece 1 görsel seçebilirsiniz. Mevcut görseli kaldırmak için üzerindeki ✕ butonuna tıklayın.')
          e.target.value = '' // Input'u temizle
          return
        }
        // Tek dosya - direkt ayarla
        const singleFile = selectedFiles[0]
        setFiles([singleFile])
      } else {
        // 📷 Post için multiple dosya (max 5)
        if (files.length + selectedFiles.length > 5) {
          setError('En fazla 5 görsel yükleyebilirsiniz.')
          e.target.value = '' // Input'u temizle
          return
        }
        
        const newFiles = [...files, ...selectedFiles].slice(0, 5) // Max 5 files
        setFiles(newFiles)
      }
      
      // Create previews - Artwork ve Post için ayrı işlem
      if (postType === 'artwork') {
        // 🎨 Eser için tek dosya preview
        const singleFile = selectedFiles[0]
        const reader = new FileReader()
        reader.onload = (event) => {
          setPreviews([event.target?.result as string])
        }
        reader.readAsDataURL(singleFile)
        
        // Renk analizi - ilk görsel için
        if (singleFile.type.startsWith('image/')) {
          try {
            const colors = await extractColorsFromFile(singleFile)
            setColorPalette(colors)
          } catch (err) {
            console.error('Renk analizi hatası:', err)
            setColorPalette([])
          }
        }
      } else {
        // 📷 Post için çoklu dosya preview
        const newFiles = [...files, ...selectedFiles].slice(0, 5)
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

        // 🎨 Renk analizi - ilk görsel için
        if (selectedFiles.length > 0 && selectedFiles[0].type.startsWith('image/')) {
          try {
            const colors = await extractColorsFromFile(selectedFiles[0])
            setColorPalette(colors)
          } catch (err) {
            console.error('Renk analizi hatası:', err)
            setColorPalette([])
          }
        }
      }
      
      // Input'u temizle
      e.target.value = ''
    }
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    setFiles(newFiles)
    setPreviews(newPreviews)
    
    // Eğer silinen görsel aktif slide ise, yeni aktif slide'ı ayarla
    if (index === currentSlide && newPreviews.length > 0) {
      // Son görsel silindiyse, bir öncekine geç
      const newCurrentSlide = index >= newPreviews.length ? newPreviews.length - 1 : currentSlide
      setCurrentSlide(newCurrentSlide)
      if (sliderRef.current) {
        sliderRef.current.slickGoTo(newCurrentSlide)
      }
    } else if (newPreviews.length === 0) {
      setCurrentSlide(0)
    }
    
    // Renk paletini yeniden hesapla (ilk görsel varsa)
    if (newFiles.length > 0 && newFiles[0].type.startsWith('image/')) {
      extractColorsFromFile(newFiles[0]).then((colors) => {
        setColorPalette(colors)
      }).catch(() => {
        setColorPalette([])
      })
    } else {
      setColorPalette([])
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || postType === 'artwork') {
      return // Eser için drag & drop yok
    }

    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index

    if (sourceIndex === destinationIndex) {
      return // Aynı yere bırakıldı, değişiklik yok
    }

    // Files ve previews dizilerini yeniden sırala
    const newFiles = Array.from(files)
    const newPreviews = Array.from(previews)

    const [movedFile] = newFiles.splice(sourceIndex, 1)
    const [movedPreview] = newPreviews.splice(sourceIndex, 1)

    newFiles.splice(destinationIndex, 0, movedFile)
    newPreviews.splice(destinationIndex, 0, movedPreview)

    setFiles(newFiles)
    setPreviews(newPreviews)

    // Eğer aktif slide değiştirildiyse, yeni pozisyona git
    if (currentSlide === sourceIndex) {
      setCurrentSlide(destinationIndex)
      if (sliderRef.current) {
        sliderRef.current.slickGoTo(destinationIndex)
      }
    } else if (sourceIndex < currentSlide && destinationIndex >= currentSlide) {
      // Soldan sağa taşındı, current slide bir geri
      setCurrentSlide(currentSlide - 1)
    } else if (sourceIndex > currentSlide && destinationIndex <= currentSlide) {
      // Sağdan sola taşındı, current slide bir ileri
      setCurrentSlide(currentSlide + 1)
    }
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
    setTitle('')
    setLocation('')
    setColorPalette([])
    setCurrentSlide(0)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    // Slider'ı temizle - overlay sorununu önlemek için
    if (sliderRef.current) {
      sliderRef.current.slickGoTo(0)
    }
    onClose()
  }

  // Modal kapandığında slider overlay'lerini temizle
  useEffect(() => {
    if (!isOpen) {
      // Modal kapandığında slider'ı sıfırla
      setCurrentSlide(0)
      // Slider overlay'lerini DOM'dan temizle
      const slickOverlays = document.querySelectorAll('.slick-slider:not(.slick-custom)')
      slickOverlays.forEach((overlay) => {
        const element = overlay as HTMLElement
        if (element.style && element.style.pointerEvents === 'auto') {
          element.style.pointerEvents = 'none'
        }
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-[#101014] dark:bg-[#0f0f0f] w-full max-w-[550px] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modern Gradient Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#1b1b1f] to-[#232329] dark:from-[#1a1a1a] dark:to-[#222222] flex items-center justify-between border-b border-gray-800 dark:border-gray-700">
          <h2 className="text-white text-lg font-semibold">Yeni Gönderi Oluştur</h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-gray-400 hover:text-white text-xl leading-none disabled:opacity-50 transition-colors p-1 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Content - DragDropContext ile sarmalanmış (sadece post için çalışır) */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <form onSubmit={handleSubmit} className="px-5 pt-6 pb-5 space-y-5">
            {/* File Upload */}
            <div>
              {previews.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 border border-gray-700 dark:border-gray-600 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-[#18181d] dark:hover:bg-gray-800/50 transition-colors"
                >
                  <p className="text-4xl mb-3 opacity-60">📷</p>
                  <p className="text-gray-300 dark:text-gray-300 text-sm font-medium mb-1">Fotoğraf veya video seç</p>
                  <span className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                    {postType === 'artwork' 
                      ? 'Eser için 1 görsel seçebilirsin' 
                      : 'En fazla 5 görsel seçebilirsin'}
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                {/* 🎨 Eser için: Sadece tek görsel, slider ve thumbnail yok */}
                {postType === 'artwork' ? (
                  <div className="relative bg-[#151519] dark:bg-gray-800 rounded-xl overflow-hidden">
                    <div className="relative aspect-square">
                      {files[0]?.type.startsWith('video/') ? (
                        <video
                          src={previews[0]}
                          className="w-full h-full object-contain bg-black rounded-xl"
                          controls
                        />
                      ) : (
                        <img
                          src={previews[0]}
                          alt="Preview"
                          className="w-full h-full object-contain bg-black rounded-xl"
                        />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(0)
                        }}
                        disabled={uploading}
                        className="absolute top-3 right-3 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 disabled:opacity-50 transition-colors shadow-lg z-10"
                        title="Kaldır"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 📷 Post için: Çoklu görsel, slider ve thumbnail var */
                  <>
                    {/* Instagram benzeri carousel - Ana önizleme (çoklu görsel için) */}
                    {previews.length > 1 ? (
                      <div className="relative w-full overflow-hidden [&_.slick-slider]:pointer-events-auto bg-[#151519] dark:bg-gray-800 rounded-xl">
                        <Slider
                          ref={sliderRef}
                          dots={true}
                          infinite={false}
                          speed={300}
                          slidesToShow={1}
                          slidesToScroll={1}
                          arrows={true}
                          className="slick-custom"
                          swipe={true}
                          touchMove={true}
                          beforeChange={(current, next) => setCurrentSlide(next)}
                        >
                          {previews.map((preview, index) => (
                            <div key={index} className="relative aspect-square pointer-events-auto">
                              {files[index].type.startsWith('video/') ? (
                                <video
                                  src={preview}
                                  className="w-full h-full object-contain bg-black rounded-xl"
                                  controls
                                />
                              ) : (
                                <img
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-full object-contain bg-black rounded-xl"
                                />
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeFile(index)
                                }}
                                disabled={uploading}
                                className="absolute top-3 right-3 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 disabled:opacity-50 transition-colors shadow-lg z-10 pointer-events-auto"
                                title="Kaldır"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </Slider>
                      </div>
                    ) : (
                      /* Tek görsel - Carousel yok */
                      <div className="relative bg-[#151519] dark:bg-gray-800 rounded-xl overflow-hidden">
                        <div className="relative aspect-square">
                          {files[0].type.startsWith('video/') ? (
                            <video
                              src={previews[0]}
                              className="w-full h-full object-contain bg-black rounded-xl"
                              controls
                            />
                          ) : (
                            <img
                              src={previews[0]}
                              alt="Preview"
                              className="w-full h-full object-contain bg-black rounded-xl"
                            />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFile(0)
                            }}
                            disabled={uploading}
                            className="absolute top-3 right-3 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 disabled:opacity-50 transition-colors shadow-lg z-10"
                            title="Kaldır"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Thumbnail önizlemeleri - Drag & Drop ile sıralama (sadece post için, 1'den fazla görsel varsa) */}
                    {previews.length > 1 && (
                      <Droppable droppableId="thumbnails" direction="horizontal">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex gap-2 justify-center overflow-x-auto pb-2 ${
                              snapshot.isDraggingOver ? 'bg-[#18181d]/30 rounded-lg' : ''
                            }`}
                          >
                            {previews.map((preview, index) => {
                              // Unique ID oluştur - file name, size ve index kombinasyonu
                              const uniqueId = `thumb-${index}-${files[index]?.name || 'file'}-${files[index]?.size || 0}`
                              return (
                                <Draggable
                                  key={uniqueId}
                                  draggableId={uniqueId}
                                  index={index}
                                >
                                  {(providedDrag, snapshotDrag) => (
                                    <div
                                      ref={providedDrag.innerRef}
                                      {...providedDrag.draggableProps}
                                      {...providedDrag.dragHandleProps}
                                      className={`flex-shrink-0 relative ${
                                        snapshotDrag.isDragging ? 'opacity-50 z-[100]' : 'z-auto'
                                      }`}
                                      style={providedDrag.draggableProps.style}
                                    >
                                      <div
                                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                                          currentSlide === index
                                            ? 'border-brand-orange ring-2 ring-brand-orange/30'
                                            : 'border-gray-700 hover:border-brand-orange/50'
                                        } ${snapshotDrag.isDragging ? 'shadow-2xl scale-110' : 'shadow-lg'}`}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (sliderRef.current && !snapshotDrag.isDragging) {
                                            sliderRef.current.slickGoTo(index)
                                          }
                                        }}
                                      >
                                        {files[index].type.startsWith('video/') ? (
                                          <video
                                            src={preview}
                                            className="w-full h-full object-cover pointer-events-none"
                                            muted
                                          />
                                        ) : (
                                          <img
                                            src={preview}
                                            alt={`Thumbnail ${index + 1}`}
                                            className="w-full h-full object-cover pointer-events-none"
                                          />
                                        )}
                                      </div>
                                      {/* Silme butonu - Drag handle dışında, tıklamayı engellemez */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          e.preventDefault()
                                          removeFile(index)
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation()
                                        }}
                                        disabled={uploading}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50 transition-colors shadow-lg z-20 pointer-events-auto"
                                        title="Kaldır"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  )}
                                </Draggable>
                              )
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    )}

                    {/* Görsel ekleme butonu - 5'ten az varsa göster (sadece post için) */}
                    {files.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border border-dashed border-gray-700 dark:border-gray-600 rounded-xl py-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-[#18181d] dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <span className="text-xl text-gray-400">➕</span>
                        <span className="text-sm text-gray-400 dark:text-gray-400">
                          Daha fazla görsel ekle ({files.length}/5)
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple={postType !== 'artwork'} // 🎨 Eser için multiple=false, Post için multiple=true
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
          </div>

          {/* Eser Adı (sadece artwork için) */}
          {postType === 'artwork' && (
            <div>
              <label htmlFor="title" className="block text-gray-300 dark:text-gray-300 text-sm mb-2">
                Eser Adı <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Eserinizin adını girin"
                required
                disabled={uploading}
                className="w-full mt-2 bg-[#151519] dark:bg-gray-800 text-gray-200 dark:text-gray-200 rounded-xl px-4 py-3 border border-gray-700 dark:border-gray-600 focus:border-brand-orange focus:outline-none resize-none placeholder-gray-500 transition-all"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Eserinizi tanımlayan bir ad girin
              </p>
            </div>
          )}

          {/* Caption */}
          <div>
            <label htmlFor="caption" className="block text-gray-300 dark:text-gray-300 text-sm mb-2">
              Açıklama
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Açıklama yaz... #hashtag kullanabilirsin"
              rows={4}
              disabled={uploading}
              className="w-full mt-2 bg-[#151519] dark:bg-gray-800 text-gray-200 dark:text-gray-200 rounded-xl px-4 py-3 border border-gray-700 dark:border-gray-600 focus:border-brand-orange focus:outline-none resize-none placeholder-gray-500 transition-all"
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

          {/* Konum alanı kaldırıldı */}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 dark:bg-red-900/20 border border-red-800 dark:border-red-800 text-red-400 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Premium Buttons */}
          <div className="flex justify-between pt-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="px-6 py-2 rounded-xl bg-gray-700 dark:bg-gray-700 text-gray-200 dark:text-gray-200 hover:bg-gray-600 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={uploading || files.length === 0 || hasBadWord}
              className="px-8 py-2 rounded-xl bg-brand-orange text-white font-semibold hover:bg-[#e67a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Yükleniyor...' : 'Paylaş'}
            </button>
          </div>
        </form>
        </DragDropContext>
      </div>
    </div>
  )
}


