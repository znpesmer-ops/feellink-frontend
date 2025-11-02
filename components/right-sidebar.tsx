'use client'

import { useState, useEffect } from 'react'
import { Sparkles, PenTool, X, BookOpen, Heart } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { io, Socket } from 'socket.io-client'
import api from '@/lib/api'

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

export default function RightSidebar() {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [selectedWriter, setSelectedWriter] = useState<Author | null>(null)
  const [topLikedArticles, setTopLikedArticles] = useState<any[]>([])
  const [museums, setMuseums] = useState<any[]>([])
  const [authors, setAuthors] = useState<Author[]>([])

  // 📊 Global sidebar verilerini yükle
  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        const res = await api.get('/sidebar/global')
        setMuseums(res.data.museums || [])
        setAuthors(res.data.authors || [])
        setTopLikedArticles(res.data.topLikedArticles || [])
      } catch (err) {
        console.error('Sidebar verisi alınamadı', err)
        // Fallback: Eğer API çalışmazsa eski sabit verileri kullan
        setMuseums([
          { 
            id: 1, 
            name: 'İstanbul Modern', 
            image: '/museums/modern.jpg',
            color: 'from-[#f97316]/80 to-[#fbbf24]/60'
          },
          { 
            id: 2, 
            name: 'Pera Müzesi', 
            image: '/museums/pera.jpg',
            color: 'from-[#fb923c]/80 to-[#fed7aa]/60'
          },
          { 
            id: 3, 
            name: 'Odunpazarı Müzesi', 
            image: '/museums/odunpazari.jpg',
            color: 'from-[#fcd34d]/80 to-[#fde68a]/60'
          },
          { 
            id: 4, 
            name: 'Sabancı Müzesi', 
            image: '/museums/sabanci.jpg',
            color: 'from-[#f59e0b]/80 to-[#fcd34d]/60'
          },
        ])
        setAuthors([
          {
            id: 1,
            slug: 'zeynep',
            name: 'Zeynep Esmer',
            avatar: '/users/zeynep.jpg',
            preview: 'Duyguların izi her eserde saklıdır.',
            bio: 'Çağdaş sanat pratiklerinde hafıza, duygu ve materyal ilişkisini araştıran bir sanatçı ve yazar. Feellink\'in kurucu üyelerindendir.',
            lastPost: {
              title: 'Duyguların Malzemesi: Hafıza ve Nesneler Arasında',
              preview: 'Nesneler yalnızca fiziksel değil, duygusal taşıyıcılardır. Her malzeme, geçmişten bugüne bir iz taşır. Bu yazı, sanatın duygusal hafızayı nasıl görünür kıldığını inceliyor...',
              link: '/writer/zeynep',
            },
          },
          {
            id: 2,
            slug: 'sude',
            name: 'Sude Esmer',
            avatar: '/users/sude.jpg',
            preview: 'Bellek, malzeme ve zamanın sessiz diyaloğu.',
            bio: 'Atık malzeme ve kültürel bellek temalı üretim yapan bir sanatçı. Yazılarında sürdürülebilirlik, çevre etiği ve toplumsal hafıza üzerine odaklanır.',
            lastPost: {
              title: 'Sessiz Dönüşüm: Atığın Estetiği',
              preview: 'Bir atığın güzelliğini görebilmek, yalnızca çevresel değil, etik bir farkındalıktır. Bu yazıda sanat ve atık arasındaki görünmez estetik diyaloğu keşfediyoruz...',
              link: '/writer/sude',
            },
          },
        ])
      }
    }

    fetchGlobalData()

    // 🔥 Socket.IO bağlantısı - gerçek zamanlı güncelleme
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const socket: Socket = io(baseURL, {
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      console.log('Sidebar socket bağlı')
    })

    socket.on('sidebarUpdate', (newData: any) => {
      console.log('Sidebar güncellendi:', newData)
      setMuseums(newData.museums || [])
      setAuthors(newData.authors || [])
      setTopLikedArticles(newData.topLikedArticles || [])
    })

    socket.on('connect_error', (error) => {
      console.error('Sidebar socket bağlantı hatası:', error)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return (
    <>
    <aside
      className="hidden xl:flex flex-col fixed right-6 top-16 
                 w-[380px] h-[calc(100vh-4rem)] overflow-y-auto 
                 pl-6 pr-3 pt-6 pb-8
                 border-l border-gray-200 dark:border-white/10
                 bg-white/40 dark:bg-[#0f0f0f]/40
                 backdrop-blur-md
                 shadow-sm z-40
                 text-[#111] dark:text-gray-100"
    >
      {/* 🏛️ Ayın Müzeleri */}
      <div>
        <h3 className="text-lg font-semibold mb-5 mt-0 text-[#ff7b00] tracking-wide">
          Ayın Müzeleri
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {museums.map((m) => (
            <div
              key={m.id}
              className="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer group transition-all duration-200"
            >
              {/* Background gradient fallback */}
              <div className={`absolute inset-0 bg-gradient-to-br ${m.color} opacity-90 z-0`} />
              <div className="relative w-full h-[110px] overflow-hidden z-10">
                {!imageErrors[`museum-${m.id}`] ? (
                  <img
                    src={m.image}
                    alt={m.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200 relative z-10"
                    onError={() => {
                      setImageErrors((prev) => ({ ...prev, [`museum-${m.id}`]: true }))
                    }}
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${m.color} opacity-90`} />
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end justify-center p-2 z-20">
                <p className="text-white text-xs font-medium text-center drop-shadow-sm">
                  {m.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🔥 En Çok Beğenilenler */}
      {topLikedArticles.length > 0 && (
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-4 text-[#ff7b00] tracking-wide flex items-center gap-2">
            <span>🔥</span>
            <span>En Çok Beğenilenler</span>
          </h3>
          <div className="space-y-3">
            {topLikedArticles.map((article, index) => (
              <Link
                key={article.id}
                href={`/articles/${article.id}`}
                className="block p-3 rounded-xl
                         bg-gray-50 dark:bg-gray-800/50
                         border border-gray-200 dark:border-gray-700/40
                         hover:bg-orange-50/70 dark:hover:bg-orange-500/10
                         hover:border-[#ff7b00]/30 dark:hover:border-[#ff7b00]/30
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

      {/* ✍️ Ayın Yazarları */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-4 text-[#ff7b00] tracking-wide">
          Ayın Yazarları
        </h3>
        <div className="space-y-4">
          {authors.map((a) => (
            <div
              key={a.id}
              onClick={() => setSelectedWriter(a)}
              className="flex items-start gap-3 p-3 rounded-xl
                         bg-gray-50 dark:bg-gray-800/50
                         border border-gray-200 dark:border-white/10
                         shadow-sm hover:shadow-md hover:-translate-y-[2px]
                         transition-all cursor-pointer group"
            >
              {/* Profil resmi */}
              <div className="relative w-[42px] h-[42px] rounded-full overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                {!imageErrors[`author-${a.id}`] ? (
                  <img
                    src={a.avatar}
                    alt={a.name}
                    className="object-cover w-full h-full"
                    onError={() => {
                      setImageErrors((prev) => ({ ...prev, [`author-${a.id}`]: true }))
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-500 dark:text-gray-400 text-sm font-semibold">
                      {a.name[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* İsim ve alıntı */}
              <div className="flex flex-col min-w-0">
                <p className="text-sm font-semibold text-[#222] dark:text-gray-100 mb-1">
                  {a.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                  "{a.preview}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 📚 Tüm Yayınlanan Yazıları Gör Butonu - Modern Tasarım */}
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
          <span className="text-base">📚</span>
          <span>Tüm Yayınlanan Yazıları Gör</span>
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>
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
                src={selectedWriter.avatar}
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

