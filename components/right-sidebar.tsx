'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, PenTool, X, BookOpen, Heart } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { io, Socket } from 'socket.io-client'
import api, { getApiBaseURL } from '@/lib/api'
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
  
  // 🔥 KRİTİK: Sağ sidebar feed ve explore sayfalarında görünsün
  // Ana sayfa: /feed veya / (root)
  // Keşfet: /explore
  // Koleksiyonlar sayfasında görünmesin
  const isHomePage = pathname === '/feed' || pathname === '/'
  const isExplore = pathname === '/explore'
  const isFeed = pathname === '/feed'
  const isCollections = pathname === '/collections'
  
  // Mode prop'u yoksa pathname'den otomatik belirle
  const sidebarMode = mode || (isExplore ? 'explore' : isHomePage ? 'feed' : null)
  
  // Ana sayfa veya explore değilse veya koleksiyonlar sayfasındaysa hiçbir şey render etme
  if ((!isHomePage && !isExplore) || isCollections) {
    return null
  }
  
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [selectedWriter, setSelectedWriter] = useState<Author | null>(null)
  const [topLikedArticles, setTopLikedArticles] = useState<any[]>([])
  const [museums, setMuseums] = useState<any[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [explorePosts, setExplorePosts] = useState<Author[]>([])

  // 📊 Global sidebar verilerini yükle - feed ve explore sayfalarında
  useEffect(() => {
    // Ana sayfa veya explore değilse hiçbir şey yapma
    if (!isHomePage && !isExplore) return

    // 🔥 Explore modunda sadece güncel yazıları yükle
    if (sidebarMode === 'explore') {
      const fetchExplorePosts = async () => {
        try {
          // Her fetch'te farklı sonuç için timestamp ekle (cache bypass)
          const res = await api.get(`/sidebar/explore/posts?limit=5&_t=${Date.now()}`)
          const posts = res.data || []
          setExplorePosts(posts)
        } catch (err) {
          console.error('Explore yazıları alınamadı', err)
          setExplorePosts([])
        }
      }
      fetchExplorePosts()
      return // Explore modunda global veri yükleme
    }
    
    const ensureAbsoluteUrl = (url?: string | null, fallback?: string) => {
      if (!url || url.trim() === '') return fallback ?? DEFAULT_ARTICLE_IMAGE
      if (url.startsWith('http')) {
        if (url.includes('localhost:3000')) {
          return fallback ?? DEFAULT_ARTICLE_IMAGE
        }
        return url
      }
      if (fallback) return fallback
      return DEFAULT_ARTICLE_IMAGE
    }

    const transformMuseums = (items: any[]) =>
      items.map((museum) => ({
        ...museum,
        image: ensureAbsoluteUrl(
          museum.image,
          MUSEUM_PLACEHOLDERS[museum.id] ?? DEFAULT_MUSEUM_IMAGE
        ),
      }))

    const transformAuthors = (items: any[]) =>
      items.map((author, index) => ({
        ...author,
        avatar: ensureAbsoluteUrl(author.avatar, DEFAULT_AUTHOR_AVATAR),
        preview:
          author.preview ||
          (index === 0
            ? 'Duyguların izi her eserde saklıdır.'
            : 'Bellek, malzeme ve zamanın sessiz diyaloğu.'),
      }))

    const transformArticles = (items: any[]) =>
      items.map((article) => ({
        ...article,
        coverImage: ensureAbsoluteUrl(article.coverImage, DEFAULT_ARTICLE_IMAGE),
        author: article.author
          ? {
              ...article.author,
              avatar: ensureAbsoluteUrl(article.author.avatar, DEFAULT_AUTHOR_AVATAR),
            }
          : article.author,
      }))

    const fetchGlobalData = async () => {
      try {
        const res = await api.get('/sidebar/global')
        // ✅ Backend'den gelen dinamik verileri kullan
        setMuseums(transformMuseums(res.data.museums || []))
        setAuthors(transformAuthors(res.data.authors || []))
        setTopLikedArticles(transformArticles(res.data.topLikedArticles || []))
      } catch (err) {
        console.error('Sidebar verisi alınamadı', err)
        // Fallback: Eğer API çalışmazsa minimal fallback verileri kullan
        setMuseums([
          { 
            id: 1, 
            name: 'İstanbul Modern', 
            image: MUSEUM_PLACEHOLDERS[1],
            color: 'from-[#f97316]/80 to-[#fbbf24]/60'
          },
          { 
            id: 2, 
            name: 'Pera Müzesi', 
            image: MUSEUM_PLACEHOLDERS[2],
            color: 'from-[#fb923c]/80 to-[#fed7aa]/60'
          },
          { 
            id: 3, 
            name: 'Odunpazarı Müzesi', 
            image: MUSEUM_PLACEHOLDERS[3],
            color: 'from-[#fcd34d]/80 to-[#fde68a]/60'
          },
          { 
            id: 4, 
            name: 'Sabancı Müzesi', 
            image: MUSEUM_PLACEHOLDERS[4],
            color: 'from-[#f59e0b]/80 to-[#fcd34d]/60'
          },
        ])
        // ✅ Ayın Yazarları için fallback kaldırıldı - backend'den dinamik gelecek
        setAuthors([])
        setTopLikedArticles([])
      }
    }

    fetchGlobalData()

    // 🔥 Socket.IO bağlantısı - gerçek zamanlı güncelleme (sadece feed sayfasında)
    let socket: Socket | null = null
    
    if (isHomePage && sidebarMode === 'feed') {
      const baseURL = getApiBaseURL()
      socket = io(baseURL, {
        transports: ['websocket'],
      })

      socket.on('connect', () => {
        console.log('Sidebar socket bağlı')
      })

      socket.on('sidebarUpdate', (newData: any) => {
        console.log('Sidebar güncellendi:', newData)
        setMuseums(transformMuseums(newData.museums || []))
        setAuthors(transformAuthors(newData.authors || []))
        setTopLikedArticles(transformArticles(newData.topLikedArticles || []))
      })

      socket.on('connect_error', (error) => {
        console.error('Sidebar socket bağlantı hatası:', error)
      })
    }

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [isHomePage, isExplore, sidebarMode])

  return (
    <>
    <aside
      className={`hidden lg:flex flex-col
                 w-full overflow-y-auto
                 pb-8
                 text-[#111] dark:text-gray-100`}
    >
      {/* İçerik wrapper - feed ve explore için üstten boşluk, orta içerik ile aynı hizada başlamalı */}
      <div className={`w-full flex flex-col ${(isFeed || isExplore) ? 'mt-0 pt-4' : 'pt-4'}`}>
        {/* 🔥 Explore modunda sadece yazarlar gösterilir */}
        {sidebarMode === 'explore' ? (
          <>
            {/* ✍️ Keşfet Yazıları */}
            <div className="w-full">
              <h3 className="text-xl font-semibold mb-4 text-[#ff7b00] tracking-wide">
                Keşfet Yazıları
              </h3>
              <div className="space-y-4">
                {explorePosts.length > 0 ? (
                  explorePosts.map((post) => (
                    <Link
                      key={post.id}
                      href={
                        post.lastPost?.link?.includes('feed?post=')
                          ? `/explore?post=${post.id}`
                          : post.lastPost?.link || `/articles/${post.id}`
                      }
                      className="flex items-start gap-3 p-3 rounded-xl
                                 bg-gray-50 dark:bg-gray-800/50
                                 border border-[rgba(40,120,255,0.25)] dark:border-[rgba(40,120,255,0.15)]
                                 shadow-sm hover:shadow-md hover:-translate-y-[2px]
                                 transition-all cursor-pointer group"
                    >
                      {/* Profil resmi */}
                      <div className="relative w-[42px] h-[42px] rounded-full overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                        {!imageErrors[`author-${post.id}`] ? (
                          <img
                            src={resolveImageUrl(post.avatar)}
                            alt={post.name}
                            className="object-cover w-full h-full"
                            onError={() => {
                              setImageErrors((prev) => ({ ...prev, [`author-${post.id}`]: true }))
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-gray-500 dark:text-gray-400 text-sm font-semibold">
                              {post.name[0]}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Yazı başlığı ve yazar adı */}
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm font-semibold text-[#222] dark:text-gray-100 mb-1">
                          {post.lastPost?.title || 'Yazı'}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                          {post.name}
                        </p>
                        {post.preview && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-1">
                            "{post.preview}"
                          </p>
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                    Henüz yeni yazı yok
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 🏛️ Ayın Müzeleri - Her zaman 2x2 grid (4 slot) - Kurumsal hesaplar otomatik hesaplanan */}
            <div className="w-full">
              {/* 🔥 KRİTİK: Başlık font boyutu artırıldı - daha profesyonel görünüm */}
              <h3 className="text-xl font-semibold mb-5 mt-0 bg-gradient-to-r from-brand-orange to-brand-blue bg-clip-text text-transparent dark:from-orange-400 dark:to-blue-400 tracking-wide">
                Ayın Müzeleri
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }, (_, i) => {
                  const museum = museums[i] || null;
                  return museum ? (
                    <Link
                      key={museum.id}
                      href={`/profile/${museum.username || museum.id}`}
                      className="relative rounded-2xl overflow-hidden border border-[rgba(40,120,255,0.35)] dark:border-[rgba(40,120,255,0.15)] shadow-sm hover:shadow-md cursor-pointer group transition-all duration-200"
                    >
                      {/* Background gradient fallback */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${museum.color} opacity-90 z-0`} />
                      <div className="relative w-full h-[110px] overflow-hidden z-10">
                        {!imageErrors[`museum-${museum.id}`] ? (
                          <img
                            src={resolveImageUrl(museum.image)}
                            alt={museum.name}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200 relative z-10"
                            onError={() => {
                              setImageErrors((prev) => ({ ...prev, [`museum-${museum.id}`]: true }))
                            }}
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${museum.color} opacity-90`} />
                        )}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end justify-center p-2 z-20">
                        <p className="text-white text-xs font-medium text-center drop-shadow-sm">
                          {museum.name}
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <div
                      key={`empty-${i}`}
                      className="relative rounded-2xl border border-[rgba(40,120,255,0.35)] dark:border-[rgba(40,120,255,0.15)] bg-gray-50 dark:bg-white/5 h-[110px]"
                    />
                  );
                })}
              </div>
            </div>

        {/* 🔥 En Çok Beğenilenler */}
        {topLikedArticles.length > 0 && (
          <div className="mt-10">
          {/* 🔥 KRİTİK: Başlık font boyutu artırıldı - daha profesyonel görünüm */}
          <h3 className="text-xl font-semibold mb-4 text-[#ff7b00] tracking-wide">
            En Çok Beğenilenler
          </h3>
          <div className="space-y-3">
            {topLikedArticles.map((article, index) => (
              <Link
                key={article.id}
                href={`/articles/${article.id}`}
                className="block p-3 rounded-xl
                         bg-gray-50 dark:bg-gray-800/50
                         border border-[rgba(40,120,255,0.25)] dark:border-[rgba(40,120,255,0.15)]
                         hover:bg-orange-50/70 dark:hover:bg-orange-500/10
                         hover:border-[rgba(40,120,255,0.4)] dark:hover:border-[rgba(40,120,255,0.25)]
                         transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#222] dark:text-gray-100 line-clamp-2 mb-1 group-hover:text-[#ff7b00] transition-colors">
                      {article.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{article.author?.fullName || article.author?.username}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Heart size={12} className="text-[#ff7b00] fill-[#ff7b00]" />
                        <span>{article.totalLikes || 0}</span>
                      </div>
                    </div>
                  </div>
                  {index === 0 && topLikedArticles.length > 0 && (
                    <div className="flex-shrink-0">
                      <span className="text-xs font-bold text-[#ff7b00] bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                        #1
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
            </div>
          </div>
        )}

        {/* ✍️ Aktif Yazarlar - 2x2 Grid (Ayın Müzeleri ile aynı yapı) */}
        <div className="mt-10">
        {/* 🔥 KRİTİK: Başlık font boyutu artırıldı - daha profesyonel görünüm */}
        <h3 className="text-xl font-semibold mb-5 mt-0 bg-gradient-to-r from-brand-orange to-brand-blue bg-clip-text text-transparent dark:from-orange-400 dark:to-blue-400 tracking-wide">
          Aktif Yazarlar
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }, (_, i) => {
            const author = authors[i] || null;
            return author ? (
              <Link
                key={author.id}
                href={`/profile/${author.slug || author.id}`}
                className="relative rounded-2xl overflow-hidden border border-[rgba(40,120,255,0.35)] dark:border-[rgba(40,120,255,0.15)] shadow-sm hover:shadow-md cursor-pointer group transition-all duration-200"
              >
                {/* Profil görseli - Kartın tamamını doldurur */}
                <div className="relative w-full h-[110px] overflow-hidden">
                  {!imageErrors[`author-${author.id}`] ? (
                    <img
                      src={resolveImageUrl(author.avatar)}
                      alt={author.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                      onError={() => {
                        setImageErrors((prev) => ({ ...prev, [`author-${author.id}`]: true }))
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-orange-500/20 flex items-center justify-center">
                      <span className="text-gray-600 dark:text-gray-400 text-2xl font-semibold">
                        {author.name[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>
                {/* Gradient overlay ve isim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end justify-center p-2">
                  <p className="text-white text-xs font-medium text-center drop-shadow-sm">
                    {author.name}
                  </p>
                </div>
              </Link>
            ) : (
              <div
                key={`empty-author-${i}`}
                className="relative rounded-2xl border border-[rgba(40,120,255,0.35)] dark:border-[rgba(40,120,255,0.15)] bg-gray-50 dark:bg-white/5 h-[110px] opacity-50"
              />
            );
          })}
        </div>
        </div>

        {/* 📚 Tüm Yayınlanan Yazıları Gör Butonu - Modern Tasarım (sadece feed modunda) */}
        {sidebarMode === 'feed' && (
          <div className="mt-10 pt-6 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-center">
            <Link
              href="/articles/published"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 
                         bg-[#ff7b00] text-white font-medium text-sm rounded-xl 
                         shadow-sm hover:bg-[#e36f00] hover:shadow-md 
                         transition-all duration-300 ease-out
                         dark:bg-[#ff7b00]/90 dark:hover:bg-[#ff7b00] 
                         focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/50
                         group"
            >
              <span>Tüm Yayınlanan Yazıları Gör</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>
        )}
          </>
        )}
      </div>
    </aside>

    {/* 🟠 Yazar Detay Modal */}
    {selectedWriter && (
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center 
                   bg-black/50 backdrop-blur-sm animate-in"
        onClick={(e) => {
          // Modal dışına tıklanınca kapat
          if (e.target === e.currentTarget) {
            setSelectedWriter(null)
          }
        }}
      >
        <div 
          className="relative w-[450px] max-w-[90vw] 
                     bg-white/80 dark:bg-[#111]/85 
                     backdrop-blur-lg 
                     border border-gray-200 dark:border-white/10 
                     rounded-2xl shadow-2xl p-7 text-center
                     animate-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Kapatma butonu */}
          <button
            onClick={() => setSelectedWriter(null)}
            className="absolute top-3 right-3 text-gray-600 dark:text-gray-300 
                     hover:text-orange-500 dark:hover:text-orange-400 
                     transition-colors"
          >
            <X size={20} />
          </button>

          {/* Profil foto */}
          <div className="relative w-[90px] h-[90px] rounded-full overflow-hidden mx-auto mb-4 
                        border-2 border-orange-400/60 dark:border-orange-500/60">
            {!imageErrors[`author-modal-${selectedWriter.id}`] ? (
              <Image
                src={resolveImageUrl(selectedWriter.avatar) || DEFAULT_AUTHOR_AVATAR}
                alt={selectedWriter.name}
                fill
                className="object-cover"
                onError={() => {
                  setImageErrors((prev) => ({ ...prev, [`author-modal-${selectedWriter.id}`]: true }))
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                <span className="text-gray-500 dark:text-gray-400 text-2xl font-semibold">
                  {selectedWriter.name[0]}
                </span>
              </div>
            )}
          </div>

          {/* İsim */}
          <h3 className="text-lg font-semibold text-[#111] dark:text-white mb-2">
            {selectedWriter.name}
          </h3>

          {/* Alıntı */}
          <p className="text-sm text-orange-500 dark:text-orange-400 mb-3 italic">
            "{selectedWriter.preview}"
          </p>

          {/* Biyografi */}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left mb-5">
            {selectedWriter.bio}
          </p>

          {/* Son Yazısı */}
          <div className="text-left bg-gray-50/60 dark:bg-gray-800/60 
                          rounded-xl p-4 border border-gray-200 dark:border-gray-700/40">
            <div className="flex items-center gap-2 mb-2 text-orange-500 dark:text-orange-400">
              <BookOpen size={16} />
              <span className="text-sm font-semibold">Son Yazısı</span>
            </div>

            <p className="text-sm font-medium text-[#222] dark:text-gray-100 mb-1">
              {selectedWriter.lastPost.title}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug mb-3">
              {selectedWriter.lastPost.preview}
            </p>

            <Link
              href={selectedWriter.lastPost.link}
              className="text-xs font-semibold text-orange-500 dark:text-orange-400 
                       hover:underline transition-colors inline-block"
              onClick={() => setSelectedWriter(null)}
            >
              Devamını oku →
            </Link>
          </div>
        </div>
      </div>
    )}
  </>
  )
}

