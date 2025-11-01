'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import PostCard from '@/components/PostCard'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import { initPostsSocket } from '@/lib/socket'
import { Search } from 'lucide-react'

type FilterType = 'latest' | 'popular' | 'read'

function AllPostsContent() {
  const router = useRouter()
  const { accessToken, user } = useAuthStore()
  const [posts, setPosts] = useState<any[]>([])
  const [filter, setFilter] = useState<FilterType>('latest')
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    // 🧡 Socket.IO ile global yazı listesini al
    const postsSocket = initPostsSocket(accessToken)
    
    // İlk bağlantıda tüm yazıları iste
    postsSocket.emit('getPosts')
    
    // Backend'den gelen güncel yazı listesini dinle
    postsSocket.on('updatePosts', (allPosts: any[]) => {
      console.log('📥 Global posts list received:', allPosts.length)
      // Sadece "user" source'lu yazıları filtrele
      const filtered = allPosts.filter((p: any) => p.source === 'user')
      setPosts(filtered)
      setIsLoading(false)
      
      // LocalStorage'a da kaydet (fallback için)
      localStorage.setItem('published-posts-feellink', JSON.stringify(allPosts))
      
      // Custom event dispatch (sidebar güncellenmesi için)
      window.dispatchEvent(new CustomEvent('localPostsUpdated'))
    })

    // Eski newPost eventi için geriye uyumluluk
    postsSocket.on('newPost', (post: any) => {
      console.log('📝 New post received (legacy):', post)
      if (post.source === 'user') {
        // updatePosts eventi gelecek, bu yüzden burada sadece log
        setPosts((prev) => {
          if (prev.some((p) => p.id === post.id)) {
            return prev
          }
          return [post, ...prev]
        })
      }
    })

    // Bağlantı durumunu dinle
    postsSocket.on('connect', () => {
      console.log('✅ Posts socket connected, requesting posts...')
      // Bağlandığında tekrar iste
      postsSocket.emit('getPosts')
    })

    postsSocket.on('disconnect', () => {
      console.log('❌ Posts socket disconnected')
    })

    return () => {
      postsSocket.off('updatePosts')
      postsSocket.off('newPost')
      postsSocket.off('connect')
      postsSocket.off('disconnect')
      postsSocket.disconnect()
    }
  }, [accessToken])

  // Beğeni handler - Global store ile senkronize
  const handleLike = (postId: string) => {
    if (!accessToken) return

    const post = posts.find((p) => p.id === postId)
    if (!post) return

    const isLiked = post.likedBy?.includes(user?.id || '')
    const likedBy = post.likedBy || []
    
    const updatedPost = {
      ...post,
      likes: isLiked ? post.likes - 1 : post.likes + 1,
      likedBy: isLiked 
        ? likedBy.filter((id: string) => id !== user?.id)
        : [...likedBy, user?.id || ''],
    }

    // Optimistic update
    setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)))

    // Global store'a bildir
    const postsSocket = initPostsSocket(accessToken)
    postsSocket.emit('updatePostLike', {
      postId,
      likes: updatedPost.likes,
      likedBy: updatedPost.likedBy,
    })

    // LocalStorage'ı da güncelle (fallback için)
    const saved = JSON.parse(localStorage.getItem('published-posts-feellink') || '[]')
    const updatedSaved = saved.map((p: any) => (p.id === postId ? updatedPost : p))
    localStorage.setItem('published-posts-feellink', JSON.stringify(updatedSaved))
    
    // Custom event dispatch (sidebar güncellenmesi için)
    window.dispatchEvent(new CustomEvent('localPostsUpdated'))
  }

  // 🔍 Akıllı arama ve filtreleme (useMemo ile optimize edilmiş)
  const sortedPosts = useMemo(() => {
    let filtered = [...posts]

    // Arama filtresi (başlık, yazar, içerik)
    if (query.trim()) {
      const searchQuery = query.toLowerCase().trim()
      filtered = filtered.filter((p) => {
        const titleMatch = p.title?.toLowerCase().includes(searchQuery) || false
        const authorMatch = p.author?.toLowerCase().includes(searchQuery) || 
                           p.authorUsername?.toLowerCase().includes(searchQuery) || false
        const contentMatch = p.content?.toLowerCase().includes(searchQuery) || false
        return titleMatch || authorMatch || contentMatch
      })
    }

    // Sıralama (filtreye göre)
    filtered.sort((a, b) => {
      if (filter === 'popular') {
        return (b.likes || 0) - (a.likes || 0)
      }
      if (filter === 'read') {
        return (b.reads || 0) - (a.reads || 0)
      }
      // latest - en yeni
      return new Date(b.createdAt || b.date || b.id).getTime() - new Date(a.createdAt || a.date || a.id).getTime()
    })

    return filtered
  }, [posts, filter, query])

  if (!accessToken) {
    return null
  }

  return (
    <main className="flex flex-col items-center pt-24 pb-16 px-6 min-h-screen bg-white dark:bg-[#0a0a0a]">
      <div className="w-full max-w-[750px]">
        {/* Başlık, Arama ve Filtre */}
        <div className="flex flex-col gap-4 mb-8">
          <h1 className="text-2xl font-semibold text-[#111] dark:text-white">
            📝 Tüm Yazılar
          </h1>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* 🔍 Arama Kutusu */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Ara (yazar, başlık, içerik...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/70 dark:bg-[#111]/70 
                           border border-gray-300 dark:border-gray-700 
                           rounded-lg text-sm text-gray-700 dark:text-gray-300 
                           placeholder:text-gray-400 dark:placeholder:text-gray-500
                           outline-none focus:ring-2 focus:ring-[#ff7b00] 
                           focus:border-[#ff7b00] transition-all"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  type="button"
                  aria-label="Temizle"
                >
                  <span className="text-lg">×</span>
                </button>
              )}
            </div>

            {/* 📊 Filtre */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="text-sm bg-white/70 dark:bg-[#111]/70 border border-gray-300 dark:border-gray-700 
                         rounded-lg px-4 py-2.5 text-gray-700 dark:text-gray-300 
                         outline-none focus:ring-2 focus:ring-[#ff7b00] 
                         focus:border-[#ff7b00] transition-all cursor-pointer
                         min-w-[180px]"
            >
              <option value="latest">En Yeni</option>
              <option value="popular">En Çok Beğenilen</option>
              <option value="read">En Çok Okunan</option>
            </select>
          </div>

          {/* Arama sonuç sayısı */}
          {query.trim() && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-[#ff7b00]">{sortedPosts.length}</span> sonuç bulundu
              {query && (
                <span className="ml-2">
                  <span className="text-gray-400">"</span>
                  <span className="font-medium">{query}</span>
                  <span className="text-gray-400">"</span>
                </span>
              )}
            </p>
          )}
        </div>

        {/* Yazılar Listesi */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff7b00]"></div>
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="text-center py-20">
            {query.trim() ? (
              <>
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                  Aradığınız kriterlerde yazı bulunamadı
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                  Farklı anahtar kelimeler deneyebilir veya filtreleri değiştirebilirsiniz
                </p>
                <button
                  onClick={() => {
                    setQuery('')
                    setFilter('latest')
                  }}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl shadow-sm transition-colors font-medium"
                >
                  Filtreleri Temizle
                </button>
              </>
            ) : posts.length === 0 ? (
              <>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                  Henüz yazı yok
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                  İlk yazıyı yayınlamak için "Yaz" sayfasına gidin
                </p>
                <button
                  onClick={() => router.push('/create-post')}
                  className="px-5 py-2.5 bg-[#ff7b00] hover:bg-[#e36f00] text-white rounded-xl shadow-sm transition-colors font-medium"
                >
                  Yazı Oluştur
                </button>
              </>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            {sortedPosts.map((post) => (
              <PostCard key={post.id} post={post} onLike={handleLike} />
            ))}
          </div>
        )}

        {/* İstatistikler */}
        {sortedPosts.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700/40">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p className="text-2xl font-bold text-[#ff7b00]">{sortedPosts.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Toplam Yazı</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p className="text-2xl font-bold text-[#ff7b00]">
                  {sortedPosts.reduce((sum, p) => sum + (p.likes || 0), 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Toplam Beğeni</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p className="text-2xl font-bold text-[#ff7b00]">
                  {new Set(sortedPosts.map((p) => p.authorUsername || p.author)).size}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Yazar Sayısı</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function AllPostsPage() {
  return (
    <AuthGuard>
      <AllPostsContent />
    </AuthGuard>
  )
}

