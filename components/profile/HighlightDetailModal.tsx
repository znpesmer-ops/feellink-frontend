'use client'

import { resolveImageUrl } from '@/lib/resolveImageUrl'

interface Highlight {
  id: string
  title: string
  items: Array<{
    id: string
    post: {
      id: string
      imageUrl: string | null
      caption: string | null
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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto pr-1">
          {highlight.items?.map((item) => {
            const imageUrl = item.post.imageUrl

            return (
              <div
                key={item.id}
                className="relative aspect-square rounded-xl overflow-hidden bg-neutral-800 dark:bg-gray-800"
              >
                {imageUrl ? (
                  <img
                    src={resolveImageUrl(imageUrl)}
                    alt={item.post.caption ?? ''}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-neutral-500 text-xs">Görsel</span>
                  </div>
                )}
              </div>
            )
          })}
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




