'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { CreateHighlightModal } from './CreateHighlightModal'
import { HighlightDetailModal } from './HighlightDetailModal'
import { RenameHighlightModal } from './RenameHighlightModal'
import { AddArtworkToHighlightModal } from './AddArtworkToHighlightModal'
import { DeleteHighlightModal } from './DeleteHighlightModal'
import { MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'

interface Highlight {
  id: string
  title: string
  coverPost: {
    imageUrl: string | null
  } | null
  items: Array<{
    id: string
    post: {
      id: string
      imageUrl: string | null
      caption: string | null
    }
  }>
}

interface ArtistHighlightsProps {
  username: string
  userId?: string // Kullanıcı ID'si (eserleri çekmek için)
  isOwnProfile?: boolean
}

export function ArtistHighlights({ username, userId, isOwnProfile = false }: ArtistHighlightsProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [showRenameModal, setShowRenameModal] = useState<Highlight | null>(null)
  const [showAddArtworkModal, setShowAddArtworkModal] = useState<Highlight | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<Highlight | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const queryClient = useQueryClient()
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})
  const carouselRef = useRef<HTMLDivElement>(null)

  // Menü dışına tıklama ile kapatma
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen) {
        const menuElement = menuRefs.current[menuOpen]
        const buttonElement = buttonRefs.current[menuOpen]
        if (
          menuElement &&
          !menuElement.contains(event.target as Node) &&
          buttonElement &&
          !buttonElement.contains(event.target as Node)
        ) {
          setMenuOpen(null)
          setMenuPosition(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [menuOpen])

  // Desktop drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!carouselRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - carouselRef.current.offsetLeft)
    setScrollLeft(carouselRef.current.scrollLeft)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !carouselRef.current) return
    e.preventDefault()
    const x = e.pageX - carouselRef.current.offsetLeft
    const walk = (x - startX) * 2 // Scroll speed multiplier
    carouselRef.current.scrollLeft = scrollLeft - walk
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  // Arrow navigation
  const scrollLeftHandler = () => {
    if (!carouselRef.current) return
    const cardWidth = 128 + 12 // w-32 (128px) + gap-3 (12px)
    carouselRef.current.scrollBy({ left: -cardWidth * 3, behavior: 'smooth' })
  }

  const scrollRightHandler = () => {
    if (!carouselRef.current) return
    const cardWidth = 128 + 12 // w-32 (128px) + gap-3 (12px)
    carouselRef.current.scrollBy({ left: cardWidth * 3, behavior: 'smooth' })
  }

  const { data: highlights, isLoading, isRefetching } = useQuery({
    queryKey: ['highlights', username],
    queryFn: async () => {
      try {
        const response = await api.get(`/highlights/${username}`)
        // API'den gelen data her zaman array olmalı
        const data = response.data
        return Array.isArray(data) ? data : []
      } catch (error) {
        console.error('Highlights yüklenemedi:', error)
        return []
      }
    },
    enabled: !!username,
    // Stale data'yı göster (refetch sırasında highlights kaybolmasın)
    placeholderData: (previousData) => previousData, // React Query v5
    staleTime: 0, // Her zaman fresh data iste
  })

  // highlights her zaman array olmalı
  const highlightsArray = Array.isArray(highlights) ? highlights : []

  // Carousel scroll kontrolü ve arrow visibility
  useEffect(() => {
    const carousel = carouselRef.current
    if (!carousel) return

    const updateArrowVisibility = () => {
      const { scrollLeft, scrollWidth, clientWidth } = carousel
      setShowLeftArrow(scrollLeft > 0)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10) // 10px tolerance
    }

    updateArrowVisibility()
    carousel.addEventListener('scroll', updateArrowVisibility)
    return () => carousel.removeEventListener('scroll', updateArrowVisibility)
  }, [highlightsArray])

  // İlk yükleme sırasında null döndür (stale data yoksa)
  if (isLoading && !highlights) return null
  if (!highlightsArray || highlightsArray.length === 0) {
    // Sadece kendi profilimizde "Yeni Tema" butonu göster
    if (!isOwnProfile) return null
    
    return (
      <div className="w-full mb-6">
        <h3 className="text-sm text-neutral-400 mb-2 dark:text-neutral-500">Öne Çıkan Temalar</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-shrink-0 w-32 h-40 rounded-2xl border border-dashed border-neutral-700 dark:border-neutral-600 text-neutral-400 dark:text-neutral-500 hover:border-orange-500 hover:text-orange-400 dark:hover:border-orange-500 dark:hover:text-orange-400 flex flex-col items-center justify-center gap-2 transition-colors"
          >
            <span className="text-2xl">＋</span>
            <span className="text-xs font-medium text-center">Yeni Tema</span>
          </button>
        </div>

        {showCreateModal && (
          <CreateHighlightModal
            username={username}
            userId={userId}
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="w-full mb-6 relative group" onMouseEnter={() => {}}>
      <h3 className="text-sm text-neutral-400 mb-2 dark:text-neutral-500">Öne Çıkan Temalar</h3>
      {/* Carousel Container with snap scroll */}
      <div className="relative">
        {/* Left Arrow - Desktop only, hover visible */}
        {showLeftArrow && (
          <button
            onClick={scrollLeftHandler}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-black/60 dark:bg-black/80 backdrop-blur-sm text-white hover:bg-black/80 dark:hover:bg-black/90 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
            aria-label="Önceki"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Carousel */}
        <div
          ref={carouselRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="flex gap-3 overflow-x-auto overflow-y-visible pb-2 scrollbar-hide"
          style={{
            scrollBehavior: 'smooth',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          {highlightsArray.map((hl) => (
            <div
              key={hl.id}
              className="flex-shrink-0 w-32 h-40 rounded-2xl bg-[#181818] dark:bg-gray-900 border border-neutral-800 dark:border-neutral-700 hover:border-brand-orange dark:hover:border-brand-orange transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-105 relative group overflow-visible"
              style={{ scrollSnapAlign: 'start' }}
            >
            {/* İçerik container - overflow-hidden burada */}
            <div className="w-full h-full rounded-2xl overflow-hidden">
              <button
                className="w-full h-full"
                onClick={() => setActiveHighlight(hl)}
              >
                <div className="w-full h-full bg-neutral-900 dark:bg-gray-800">
                  {hl.coverPost?.imageUrl ? (
                    <img
                      src={resolveImageUrl(hl.coverPost.imageUrl)}
                      alt={hl.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-800 dark:bg-gray-700">
                      <span className="text-neutral-500 text-xs">Kapak</span>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 w-full bg-black/45 dark:bg-black/60 py-1 px-2 text-center text-xs font-semibold tracking-wide rounded-b-2xl">
                  <span className="text-neutral-100 dark:text-neutral-200 line-clamp-1">
                    {hl.title}
                  </span>
                </div>
              </button>
            </div>

            {/* Menü butonu - Sadece kendi profilimizde görünür - En yüksek z-index */}
            {isOwnProfile && (
              <div className="absolute top-2 right-2 z-[85]">
                <button
                  ref={(el) => {
                    buttonRefs.current[hl.id] = el
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    const button = e.currentTarget
                    const rect = button.getBoundingClientRect()
                    const menuWidth = 200 // Menü genişliği
                    // Menüyü butonun sağ üstünden başlat, ekranın dışına taşmasın
                    let left = rect.right - menuWidth
                    if (left < 10) {
                      left = 10 // Ekranın solundan 10px boşluk
                    }
                    setMenuPosition({
                      top: rect.bottom + 4,
                      left: left,
                    })
                    setMenuOpen(menuOpen === hl.id ? null : hl.id)
                  }}
                  className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors pointer-events-auto"
                  title="Menü"
                >
                  <MoreVertical size={14} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        ))}

          {/* Sadece kendi profilimizde "Yeni Tema" butonu göster */}
          {isOwnProfile && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-shrink-0 w-32 h-40 rounded-2xl border border-dashed border-neutral-700 dark:border-neutral-600 text-neutral-400 dark:text-neutral-500 hover:border-orange-500 hover:text-orange-400 dark:hover:border-orange-500 dark:hover:text-orange-400 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:scale-105 snap-start"
            >
              <span className="text-2xl">＋</span>
              <span className="text-xs font-medium text-center">Yeni Tema</span>
            </button>
          )}
        </div>

        {/* Right Arrow - Desktop only, hover visible */}
        {showRightArrow && (
          <button
            onClick={scrollRightHandler}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-black/60 dark:bg-black/80 backdrop-blur-sm text-white hover:bg-black/80 dark:hover:bg-black/90 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
            aria-label="Sonraki"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Gradient fade - Right side */}
        <div className="hidden md:block absolute right-0 top-0 bottom-2 w-20 bg-gradient-to-l from-gray-950 dark:from-gray-950 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {showCreateModal && (
        <CreateHighlightModal
          username={username}
          userId={userId}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {activeHighlight && (
        <HighlightDetailModal
          highlight={activeHighlight}
          onClose={() => setActiveHighlight(null)}
        />
      )}

      {showRenameModal && (
        <RenameHighlightModal
          highlight={showRenameModal}
          onClose={() => setShowRenameModal(null)}
        />
      )}

      {showAddArtworkModal && (
        <AddArtworkToHighlightModal
          highlight={showAddArtworkModal}
          username={username}
          userId={userId}
          onClose={() => setShowAddArtworkModal(null)}
        />
      )}

      {/* Menü Portal - Fixed pozisyonda render ediliyor, tüm overflow sorunlarını çözer */}
      {menuOpen && menuPosition && typeof window !== 'undefined' && createPortal(
        <div
          ref={(el) => {
            if (menuOpen) {
              menuRefs.current[menuOpen] = el
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="fixed bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl min-w-[200px] z-[80] whitespace-nowrap"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
        >
          {highlightsArray.find((hl) => hl.id === menuOpen) && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const highlight = highlightsArray.find((hl) => hl.id === menuOpen)
                  if (highlight) {
                    setShowRenameModal(highlight)
                    setMenuOpen(null)
                    setMenuPosition(null)
                  }
                }}
                className="w-full px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-sm font-medium transition-colors text-left"
              >
                Tema Adını Düzenle
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const highlight = highlightsArray.find((hl) => hl.id === menuOpen)
                  if (highlight) {
                    setShowAddArtworkModal(highlight)
                    setMenuOpen(null)
                    setMenuPosition(null)
                  }
                }}
                className="w-full px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-sm font-medium transition-colors text-left"
              >
                Eser Ekle
              </button>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const highlight = highlightsArray.find((hl) => hl.id === menuOpen)
                  if (highlight) {
                    setShowDeleteModal(highlight)
                    setMenuOpen(null)
                    setMenuPosition(null)
                  }
                }}
                className="w-full px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm font-medium transition-colors text-left"
              >
                Temayı Sil
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      {showDeleteModal && (
        <DeleteHighlightModal
          highlight={showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          onDelete={(id) => {
            // Query cache'i otomatik invalidate edilecek (mutation içinde)
            setShowDeleteModal(null)
          }}
        />
      )}
    </div>
  )
}



