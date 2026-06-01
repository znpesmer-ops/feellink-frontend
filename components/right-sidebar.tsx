'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, X, BookOpen, Heart } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

type Author = {
  id: number
  slug: string
  name: string
  avatar: string
  preview: string
  bio: string
  lastPost: {
    title: string
    preview: string
    link: string
  }
}

const MUSEUM_PLACEHOLDERS: Record<number, string> = {
  1: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
  2: 'https://images.unsplash.com/photo-1503389152951-9f343605f61e?auto=format&fit=crop&w=800&q=80',
  3: 'https://images.unsplash.com/photo-1522780209446-8a0e1a942334?auto=format&fit=crop&w=800&q=80',
  4: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',
}

const DEFAULT_MUSEUM_IMAGE =
  'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=800&q=80'

const DEFAULT_AUTHOR_AVATAR =
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=320&q=80'

const DEFAULT_ARTICLE_IMAGE =
  'https://images.unsplash.com/photo-1526481280695-3c469b8c66b4?auto=format&fit=crop&w=960&q=80'

interface RightSidebarProps {
  mode?: 'feed' | 'explore'
}

export default function RightSidebar({ mode }: RightSidebarProps = {}) {
  const pathname = usePathname()

  // 🔥 KRİTİK: Tüm hook'lar koşullu return'dan ÖNCE tanımlanmalı (React Rules of Hooks)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [selectedWriter, setSelectedWriter] = useState<Author | null>(null)
  const [topLikedArticles, setTopLikedArticles] = useState<any[]>([])
  const [museums, setMuseums] = useState<any[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [explorePosts, setExplorePosts] = useState<Author[]>([])

  const isHomePage = pathname === '/feed' || pathname === '/'
  const isExplore = pathname === '/explore'
  const isFeed = pathname === '/feed'
  const isCollections = pathname === '/collections'

  // Mode prop'u yoksa pathname'den otomatik belirle
  const sidebarMode = mode || (isExplore ? 'explore' : isHomePage ? 'feed' : null)

  // 📊 Global sidebar verilerini yükle - feed ve explore sayfalarında
  // KRİTİK: useEffect hook'u koşullu return'dan ÖNCE — Rules of Hooks
  useEffect(() => {
    // Sadece feed/explore'da veri yükle
    if ((!isHomePage && !isExplore) || isCollections) return

    if (sidebarMode === 'explore') {
      const fetchExplorePosts = async () => {
        try {
          const res = await api.get(`/sidebar/explore/posts?limit=5&_t=${Date.now()}`)
          setExplorePosts(res.data || [])
        } catch {
          setExplorePosts([])
        }
      }
      fetchExplorePosts()
      return
    }

    const ensureAbsoluteUrl = (url?: string | null, fallback?: string) => {
      if (!url || url.trim() === '') return fallback ?? DEFAULT_ARTICLE_IMAGE
      if (url.startsWith('http')) {
        if (url.includes('localhost:3000')) return fallback ?? DEFAULT_ARTICLE_IMAGE
        return url
      }
      if (fallback) return fallback
      return DEFAULT_ARTICLE_IMAGE
    }

    const transformMuseums = (items: any[]) =>
      items.map((museum) => ({
        ...museum,
        image: ensureAbsoluteUrl(museum.image, MUSEUM_PLACEHOLDERS[museum.id] ?? DEFAULT_MUSEUM_IMAGE),
      }))

    const transformAuthors = (items: any[]) =>
      items.map((author, index) => ({
        ...author,
        avatar: ensureAbsoluteUrl(author.avatar, DEFAULT_AUTHOR_AVATAR),
        preview: author.preview || (index === 0 ? 'Duyguların izi her eserde saklıdır.' : 'Bellek, malzeme ve zamanın sessiz diyaloğu.'),
      }))

    const transformArticles = (items: any[]) =>
      items.map((article) => ({
        ...article,
        coverImage: ensureAbsoluteUrl(article.coverImage, DEFAULT_ARTICLE_IMAGE),
        author: article.author
          ? { ...article.author, avatar: ensureAbsoluteUrl(article.author.avatar, DEFAULT_AUTHOR_AVATAR) }
          : article.author,
      }))

    const fetchGlobalData = async () => {
      try {
        const res = await api.get('/sidebar/global')
        setMuseums(transformMuseums(res.data.museums || []))
        setAuthors(transformAuthors(res.data.authors || []))
        setTopLikedArticles(transformArticles(res.data.topLikedArticles || []))
      } catch {
        setMuseums([
          { id: 1, name: 'İstanbul Modern',   image: MUSEUM_PLACEHOLDERS[1], color: 'from-[#f97316]/80 to-[#fbbf24]/60' },
          { id: 2, name: 'Pera Müzesi',        image: MUSEUM_PLACEHOLDERS[2], color: 'from-[#fb923c]/80 to-[#fed7aa]/60' },
          { id: 3, name: 'Odunpazarı Müzesi',  image: MUSEUM_PLACEHOLDERS[3], color: 'from-[#fcd34d]/80 to-[#fde68a]/60' },
          { id: 4, name: 'Sabancı Müzesi',     image: MUSEUM_PLACEHOLDERS[4], color: 'from-[#f59e0b]/80 to-[#fcd34d]/60' },
        ])
        setAuthors([])
        setTopLikedArticles([])
      }
    }

    fetchGlobalData()
  }, [isHomePage, isExplore, isCollections, sidebarMode])

  // Koşullu return — tüm hook'lardan SONRA (Rules of Hooks uyumlu)
  if ((!isHomePage && !isExplore) || isCollections) {
    return null
  }

  // Reusable section header
  const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <span className="flex-shrink-0 w-[3px] h-4 rounded-full"
            style={{ background: 'linear-gradient(180deg,#ff9a30,#ff4500)', boxShadow: '0 0 6px #ff7b0060' }} />
      <h3 className="text-[11px] font-bold tracking-[0.22em] uppercase"
          style={{ background: 'linear-gradient(90deg,#ffaa55,#ff6600)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {title}
      </h3>
      <span className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(255,123,0,0.25), transparent)' }} />
    </div>
  )

  const isUsableImage = (url?: string | null): boolean => {
    if (!url || typeof url !== 'string') return false
    const u = url.trim()
    if (!u || u === 'null' || u === 'undefined') return false
    return !['default-user','default-avatar','female','woman','avatar-female','placeholder-user','avatar-placeholder'].some(k => u.toLowerCase().includes(k))
  }

  return (
    <>
    <aside
      className="hidden lg:flex flex-col w-full overflow-y-auto pb-8 pl-4 pr-4
                 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
      style={{
        background: 'linear-gradient(180deg, #080810 0%, #0a0a14 60%, #08080f 100%)',
        borderLeft: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none fixed top-20 right-0 w-40 h-40 rounded-full opacity-[0.04]"
           style={{ background: 'radial-gradient(circle, #ff7b00, transparent 70%)' }} />

      <div className="w-full flex flex-col pt-5 gap-0">

        {/* ─── EXPLORE MODE ─── */}
        {sidebarMode === 'explore' ? (
          <div className="w-full premium-card-enter">
            <SectionHeader title="Keşfet Yazıları" />
            <div className="space-y-2.5">
              {explorePosts.length > 0 ? explorePosts.map((post, idx) => (
                <Link
                  key={post.id}
                  href={post.lastPost?.link?.includes('feed?post=') ? `/explore?post=${post.id}` : post.lastPost?.link || `/articles/${post.id}`}
                  className="group relative flex items-start gap-3 p-3 rounded-xl overflow-hidden
                             transition-all duration-200 hover:-translate-y-[1px]"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    animationDelay: `${idx * 50}ms`,
                  }}
                >
                  <span className="shimmer-bar" />
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                    {!imageErrors[`author-${post.id}`] ? (
                      <img src={resolveImageUrl(post.avatar)} alt={post.name} className="object-cover w-full h-full"
                           onError={() => setImageErrors(p => ({...p, [`author-${post.id}`]: true}))} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#ff7b00]/30 to-[#7c3aed]/30">
                        <span className="text-white text-sm font-bold">{post.name[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-[13px] font-medium text-white/90 leading-snug line-clamp-1 group-hover:text-white transition-colors">
                      {post.lastPost?.title || 'Yazı'}
                    </p>
                    <p className="text-[11px] text-white/35 mt-0.5">{post.name}</p>
                    {post.preview && (
                      <p className="text-[11px] text-white/25 mt-0.5 line-clamp-1 italic">"{post.preview}"</p>
                    )}
                  </div>
                </Link>
              )) : (
                <p className="text-center py-8 text-white/25 text-sm">Henüz yeni yazı yok</p>
              )}
            </div>
          </div>

        ) : (
          <>
            {/* ─── HAFTANIN MÜZELERİ ─── */}
            <div className="w-full premium-card-enter">
              <SectionHeader title="Haftanın Müzeleri" />
              <div className="grid grid-cols-2 gap-2.5">
                {Array.from({ length: 4 }, (_, i) => {
                  const museum = museums[i] || null
                  if (!museum) return (
                    <div key={`empty-m-${i}`}
                         className="relative rounded-2xl h-[100px] overflow-hidden animate-pulse"
                         style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,123,0,0.04), transparent)' }} />
                    </div>
                  )
                  const resolvedImg = isUsableImage(museum.image) ? resolveImageUrl(museum.image) : null
                  const validImg = resolvedImg && isUsableImage(resolvedImg) ? resolvedImg : null
                  return (
                    <Link key={museum.id} href={`/profile/${museum.username || museum.id}`}
                          className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
                          style={{ height: '100px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="shimmer-bar" />
                      {validImg && !imageErrors[`museum-${museum.id}`] ? (
                        <img src={validImg} alt={museum.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.07]"
                             onError={() => setImageErrors(p => ({...p, [`museum-${museum.id}`]: true}))} />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${museum.color}`} />
                      )}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }} />
                      <div className="absolute bottom-0 left-0 right-0 p-2 z-10">
                        <p className="text-white text-[11px] font-semibold text-center leading-tight drop-shadow-sm">{museum.name}</p>
                      </div>
                      {/* Hover glow border */}
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                           style={{ boxShadow: 'inset 0 0 0 1px rgba(255,123,0,0.4), 0 0 20px rgba(255,123,0,0.12)' }} />
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* ─── EN ÇOK BEĞENİLENLER ─── */}
            {topLikedArticles.length > 0 && (
              <div className="mt-6 premium-card-enter">
                <SectionHeader title="En Çok Beğenilenler" />
                <div className="space-y-1.5">
                  {topLikedArticles.map((article, index) => (
                    <Link key={article.id} href={`/articles/${article.id}`}
                          className="group relative flex items-start justify-between gap-2 px-3 py-2.5 rounded-xl overflow-hidden
                                     transition-all duration-200 hover:-translate-y-[1px]"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="shimmer-bar" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-white/80 group-hover:text-white line-clamp-2 leading-snug transition-colors">
                          {article.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-white/30">
                          <span className="truncate max-w-[80px]">{article.author?.fullName || article.author?.username}</span>
                          <span>·</span>
                          <Heart size={10} className="text-[#ff7b00] fill-[#ff7b00] flex-shrink-0" style={{ filter: 'drop-shadow(0 0 3px #ff7b0070)' }} />
                          <span>{article.totalLikes || 0}</span>
                        </div>
                      </div>
                      {index < 3 && (
                        <span className="flex-shrink-0 text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-md mt-0.5"
                              style={{
                                background: index === 0 ? 'linear-gradient(135deg,#ff7b00,#ff4500)' : 'rgba(255,255,255,0.07)',
                                color: index === 0 ? 'white' : 'rgba(255,255,255,0.35)',
                                boxShadow: index === 0 ? '0 0 8px rgba(255,100,0,0.35)' : 'none',
                              }}>
                          #{index + 1}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ─── AKTİF YAZARLAR ─── */}
            <div className="mt-6 premium-card-enter">
              <SectionHeader title="Aktif Yazarlar" />
              <div className="grid grid-cols-2 gap-2.5">
                {Array.from({ length: 4 }, (_, i) => {
                  const author = authors[i] || null
                  if (!author) return (
                    <div key={`empty-a-${i}`}
                         className="relative rounded-2xl h-[100px] overflow-hidden animate-pulse"
                         style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.04), transparent)' }} />
                    </div>
                  )
                  return (
                    <Link key={author.id} href={`/profile/${author.slug || author.id}`}
                          className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
                          style={{ height: '100px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="shimmer-bar" />
                      {!imageErrors[`author-${author.id}`] ? (
                        <img src={resolveImageUrl(author.avatar)} alt={author.name}
                             className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.07]"
                             onError={() => setImageErrors(p => ({...p, [`author-${author.id}`]: true}))} />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#7c3aed]/30 to-[#ff7b00]/20 flex items-center justify-center">
                          <span className="text-white text-2xl font-bold">{author.name[0]?.toUpperCase() || '?'}</span>
                        </div>
                      )}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }} />
                      <div className="absolute bottom-0 left-0 right-0 p-2 z-10">
                        <p className="text-white text-[11px] font-semibold text-center leading-tight drop-shadow-sm">{author.name}</p>
                      </div>
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                           style={{ boxShadow: 'inset 0 0 0 1px rgba(124,58,237,0.4), 0 0 20px rgba(124,58,237,0.1)' }} />
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* ─── BUTON ─── */}
            {sidebarMode === 'feed' && (
              <div className="mt-6 pt-5 border-t border-white/[0.05] flex justify-center">
                <Link href="/articles/published"
                      className="group relative inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl overflow-hidden
                                 text-white text-[13px] font-semibold transition-all duration-200 hover:-translate-y-0.5"
                      style={{ background: 'linear-gradient(135deg, #ff7b00, #ff4500)', boxShadow: '0 4px 16px rgba(255,100,0,0.3)' }}>
                  <span className="shimmer-bar" />
                  <span>Tüm Yayınlanan Yazıları Gör</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </aside>

    {/* ─── YAZAR DETAY MODAL ─── */}
    {selectedWriter && (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md"
        onClick={(e) => { if (e.target === e.currentTarget) setSelectedWriter(null) }}
      >
        <div
          className="relative w-[440px] max-w-[90vw] rounded-2xl shadow-2xl p-7 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(15,12,25,0.97), rgba(10,8,18,0.97))',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,123,0,0.1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => setSelectedWriter(null)}
                  className="absolute top-3 right-3 text-white/40 hover:text-[#ff7b00] transition-colors">
            <X size={20} />
          </button>

          <div className="relative w-[84px] h-[84px] rounded-full overflow-hidden mx-auto mb-4"
               style={{ boxShadow: '0 0 0 2px rgba(255,123,0,0.4), 0 0 20px rgba(255,123,0,0.2)' }}>
            {!imageErrors[`author-modal-${selectedWriter.id}`] ? (
              <Image src={resolveImageUrl(selectedWriter.avatar) || DEFAULT_AUTHOR_AVATAR} alt={selectedWriter.name}
                     fill className="object-cover"
                     onError={() => setImageErrors(p => ({...p, [`author-modal-${selectedWriter.id}`]: true}))} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#ff7b00]/30 to-[#7c3aed]/30">
                <span className="text-white text-2xl font-bold">{selectedWriter.name[0]}</span>
              </div>
            )}
          </div>

          <h3 className="text-lg font-bold text-white mb-1">{selectedWriter.name}</h3>
          <p className="text-sm mb-3 italic" style={{ color: '#ff9040' }}>"{selectedWriter.preview}"</p>
          <p className="text-sm text-white/55 leading-relaxed text-left mb-5">{selectedWriter.bio}</p>

          <div className="text-left rounded-xl p-4"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: '#ff9040' }}>
              <BookOpen size={15} />
              <span className="text-sm font-semibold">Son Yazısı</span>
            </div>
            <p className="text-sm font-medium text-white/85 mb-1">{selectedWriter.lastPost.title}</p>
            <p className="text-xs text-white/40 leading-snug mb-3">{selectedWriter.lastPost.preview}</p>
            <Link href={selectedWriter.lastPost.link}
                  className="text-xs font-semibold hover:underline transition-colors inline-block"
                  style={{ color: '#ff9040' }}
                  onClick={() => setSelectedWriter(null)}>
              Devamını oku →
            </Link>
          </div>
        </div>
      </div>
    )}
  </>
  )
}

