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

const CARD_META = [
  { num: '01', icon: Landmark,      accentFrom: '#FF8A00', accentTo: '#ea580c' },
  { num: '02', icon: ImageIcon,     accentFrom: '#6366f1', accentTo: '#818cf8' },
  { num: '03', icon: MessageCircle, accentFrom: '#10b981', accentTo: '#34d399' },
  { num: '04', icon: Palette,       accentFrom: '#ec4899', accentTo: '#f472b6' },
]

export default function HighlightsRow({ compactTop = false }: HighlightsRowProps) {
  const { data: monthlyHighlights, isLoading } = useQuery({
    queryKey: ['monthly-highlights'],
    queryFn: async () => {
      try {
        const res = await api.get('/highlights/monthly')
        return res.data || { museum: null, artwork: null, comment: null, collection: null }
      } catch {
        return { museum: null, artwork: null, comment: null, collection: null }
      }
    },
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  const featured: FeaturedData = {
    museum: monthlyHighlights?.museum
      ? { name: monthlyHighlights.museum?.name || '', username: monthlyHighlights.museum?.username || '', imageUrl: monthlyHighlights.museum?.imageUrl || null }
      : null,
    artwork: monthlyHighlights?.artwork
      ? { title: monthlyHighlights.artwork?.title || '', postId: monthlyHighlights.artwork?.postId || '', imageUrl: monthlyHighlights.artwork?.imageUrl || null }
      : null,
    comment: monthlyHighlights?.comment
      ? { text: monthlyHighlights.comment?.text || '', commentId: monthlyHighlights.comment?.commentId || '', postId: monthlyHighlights.comment?.postId || '', username: monthlyHighlights.comment?.username || '', fullName: monthlyHighlights.comment?.fullName || '' }
      : null,
    collector: monthlyHighlights?.collection
      ? { name: monthlyHighlights.collection?.title || '', username: monthlyHighlights.collection?.owner?.username || '', imageUrl: monthlyHighlights.collection?.coverImage || monthlyHighlights.collection?.owner?.avatar || null }
      : null,
  }

  const highlights = [
    { id: 1, title: 'Ayın Müzesi',     subtitle: featured.museum?.name || '—',   data: featured.museum,   imageUrl: featured.museum?.imageUrl },
    { id: 2, title: 'Ayın Eseri',      subtitle: featured.artwork?.title || '—',  data: featured.artwork,  imageUrl: featured.artwork?.imageUrl },
    {
      id: 3,
      title: 'Ayın Yorumu',
      subtitle: featured.comment
        ? `"${featured.comment.text.length > 30 ? featured.comment.text.substring(0, 30) + '…' : featured.comment.text}"`
        : '—',
      data: featured.comment,
      username: featured.comment?.username,
      imageUrl: undefined,
    },
    { id: 4, title: 'Ayın Koleksiyonu', subtitle: featured.collector?.name || '—', data: featured.collector, imageUrl: featured.collector?.imageUrl },
  ]

  const getCardUrl = (item: any) => {
    if (!item.data) return null
    switch (item.id) {
      case 1: return featured.museum?.username ? `/profile/${featured.museum.username}` : null
      case 2: return featured.artwork?.postId  ? `/feed?post=${featured.artwork.postId}` : null
      case 3: return featured.comment?.postId && featured.comment?.commentId
        ? `/feed?post=${featured.comment.postId}&comment=${featured.comment.commentId}` : null
      case 4: return monthlyHighlights?.collection?.id ? `/collections/${monthlyHighlights.collection.id}` : null
      default: return null
    }
  }

  const isUsableImage = (url?: string | null): boolean => {
    if (!url || typeof url !== 'string') return false
    const u = url.trim()
    if (!u || u === 'null' || u === 'undefined') return false
    const blocked = ['default-user','default-avatar','female','woman','avatar-female','placeholder-user','avatar-placeholder']
    if (blocked.some((k) => u.toLowerCase().includes(k))) return false
    return true
  }

  // Skeleton loader card
  const SkeletonCard = ({ index }: { index: number }) => {
    const meta = CARD_META[index]
    return (
      <div
        className="premium-card-enter relative w-full h-[148px] md:h-[168px] rounded-[14px] overflow-hidden bg-gray-100 dark:bg-[#111]"
        style={{ animationDelay: `${index * 0.08}s` }}
      >
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-200/60 to-gray-300/30 dark:from-white/5 dark:to-white/[0.02]" />
        {/* num badge skeleton */}
        <div className="absolute top-3 right-3 w-7 h-5 rounded bg-white/10 animate-pulse" />
      </div>
    )
  }

  return (
    <section className={`w-full ${compactTop ? 'mt-0' : ''}`}>
      {/* Editorial section header */}
      <div className="fl-section-title mb-4 md:mb-6 pb-2 inline-block">
        <div className="flex items-center gap-2.5 mb-0.5">
          <span className="fl-dot inline-block w-1.5 h-1.5 rounded-full bg-[#FF8A00] flex-shrink-0" />
          <span className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#FF8A00]">
            Ayın Öne Çıkanları
          </span>
        </div>
        <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
          Bu Ay Sahnede
        </p>
        <div className="fl-accent-line-el h-[2px] w-full bg-[#FF8A00] mt-1.5 rounded-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {isLoading
          ? CARD_META.map((_, i) => <SkeletonCard key={i} index={i} />)
          : highlights.map((item, idx) => {
              const meta = CARD_META[idx]
              const Icon = meta.icon
              const hasImage = isUsableImage(item.imageUrl)
              const resolvedImg = hasImage ? resolveImageUrl(item.imageUrl!) : null
              const cardUrl = getCardUrl(item)
              const isEmpty = !item.data

              const emptyGradient = [
                'from-[#FF8A00]/8 to-[#ea580c]/4',
                'from-indigo-500/8 to-indigo-400/4',
                'from-emerald-500/8 to-emerald-400/4',
                'from-pink-500/8 to-pink-400/4',
              ][idx]

              const Inner = (
                <div
                  className={`relative w-full h-[148px] md:h-[168px] rounded-[14px] overflow-hidden group cursor-pointer
                    bg-gray-900 dark:bg-[#0d0d0d]
                    border border-white/6 dark:border-white/[0.04]
                    shadow-[0_4px_20px_rgba(0,0,0,0.18)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.32)]
                    transition-all duration-300 hover:-translate-y-[3px]
                    ${isEmpty ? 'opacity-35' : ''}
                  `}
                >
                  {/* Shimmer on hover */}
                  <span className="shimmer-bar" />

                  {/* Background */}
                  {!isEmpty && resolvedImg && isUsableImage(resolvedImg) ? (
                    <img
                      src={resolvedImg}
                      alt={item.subtitle}
                      className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.06]"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${emptyGradient} dark:opacity-60`} />
                  )}

                  {/* Cinematic gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
                  {/* Subtle left vignette */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

                  {/* Number badge — top right, editorial */}
                  <div className="absolute top-3 right-3 z-10">
                    <span
                      className="text-[10px] font-black tracking-widest tabular-nums"
                      style={{ color: meta.accentFrom, textShadow: `0 0 12px ${meta.accentFrom}60` }}
                    >
                      {meta.num}
                    </span>
                  </div>

                  {/* Icon — top left, faint */}
                  <div className="absolute top-3 left-3 z-10 opacity-40 group-hover:opacity-70 transition-opacity duration-300">
                    <Icon size={14} strokeWidth={1.5} color="white" />
                  </div>

                  {/* Bottom content */}
                  {item.id === 3 ? (
                    <>
                      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 z-10">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-3 h-[1.5px]" style={{ background: meta.accentFrom }} />
                          <p className="text-[9px] font-bold tracking-[0.28em] uppercase"
                            style={{ color: meta.accentFrom }}>
                            {item.title}
                          </p>
                        </div>
                        {item.username && (
                          <p className="text-[10px] text-white/50 leading-snug">@{item.username}</p>
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center px-4 pb-14 z-10">
                        <p className="text-[13px] text-white/85 font-medium italic leading-snug text-center line-clamp-2">
                          {item.subtitle}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 z-10">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-3 h-[1.5px]" style={{ background: meta.accentFrom }} />
                        <p className="text-[9px] font-bold tracking-[0.28em] uppercase"
                          style={{ color: meta.accentFrom }}>
                          {item.title}
                        </p>
                      </div>
                      <p className="text-[13px] text-white font-semibold line-clamp-2 leading-snug">
                        {item.subtitle}
                      </p>
                    </div>
                  )}
                </div>
              )

              return cardUrl ? (
                <div key={item.id} className="premium-card-enter" style={{ animationDelay: `${idx * 0.08}s` }}>
                  <Link href={cardUrl} className="block">{Inner}</Link>
                </div>
              ) : (
                <div key={item.id} className="premium-card-enter" style={{ animationDelay: `${idx * 0.08}s` }}>
                  {Inner}
                </div>
              )
            })}
      </div>
    </section>
  )
}
