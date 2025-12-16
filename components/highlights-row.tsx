'use client'

import { ImageIcon, MessageCircle, Landmark, Palette } from 'lucide-react'

interface HighlightsRowProps {
  compactTop?: boolean
}

export default function HighlightsRow({ compactTop = false }: HighlightsRowProps) {
  const highlights = [
    {
      id: 1,
      title: 'Ayın Müzesi',
      subtitle: 'İstanbul Modern',
      icon: <Landmark size={20} strokeWidth={1.8} />,
    },
    {
      id: 2,
      title: 'Ayın Eseri',
      subtitle: 'Göçmen Kuşlar Koleksiyonu',
      icon: <ImageIcon size={20} strokeWidth={1.8} />,
    },
    {
      id: 3,
      title: 'Ayın Yorumu',
      subtitle: 'Ziyaretçi düşünceleri',
      icon: <MessageCircle size={20} strokeWidth={1.8} />,
    },
    {
      id: 4,
      title: 'Ayın Koleksiyoneri',
      subtitle: 'Zeynep Esmer',
      icon: <Palette size={20} strokeWidth={1.8} />,
    },
  ]

  return (
    <section className={`w-full ${compactTop ? 'mt-0' : ''}`}>
      <h2 className="text-lg md:text-xl font-semibold bg-gradient-to-r from-brand-orange to-brand-blue bg-clip-text text-transparent dark:from-orange-400 dark:to-blue-400 mt-0 mb-4 md:mb-6 tracking-wide">Ayın Öne Çıkanları</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {highlights.map((item) => (
          <div
            key={item.id}
            className="w-full rounded-2xl bg-gradient-to-br from-white via-blue-50/40 to-orange-50/30 dark:from-[#141414] dark:via-blue-950/30 dark:to-orange-950/20 border-2 border-brand-blue/20 dark:border-brand-blue/30 shadow-sm hover:shadow-lg hover:shadow-brand-orange/10 transition-all hover:-translate-y-1 hover:border-brand-orange/40 dark:hover:border-brand-orange/50 backdrop-blur-lg p-4 md:p-5 min-h-[140px] md:min-h-[160px] flex flex-col gap-3"
          >
            <div className="text-brand-orange dark:text-orange-400">{item.icon}</div>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-semibold text-[#222] dark:text-white leading-tight">{item.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

