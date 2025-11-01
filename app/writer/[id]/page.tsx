'use client'

import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

// 🔹 (Geçici) Yazar verileri — sonradan API'den çekilebilir
const WRITERS = [
  {
    id: 'zeynep',
    name: 'Zeynep Esmer',
    quote: 'Duyguların izi her eserde saklıdır.',
    bio: 'Çağdaş sanat pratiklerinde hafıza, duygu ve materyal ilişkisini araştıran bir sanatçı ve yazar. Feellink\'in kurucu üyelerindendir.',
    image: '/users/zeynep.jpg',
      posts: [
      {
        id: '1',
        title: 'Duyguların Malzemesi: Hafıza ve Nesneler Arasında',
        date: '12 Ekim 2025',
        readTime: '3 dk',
        preview:
          'Nesneler yalnızca fiziksel değil, duygusal taşıyıcılardır. Her malzeme, geçmişten bugüne bir iz taşır...',
      },
      {
        id: '2',
        title: 'Sanat ve Sessizlik Arasında',
        date: '20 Eylül 2025',
        readTime: '4 dk',
        preview:
          'Sanat sessizlikte büyür. Bu yazıda, sessizliğin bir sanat formu olarak nasıl anlam kazandığını inceliyorum...',
      },
    ],
  },
  {
    id: 'sude',
    name: 'Sude Esmer',
    quote: 'Bellek, malzeme ve zamanın sessiz diyaloğu.',
    bio: 'Atık malzeme ve kültürel bellek temalı üretim yapan bir sanatçı. Yazılarında sürdürülebilirlik, çevre etiği ve toplumsal hafıza üzerine odaklanır.',
    image: '/users/sude.jpg',
      posts: [
      {
        id: '1',
        title: 'Sessiz Dönüşüm: Atığın Estetiği',
        date: '10 Ekim 2025',
        readTime: '5 dk',
        preview:
          'Bir atığın güzelliğini görebilmek, yalnızca çevresel değil, etik bir farkındalıktır...',
      },
      {
        id: '2',
        title: 'Kültürel Bellek Üzerine Notlar',
        date: '2 Eylül 2025',
        readTime: '4 dk',
        preview:
          'Toplumsal hafıza, yalnızca geçmişi saklamak değil; bugünü anlamlandırmanın da bir yoludur...',
      },
    ],
  },
]

export default function WriterProfilePage() {
  const params = useParams()
  const id = params?.id as string
  const writer = WRITERS.find((w) => w.id === id)

  if (!writer) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600 dark:text-gray-300">
        Yazar bulunamadı.
      </div>
    )
  }

  return (
    <main className="flex flex-col items-center pt-24 pb-16 px-6">
      {/* 🧑‍🎨 Profil Bölümü */}
      <div className="w-full max-w-[700px] text-center mb-12">
        <div className="relative w-[120px] h-[120px] mx-auto mb-4 rounded-full overflow-hidden border-2 border-orange-400/70 dark:border-orange-500/70">
          <Image
            src={writer.image}
            alt={writer.name}
            fill
            className="object-cover"
          />
        </div>

        <h1 className="text-2xl font-semibold text-[#111] dark:text-white mb-1">
          {writer.name}
        </h1>
        <p className="text-sm text-orange-500 dark:text-orange-400 italic mt-1 mb-3">
          "{writer.quote}"
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-[600px] mx-auto">
          {writer.bio}
        </p>
      </div>

      {/* 📝 Yazılar Bölümü */}
      <div className="w-full max-w-[700px] space-y-6">
        <h2 className="text-lg font-semibold text-[#111] dark:text-white mb-2 flex items-center gap-2">
          <BookOpen className="text-orange-500 dark:text-orange-400" size={18} /> 
          Yazıları
        </h2>

        {writer.posts.map((post) => (
          <div
            key={post.id}
            className="rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 
                       border border-gray-200 dark:border-gray-700/40 
                       p-5 hover:shadow-md hover:-translate-y-[2px]
                       transition-all cursor-pointer group"
          >
            <h3 className="text-base font-semibold text-[#222] dark:text-gray-100 mb-1 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">
              {post.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {post.date} — {post.readTime} okuma
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-snug mb-3">
              {post.preview}
            </p>
            <Link
              href={`/writer/${writer.id}/post/${post.id}`}
              className="text-xs font-semibold text-orange-500 dark:text-orange-400 
                       hover:underline transition-colors inline-block"
            >
              Devamını oku →
            </Link>
          </div>
        ))}
      </div>
    </main>
  )
}

