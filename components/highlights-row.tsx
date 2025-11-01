'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageIcon, MessageCircle, Landmark, Palette } from 'lucide-react'

export default function HighlightsRow() {
  // 🔹 Bu veriler backend'den (örneğin /api/highlights) alınabilir.
  const highlights = [
    {
      id: 1,
      title: 'Ayın Müzesi',
      subtitle: 'İstanbul Modern',
      image: '/highlights/museum.jpg',
      icon: <Landmark size={20} strokeWidth={1.8} />,
    },
    {
      id: 2,
      title: 'Ayın Eseri',
      subtitle: 'Göçmen Kuşlar Koleksiyonu',
      image: '/highlights/artwork.jpg',
      icon: <ImageIcon size={20} strokeWidth={1.8} />,
    },
    {
      id: 3,
      title: 'Ayın Yorumu',
      subtitle: 'Ziyaretçi düşünceleri',
      image: '/highlights/comment.jpg',
      icon: <MessageCircle size={20} strokeWidth={1.8} />,
    },
    {
      id: 4,
      title: 'Ayın Koleksiyoneri',
      subtitle: 'Zeynep Esmer',
      image: '/highlights/collector.jpg',
      icon: <Palette size={20} strokeWidth={1.8} />,
    },
  ]

  return (
    <section className="w-full px-6 mt-10">
      <h2 className="text-center text-xl font-semibold text-[#111] dark:text-white mb-8 tracking-wide">
        Ayın Öne Çıkanları
      </h2>

      <div className="flex justify-between gap-6">
        {highlights.map((item) => (
          <HighlightCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}

function HighlightCard({ item }: { item: { id: number; title: string; subtitle: string; image: string; icon: JSX.Element } }) {
  const [imageError, setImageError] = useState(false)

  return (
    <div
      className="w-[260px] h-[220px] rounded-2xl 
                 bg-white/70 dark:bg-[#141414]/60 
                 border border-gray-200 dark:border-white/10
                 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 
                 backdrop-blur-lg overflow-hidden cursor-pointer group"
    >
      {/* 🔹 Görsel */}
      <div className="relative w-full h-[140px]">
        {!imageError ? (
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-400/20 to-orange-600/20 flex items-center justify-center">
            <div className="text-orange-300/50 scale-150">
              {item.icon}
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-black/10 dark:bg-black/20 group-hover:bg-black/5 dark:group-hover:bg-black/10 transition-colors"></div>
      </div>

      {/* 🔹 Başlık + ikon alanı */}
      <div className="flex items-start gap-3 p-4">
        <div className="text-orange-500 dark:text-orange-300 flex-shrink-0 mt-0.5">
          {item.icon}
        </div>
        <div className="flex flex-col min-w-0">
          <p className="text-sm font-semibold text-[#222] dark:text-white leading-tight">
            {item.title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {item.subtitle}
          </p>
        </div>
      </div>
    </div>
  )
}

