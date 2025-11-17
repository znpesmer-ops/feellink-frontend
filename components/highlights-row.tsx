'use client'

import { ImageIcon, MessageCircle, Landmark, Palette } from 'lucide-react'

export default function HighlightsRow() {
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
    <section className="w-full">
      <h2 className="text-xl font-semibold text-[#111] dark:text-white mb-6 tracking-wide">Ayın Öne Çıkanları</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {highlights.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl bg-white/70 dark:bg-[#141414]/60 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 backdrop-blur-lg p-5 min-h-[160px] flex flex-col gap-3"
          >
            <div className="text-orange-500 dark:text-orange-300">{item.icon}</div>
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

