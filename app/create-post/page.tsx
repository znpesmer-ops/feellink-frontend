'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Image as ImageIcon, Save, X, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import { initPostsSocket } from '@/lib/socket'

function CreatePostContent() {
  const router = useRouter()
  const { accessToken, user } = useAuthStore()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [cover, setCover] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const DRAFT_KEY = 'draft-post-feellink'

  // 🔹 Sayfa açıldığında localStorage'dan taslağı yükle
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft) {
        const parsed = JSON.parse(draft)
        if (parsed.title) setTitle(parsed.title)
        if (parsed.content) setContent(parsed.content)
        if (parsed.cover) setCover(parsed.cover)
      }
    } catch (error) {
      console.error('Error loading draft:', error)
    }
  }, [])

  // 🔹 Otomatik kaydet (debounce - 1.5 saniye)
  useEffect(() => {
    // Boş ise kaydetme
    if (!title.trim() && !content.trim() && !cover) return

    setSaving(true)
    setSaved(false)

    // Önceki timeout'u temizle
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // 1.5 saniye sonra kaydet
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const draft = {
          title,
          content,
          cover, // Base64 string olarak kaydediliyor
        }
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
        setSaving(false)
        setSaved(true)
        
        // 3 saniye sonra "kaydedildi" mesajını gizle
        setTimeout(() => {
          setSaved(false)
        }, 3000)
      } catch (error) {
        console.error('Error saving draft:', error)
        setSaving(false)
      }
    }, 1500)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [title, content, cover])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setCover(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeCover = () => {
    setCover(null)
    setCoverFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Başlık ve içerik boş olamaz!')
      return
    }

    setIsSaving(true)
    try {
      // TODO: Backend API entegrasyonu
      // const formData = new FormData()
      // formData.append('title', title)
      // formData.append('content', content)
      // if (coverFile) {
      //   formData.append('cover', coverFile)
      // }
      // await api.post('/posts/write', formData)
      
      // 📝 Yazı objesi oluştur
      const newPost = {
        id: `post_${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        cover: cover || null,
        author: user?.fullName || user?.username || 'Anonim',
        authorUsername: user?.username || 'anonim',
        authorAvatar: user?.avatar || null,
        likes: 0,
        likedBy: [] as string[],
        reads: 0,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        source: 'user', // ✅ Yazı panelinden geldiğini işaretle
      }

      // 🧡 Socket.IO ile backend'e gönder (global store'a ekleyecek)
      if (accessToken) {
        try {
          const postsSocket = initPostsSocket(accessToken)
          // Backend'de createPost handler'ı çağrılacak ve tüm kullanıcılara yayınlanacak
          postsSocket.emit('createPost', newPost)
          console.log('📡 New post sent to global store via socket')
          
          // LocalStorage'a da ekle (fallback ve hızlı erişim için)
          const existingPosts = JSON.parse(localStorage.getItem('published-posts-feellink') || '[]')
          const updatedPosts = [newPost, ...existingPosts]
          localStorage.setItem('published-posts-feellink', JSON.stringify(updatedPosts))
        } catch (socketError) {
          console.warn('Socket error:', socketError)
          // Socket hatası durumunda localStorage'a kaydet
          const existingPosts = JSON.parse(localStorage.getItem('published-posts-feellink') || '[]')
          const updatedPosts = [newPost, ...existingPosts]
          localStorage.setItem('published-posts-feellink', JSON.stringify(updatedPosts))
        }
      }
      
      // Yayınlandıktan sonra taslağı temizle
      localStorage.removeItem(DRAFT_KEY)
      
      alert('Yazı başarıyla yayımlandı!')
      router.push('/all-posts')
    } catch (error) {
      console.error('Error publishing post:', error)
      alert('Yazı yayımlanırken bir hata oluştu.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!accessToken) {
    return null
  }

  return (
    <main className="flex flex-col items-center w-full pt-24 pb-16 px-6 min-h-screen bg-white dark:bg-[#0a0a0a]">
      <div className="w-full max-w-[700px] relative">
        {/* 🔸 Kaydetme göstergesi */}
        {(saving || saved) && (
          <div className="absolute -top-10 right-0 text-sm flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
            {saving ? (
              <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <span className="animate-pulse">💾</span>
                <span>Kaydediliyor...</span>
              </span>
            ) : saved ? (
              <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle size={16} className="text-green-500" />
                <span>Taslak kaydedildi</span>
              </span>
            ) : null}
          </div>
        )}

        {/* Kapak görseli */}
        <div className="mb-8">
          {cover ? (
            <div className="relative group">
              <img
                src={cover}
                alt="cover"
                className="w-full h-[350px] md:h-[400px] object-cover rounded-xl mb-3 shadow-lg border border-gray-200/50 dark:border-gray-700/40"
              />
              <button
                onClick={removeCover}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors opacity-0 group-hover:opacity-100"
                type="button"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <label className="block w-full h-[250px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#ff7b00]/50 dark:hover:border-[#ff7b00]/50 hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-all group">
              <ImageIcon size={32} className="text-gray-400 dark:text-gray-500 mb-3 group-hover:text-[#ff7b00] transition-colors" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-[#ff7b00] transition-colors">
                Kapak görseli yükle
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Başlık */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Başlık..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-800 focus:border-[#ff7b00] outline-none pb-4 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-600"
          />
        </div>

        {/* İçerik */}
        <div className="mb-8">
          <textarea
            placeholder="Yazınızı buraya yazın..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="w-full text-lg text-gray-800 dark:text-gray-200 bg-transparent border-0 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 resize-none leading-relaxed"
            style={{ minHeight: '500px' }}
          />
        </div>

        {/* Kaydet butonu */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
            disabled={isSaving}
          >
            İptal
          </button>
          <button
            onClick={handlePublish}
            disabled={isSaving || !title.trim() || !content.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#ff7b00] hover:bg-[#e36f00] text-white rounded-xl shadow-sm transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {isSaving ? 'Yayımlanıyor...' : 'Yayınla'}
          </button>
        </div>
      </div>
    </main>
  )
}

export default function CreatePostPage() {
  return (
    <AuthGuard>
      <CreatePostContent />
    </AuthGuard>
  )
}

