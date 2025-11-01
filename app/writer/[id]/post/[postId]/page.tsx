'use client'

import { useParams } from 'next/navigation'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import Link from 'next/link'
import { Socket } from 'socket.io-client'
import { initCommentsSocket } from '@/lib/socket'
import { useAuthStore } from '@/lib/store'

// 🔹 Geçici veriler (sonradan backend'den çekilecek)
const WRITERS = [
  {
    id: 'zeynep',
    name: 'Zeynep Esmer',
    image: '/users/zeynep.jpg',
    posts: [
      {
        id: '1',
        title: 'Duyguların Malzemesi: Hafıza ve Nesneler Arasında',
        date: '12 Ekim 2025',
        readTime: '3 dk',
        cover: '/covers/art-memory.jpg',
        content: `Sanat, yalnızca biçimsel bir anlatı değildir. Her nesne, bir duygunun taşıyıcısıdır. 
Nesneler yalnızca fiziksel değil, duygusal bir hafıza oluştururlar. 
Bu yazı, malzeme ve duygu arasındaki görünmez bağı, sanatın sessiz diliyle açığa çıkarır.

Bir heykelin dokusunda, bir resmin katmanlarında, bir çizimin yüzeyinde... 
Her birinde geçmişin yankısı gizlidir. 
Sanat, belleğin görünür hale gelme biçimidir.`,
      },
      {
        id: '2',
        title: 'Sanat ve Sessizlik Arasında',
        date: '20 Eylül 2025',
        readTime: '4 dk',
        cover: '/covers/art-silence.jpg',
        content: `Sanat sessizlikte büyür. Bu yazıda, sessizliğin bir sanat formu olarak nasıl anlam kazandığını inceliyorum.

Sessizlik, yalnızca boşluk değildir. O, düşüncenin en yoğun olduğu anı işaret eder.
Çağdaş sanatta sessizlik, bir protestodur, bir yansımadır, bir çağrıdır.`,
      },
    ],
  },
  {
    id: 'sude',
    name: 'Sude Esmer',
    image: '/users/sude.jpg',
    posts: [
      {
        id: '1',
        title: 'Sessiz Dönüşüm: Atığın Estetiği',
        date: '10 Ekim 2025',
        readTime: '5 dk',
        cover: '/covers/recycle-art.jpg',
        content: `Bir atığın dönüşümü, yalnızca malzemenin değil, düşüncenin de dönüşümüdür. 
Sanatçılar, artıklarla yeniden hayat verirken, etik ve estetik arasındaki çizgiyi sorgularlar.

Bu yazı, atığın estetik potansiyelini, kültürel bir hafıza nesnesi olarak yeniden düşünmeyi önerir.
Atık, yalnızca çevresel bir sorun değil; aynı zamanda toplumsal belleğin bir parçasıdır.`,
      },
      {
        id: '2',
        title: 'Kültürel Bellek Üzerine Notlar',
        date: '2 Eylül 2025',
        readTime: '4 dk',
        cover: '/covers/cultural-memory.jpg',
        content: `Toplumsal hafıza, yalnızca geçmişi saklamak değil; bugünü anlamlandırmanın da bir yoludur.

Kültürel bellek, bir toplumun kolektif bilincidir. 
Bu yazıda, sanatın bu bilinci nasıl taşıdığını ve aktardığını inceliyoruz.`,
      },
    ],
  },
]

export default function PostDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const postId = params?.postId as string
  
  const writer = WRITERS.find((w) => w.id === id)
  const post = writer?.posts.find((p) => p.id === postId)

  const [comments, setComments] = useState([
    { id: 1, user: 'Sude', text: 'Gerçekten etkileyici bir yazı!' },
    { id: 2, user: 'Zeynep', text: 'Bellek kavramına güzel bir bakış olmuş.' },
  ])
  const [newComment, setNewComment] = useState('')
  const commentsSocketRef = useRef<Socket | null>(null)
  const { accessToken, user } = useAuthStore()

  // 🧡 Socket bağlantısı
  useEffect(() => {
    if (!accessToken || !postId) return

    commentsSocketRef.current = initCommentsSocket(accessToken)

    const socket = commentsSocketRef.current

    // Yazı odasına katıl
    socket.emit('joinPostRoom', postId)

    // Yeni yorumları dinle
    socket.on('newComment', (comment: { id: number; user: string; text: string }) => {
      setComments((prev) => {
        // Çift eklemeyi önle
        if (prev.some((c) => c.id === comment.id)) {
          return prev
        }
        return [...prev, comment]
      })
    })

    socket.on('connect', () => {
      console.log('✅ Comments socket connected')
    })

    socket.on('disconnect', () => {
      console.log('❌ Comments socket disconnected')
    })

    return () => {
      socket.emit('leavePostRoom', postId)
      socket.off('newComment')
      socket.off('connect')
      socket.off('disconnect')
      socket.disconnect()
    }
  }, [accessToken, postId])

  if (!writer || !post) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600 dark:text-gray-300">
        Yazı bulunamadı.
      </div>
    )
  }

  const handleAddComment = () => {
    if (!newComment.trim() || !commentsSocketRef.current) return

    const commentData = {
      id: Date.now(),
      user: user?.fullName || user?.username || 'Ziyaretçi',
      text: newComment.trim(),
    }

    // 🟠 Socket üzerinden gönder (backend tüm kullanıcılara yayınlayacak ve bildirim gönderecek)
    commentsSocketRef.current.emit('newComment', {
      postId,
      comment: commentData,
      userId: user?.id, // Backend'de bildirim için gerekli
    })

    // 🟠 Local state'e ekle (optimistic update - anında görünmesi için)
    setComments((prev) => [...prev, commentData])

    setNewComment('')
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddComment()
    }
  }

  return (
    <main className="flex flex-col items-center pt-24 pb-16 px-6">
      <article className="w-full max-w-[750px]">
        {/* Başlık */}
        <h1 className="text-2xl md:text-3xl font-semibold text-[#111] dark:text-white mb-2">
          {post.title}
        </h1>

        {/* Yazar bilgisi */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
          <Image
            src={writer.image}
            alt={writer.name}
            width={26}
            height={26}
            className="rounded-full object-cover border border-gray-200 dark:border-gray-700"
          />
          <span className="font-medium">{writer.name}</span>
          <span>•</span>
          <span>{post.date}</span>
          <span>•</span>
          <span>{post.readTime} okuma</span>
        </div>

        {/* Kapak Görseli */}
        {post.cover && (
          <div className="relative w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden mb-8 shadow-md border border-gray-200 dark:border-gray-700/40">
            <div className="w-full h-full bg-gradient-to-br from-orange-100/50 to-orange-200/30 dark:from-orange-950/30 dark:to-orange-900/20 flex items-center justify-center">
              <p className="text-gray-400 dark:text-gray-500 text-sm">Kapak görseli</p>
            </div>
            {/* Gerçek görsel aktif edildiğinde:
            <Image
              src={post.cover}
              alt={post.title}
              fill
              className="object-cover"
            />
            */}
          </div>
        )}

        {/* İçerik */}
        <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed mb-10 space-y-4">
          {post.content.split('\n\n').map((paragraph, i) => (
            paragraph.trim() && (
              <p key={i} className="text-base leading-relaxed">
                {paragraph.trim()}
              </p>
            )
          ))}
        </div>

        {/* Geri dön */}
        <Link
          href={`/writer/${writer.id}`}
          className="text-orange-500 dark:text-orange-400 hover:underline text-sm font-semibold inline-block mb-12 transition-colors"
        >
          ← {writer.name} sayfasına dön
        </Link>

        {/* Yorumlar */}
        <section className="mt-12 border-t border-gray-200 dark:border-gray-700/40 pt-8">
          <h2 className="text-lg font-semibold text-[#111] dark:text-white mb-6">
            💬 Yorumlar
          </h2>

          <div className="space-y-4 mb-6">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Henüz yorum yapılmamış. İlk yorumu sen yap!
              </p>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="bg-gray-50/80 dark:bg-gray-800/60 
                             p-4 rounded-xl border border-gray-200 dark:border-gray-700/40
                             hover:shadow-sm transition-all"
                >
                  <p className="text-sm font-semibold text-[#111] dark:text-white mb-1">
                    {c.user}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {c.text}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Yeni Yorum */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Yorum yaz..."
              className="flex-1 p-3 rounded-xl border border-gray-300 dark:border-gray-700 
                         bg-white dark:bg-gray-900/60 text-sm text-gray-800 dark:text-gray-100
                         focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 
                         outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button
              onClick={handleAddComment}
              className="p-3 bg-orange-500 hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-600
                       text-white rounded-xl transition-colors shadow-sm hover:shadow-md
                       disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!newComment.trim() || !commentsSocketRef.current?.connected}
            >
              <Send size={18} />
            </button>
          </div>
        </section>
      </article>
    </main>
  )
}

