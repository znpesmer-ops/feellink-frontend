'use client'

import { useEffect, useState } from 'react'
import { ImageIcon, MessageCircle, Landmark, Palette } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import Link from 'next/link'

interface HighlightsRowProps {
  compactTop?: boolean
}

interface FeaturedData {
  museum: { name: string; username: string; imageUrl: string } | null
  artwork: { title: string; postId: string; imageUrl: string } | null
  comment: { text: string; commentId: string; postId: string; username: string; fullName: string } | null
  collector: { name: string; username: string; imageUrl: string } | null
}

export default function HighlightsRow({ compactTop = false }: HighlightsRowProps) {
  // ✅ TEK KAYNAK: Backend'den monthly highlights çek
  const { data: monthlyHighlights, isLoading } = useQuery({
    queryKey: ['monthly-highlights'],
    queryFn: async () => {
      try {
        const res = await api.get('/highlights/monthly')
        return res.data
      } catch (err) {
        console.error('Monthly highlights alınamadı:', err)
        return {
          museum: null,
          artwork: null,
          comment: null,
          collection: null,
        }
      }
    },
    staleTime: 60 * 60 * 1000, // 1 saat cache
    refetchOnWindowFocus: false,
  })

  // Backward compatibility için format dönüşümü
  const featured: FeaturedData = {
    museum: monthlyHighlights?.museum
      ? {
          name: monthlyHighlights.museum.name,
          username: monthlyHighlights.museum.username,
          imageUrl: monthlyHighlights.museum.imageUrl || null,
        }
      : null,
    artwork: monthlyHighlights?.artwork
      ? {
          title: monthlyHighlights.artwork.title,
          postId: monthlyHighlights.artwork.postId,
          imageUrl: monthlyHighlights.artwork.imageUrl || null,
        }
      : null,
    comment: monthlyHighlights?.comment
      ? {
          text: monthlyHighlights.comment.text,
          commentId: monthlyHighlights.comment.commentId,
          postId: monthlyHighlights.comment.postId,
          username: monthlyHighlights.comment.username,
          fullName: monthlyHighlights.comment.fullName,
        }
      : null,
    collector: monthlyHighlights?.collection
      ? {
          name: monthlyHighlights.collection.title,
          username: monthlyHighlights.collection.owner.username,
          imageUrl: monthlyHighlights.collection.coverImage || monthlyHighlights.collection.owner.avatar || null,
        }
      : null,
  }

  const loading = isLoading

  // Her kart için hedef URL'yi hesapla
  const getCardUrl = (item: any) => {
    if (!item.data) return null

    switch (item.id) {
      case 1: // Ayın Müzesi
        return featured.museum?.username ? `/profile/${featured.museum.username}` : null
      case 2: // Ayın Eseri
        return featured.artwork?.postId ? `/feed?post=${featured.artwork.postId}` : null
      case 3: // Ayın Yorumu
        return featured.comment?.postId && featured.comment?.commentId
          ? `/feed?post=${featured.comment.postId}&comment=${featured.comment.commentId}`
          : null
      case 4: // Ayın Koleksiyonu
        return monthlyHighlights?.collection?.id ? `/collections/${monthlyHighlights.collection.id}` : null
      default:
        return null
    }
  }

  // Her zaman 4 kart - veri yoksa boş placeholder
  const highlights = [
    {
      id: 1,
      title: 'Ayın Müzesi',
      subtitle: featured.museum?.name || '—',
      icon: <Landmark size={20} strokeWidth={1.8} />,
      data: featured.museum,
      imageUrl: featured.museum?.imageUrl,
    },
    {
      id: 2,
      title: 'Ayın Eseri',
      subtitle: featured.artwork?.title || '—',
      icon: <ImageIcon size={20} strokeWidth={1.8} />,
      data: featured.artwork,
      imageUrl: featured.artwork?.imageUrl,
    },
    {
      id: 3,
      title: 'Ayın Yorumu',
      subtitle: featured.comment
        ? `"${featured.comment.text.length > 30 ? featured.comment.text.substring(0, 30) + '...' : featured.comment.text}"`
        : '—',
      icon: <MessageCircle size={20} strokeWidth={1.8} />,
      data: featured.comment,
      username: featured.comment?.username,
    },
    {
      id: 4,
      title: 'Ayın Koleksiyonu',
      subtitle: featured.collector?.name || '—',
      icon: <Palette size={20} strokeWidth={1.8} />,
      data: featured.collector,
      imageUrl: featured.collector?.imageUrl,
    },
  ]

  // Boş placeholder kartı - Modern overlay tasarımı
  const EmptyCard = ({ title }: { title: string }) => (
    <div className="relative w-full h-[140px] md:h-[160px] rounded-[14px] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#1a1a1a] dark:to-[#111] border border-[rgba(255,140,0,0.35)] dark:border-[rgba(255,140,0,0.15)] shadow-sm opacity-50">
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
        <p className="text-xs font-semibold text-[#ff7b00] mb-1 tracking-wide uppercase">{title}</p>
        <p className="text-sm text-white/60">—</p>
      </div>
    </div>
  )

  return (
    <section className={`w-full ${compactTop ? 'mt-0' : ''}`}>
      <h2 className="text-lg md:text-xl font-semibold bg-gradient-to-r from-brand-orange to-brand-blue bg-clip-text text-transparent dark:from-orange-400 dark:to-blue-400 mt-0 mb-4 md:mb-6 tracking-wide">
        Ayın Öne Çıkanları
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {highlights.map((item) => {
          if (!item.data) {
            return (
              <EmptyCard key={item.id} title={item.title} />
            )
          }

          // Ayın Yorumu için özel görsel yoksa placeholder
          const displayImage = item.imageUrl || (item.id === 3 ? null : null)
          const fallbackBg = item.id === 1 
            ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/30'
            : item.id === 2
            ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/30'
            : item.id === 3
            ? 'bg-gradient-to-b from-[rgba(120,80,160,0.15)] to-[rgba(20,20,30,0.85)]'
            : 'bg-gradient-to-br from-pink-500/20 to-pink-600/30'

          const cardUrl = getCardUrl(item)
          
          // Tüm kartlar aynı yapıyı kullanır (Ayın Yorumu dahil)
          const CardContent = (
            <div className="relative w-full h-[140px] md:h-[160px] rounded-[14px] overflow-hidden bg-gray-900 dark:bg-[#111] border border-[rgba(255,140,0,0.35)] dark:border-[rgba(255,140,0,0.15)] shadow-sm hover:shadow-lg hover:shadow-brand-orange/20 transition-all hover:-translate-y-1 group cursor-pointer">
              {/* Görsel veya Gradient Background */}
              {displayImage ? (
                <img
                  src={resolveImageUrl(displayImage)}
                  alt={item.subtitle}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
              ) : (
                <div className={`absolute inset-0 ${fallbackBg}`} />
              )}

              {/* Gradient Overlay - En altta yazı okunurluğu için */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

              {/* Yazılar - En altta overlay içinde */}
              {item.id === 3 ? (
                // Ayın Yorumu için özel format: Başlık üstte (diğer kartlarla aynı hizada), kullanıcı adı altında, yorum metni ortada
                <>
                  {/* Başlık - Diğer kartlarla birebir aynı bottom padding ve hiza */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                    <p className="text-xs font-semibold text-[#ff7b00] mb-1.5 tracking-wide uppercase">
                      {item.title}
                    </p>
                    {/* Kullanıcı adı - Daha sakin, küratoryal ton */}
                    {item.username && (
                      <p className="text-xs text-white/60 leading-snug line-clamp-1">@{item.username}</p>
                    )}
                  </div>
                  {/* Yorum metni - Kartın optik merkezinde, quote hissi veren stil */}
                  <div className="absolute inset-0 flex items-center justify-center px-3 md:px-4 pb-20 md:pb-24">
                    <p className="relative top-[30px] text-sm text-white/90 font-medium italic leading-snug text-center">
                      {item.subtitle}
                    </p>
                  </div>
                </>
              ) : (
                // Diğer kartlar için normal format (başlık önce, içerik sonra)
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                  <p className="text-xs font-semibold text-[#ff7b00] mb-1.5 tracking-wide uppercase">
                    {item.title}
                  </p>
                  <p className="text-sm text-white font-medium line-clamp-2 leading-snug">
                    {item.subtitle}
                  </p>
                </div>
              )}
            </div>
          )

          // Link varsa kartı Link'e sar, yoksa normal div
          return cardUrl ? (
            <Link key={item.id} href={cardUrl} className="block">
              {CardContent}
            </Link>
          ) : (
            <div key={item.id}>
              {CardContent}
            </div>
          )
        })}
      </div>
    </section>
  )
}

