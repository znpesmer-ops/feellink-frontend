'use client'

import Link from 'next/link'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

// Simple cn utility for className merging
const cn = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(' ')
}

interface Highlight {
  id: string
  title: string
  items: Array<{
    id: string
    post: {
      id: string
      imageUrl: string | null
      caption: string | null
      title: string | null
    }
  }>
}

interface HighlightDetailModalProps {
  highlight: Highlight
  onClose: () => void
}

export function HighlightDetailModal({ highlight, onClose }: HighlightDetailModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[85vh] bg-[#111] dark:bg-gray-900 rounded-2xl p-6 flex flex-col gap-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100 dark:text-gray-100">{highlight.title}</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 dark:text-neutral-500 dark:hover:text-neutral-300"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
            {highlight.items?.map((item) => {
              const imageUrl = item.post.imageUrl
              // Güvenli başlık çıkarma - title öncelikli, sonra caption
              const artworkTitle = (
                (item.post.title && typeof item.post.title === 'string' && item.post.title.trim().length > 0)
                  ? item.post.title.trim()
                  : (item.post.caption && typeof item.post.caption === 'string' && item.post.caption.trim().length > 0)
                  ? item.post.caption.trim()
                  : 'İsimsiz Eser'
              )

              return (
                <Link
                  key={item.id}
                  href={`/posts/${item.post.id}`}
                  prefetch={false}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-neutral-800 dark:bg-gray-800 group cursor-pointer hover:scale-[1.02] transition-transform block"
                  onClick={(e) => {
                    // Modal'ın kapanmasını engelle
                    e.stopPropagation()
                  }}
                >
                  {imageUrl ? (
                    <>
                      <img
                        src={resolveImageUrl(imageUrl)}
                        alt={artworkTitle}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                        }}
                      />

                      {/* Hover Overlay - Eser adı */}
                      <div
                        className={cn(
                          'absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl flex items-end pointer-events-none'
                        )}
                      >
                        <div className="p-3 w-full">
                          <p className="text-white text-sm font-medium line-clamp-1 leading-tight">
                            {artworkTitle}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-neutral-500 text-xs">Görsel</span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {highlight.items?.length === 0 && (
          <div className="text-center py-8 text-neutral-400 dark:text-neutral-500">
            Bu temada henüz eser bulunmuyor.
          </div>
        )}
      </div>
    </div>
  )
}




