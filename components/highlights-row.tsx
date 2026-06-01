'use client'

import { ImageIcon, MessageCircle, Landmark, Palette } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import Link from 'next/link'

interface HighlightsRowProps {
  compactTop?: boolean
}

const CARD_CONFIGS = [
  { num: '01', icon: Landmark,       accent: '#FF8A00', delay: '0ms'  },
  { num: '02', icon: ImageIcon,      accent: '#6366f1', delay: '80ms' },
  { num: '03', icon: MessageCircle,  accent: '#10b981', delay: '160ms'},
  { num: '04', icon: Palette,        accent: '#ec4899', delay: '240ms'},
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

  const featured = {
    museum: monthlyHighlights?.museum
      ? { name: monthlyHighlights.museum.name || '', username: monthlyHighlights.museum.username || '', imageUrl: monthlyHighlights.museum.imageUrl || null }
      : null,
    artwork: monthlyHighlights?.artwork
      ? { title: monthlyHighlights.artwork.title || '', postId: monthlyHighlights.artwork.postId || '', imageUrl: monthlyHighlights.artwork.imageUrl || null }
      : null,
    comment: monthlyHighlights?.comment
      ? { text: monthlyHighlights.comment.text || '', commentId: monthlyHighlights.comment.commentId || '', postId: monthlyHighlights.comment.postId || '', username: monthlyHighlights.comment.username || '' }
      : null,
    collector: monthlyHighlights?.collection
      ? { name: monthlyHighlights.collection.title || '', username: monthlyHighlights.collection.owner?.username || '', imageUrl: monthlyHighlights.collection.coverImage || monthlyHighlights.collection.owner?.avatar || null }
      : null,
  }

  const highlights = [
    { id: 1, title: 'Ayın Müzesi',      subtitle: featured.museum?.name || '—',     data: featured.museum,    imageUrl: featured.museum?.imageUrl,    username: null },
    { id: 2, title: 'Ayın Eseri',       subtitle: featured.artwork?.title || '—',   data: featured.artwork,   imageUrl: featured.artwork?.imageUrl,   username: null },
    { id: 3, title: 'Ayın Yorumu',      subtitle: featured.comment ? `"${featured.comment.text.slice(0, 30)}${featured.comment.text.length > 30 ? '…' : ''}"` : '—', data: featured.comment, imageUrl: null, username: featured.comment?.username || null },
    { id: 4, title: 'Ayın Koleksiyonu', subtitle: featured.collector?.name || '—',  data: featured.collector, imageUrl: featured.collector?.imageUrl, username: null },
  ]

  const getCardUrl = (item: typeof highlights[0]) => {
    if (!item.data) return null
    switch (item.id) {
      case 1: return featured.museum?.username ? `/profile/${featured.museum.username}` : null
      case 2: return featured.artwork?.postId ? `/feed?post=${featured.artwork.postId}` : null
      case 3: return featured.comment?.postId && featured.comment?.commentId ? `/feed?post=${featured.comment.postId}&comment=${featured.comment.commentId}` : null
      case 4: return monthlyHighlights?.collection?.id ? `/collections/${monthlyHighlights.collection.id}` : null
      default: return null
    }
  }

  const isUsableImage = (url?: string | null) => {
    if (!url || typeof url !== 'string') return false
    const u = url.trim()
    if (!u || u === 'null' || u === 'undefined') return false
    return !['default-user','default-avatar','female','woman','avatar-female','placeholder-user','avatar-placeholder'].some(k => u.toLowerCase().includes(k))
  }

  const CardInner = ({ item, cfg }: { item: typeof highlights[0]; cfg: typeof CARD_CONFIGS[0] }) => {
    const Icon = cfg.icon
    const isEmpty = !item.data
    const resolvedImg = isUsableImage(item.imageUrl) ? resolveImageUrl(item.imageUrl!) : null
    const validImg = isUsableImage(resolvedImg) ? resolvedImg : null

    return (
      <div
        className="premium-card-enter relative w-full h-36 md:h-44 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1"
        style={{
          background: '#0d0d0d',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          animationDelay: cfg.delay,
          opacity: isEmpty ? 0.35 : 1,
        }}
      >
        {/* shimmer on hover */}
        <span className="shimmer-bar" />

        {/* BG image or gradient */}
        {validImg ? (
          <img
            src={validImg}
            alt={item.subtitle}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 30% 70%, ${cfg.accent}18, transparent 70%)` }} />
        )}

        {/* Cinematic overlays */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0.08) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.25), transparent 60%)' }} />

        {/* Number badge */}
        <span
          className="absolute top-3 right-3 text-[10px] font-black tracking-widest"
          style={{ color: cfg.accent, textShadow: `0 0 10px ${cfg.accent}70` }}
        >
          {cfg.num}
        </span>

        {/* Icon */}
        <span className="absolute top-3 left-3 opacity-30 group-hover:opacity-60 transition-opacity duration-300">
          <Icon size={13} strokeWidth={1.5} color="white" />
        </span>

        {/* Bottom content */}
        {item.id === 3 ? (
          <>
            <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="inline-block w-3 h-[1.5px]" style={{ background: cfg.accent }} />
                <p className="text-[9px] font-bold tracking-[0.28em] uppercase" style={{ color: cfg.accent }}>{item.title}</p>
              </div>
              {item.username && <p className="text-[10px] text-white/50">@{item.username}</p>}
            </div>
            <div className="absolute inset-0 flex items-center justify-center px-4 pb-12 z-10">
              <p className="text-[13px] text-white/85 font-medium italic leading-snug text-center line-clamp-2">{item.subtitle}</p>
            </div>
          </>
        ) : (
          <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-block w-3 h-[1.5px]" style={{ background: cfg.accent }} />
              <p className="text-[9px] font-bold tracking-[0.28em] uppercase" style={{ color: cfg.accent }}>{item.title}</p>
            </div>
            <p className="text-[13px] text-white font-semibold line-clamp-2 leading-snug">{item.subtitle}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <section className={`w-full ${compactTop ? 'mt-0' : ''}`}>
      <h2 className="flex items-center gap-3 text-lg md:text-xl font-semibold mt-0 mb-4 md:mb-6">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0">
          <rect x="5" y="0.5" width="6.36" height="6.36" rx="1" transform="rotate(45 5 0.5)" fill="#FF8A00"/>
        </svg>
        <span className="text-white tracking-wide">
          Ayın Öne Çıkanları
        </span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {isLoading ? (
          CARD_CONFIGS.map((cfg, i) => (
            <div
              key={i}
              className="relative w-full h-36 md:h-44 rounded-2xl overflow-hidden animate-pulse"
              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.05)', animationDelay: cfg.delay }}
            >
              <div className="absolute top-3 right-3 w-6 h-4 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>
          ))
        ) : (
          highlights.map((item, idx) => {
            const cfg = CARD_CONFIGS[idx]
            const url = getCardUrl(item)
            return url ? (
              <Link key={item.id} href={url} className="block">
                <CardInner item={item} cfg={cfg} />
              </Link>
            ) : (
              <div key={item.id}>
                <CardInner item={item} cfg={cfg} />
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
