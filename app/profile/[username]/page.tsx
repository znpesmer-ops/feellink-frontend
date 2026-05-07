'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ProfileSortableThreeColumnGrid } from '@/components/profile/ProfileSortableThreeColumnGrid'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import { CreatePostModal } from '@/components/create-post-modal'
import { PostModal } from '@/components/post-modal'
import UserArticles from '@/components/user-articles'
import DraftArticles from '@/components/draft-articles'
import { Plus, Grid, FileText, Calendar, Image as ImageIcon, Heart, MessageCircle, MoreVertical, Trash2, Clock, BarChart3, Lock, Sparkles } from 'lucide-react'
import { FiGrid, FiFileText, FiMessageCircle, FiImage, FiCalendar, FiClock, FiBookmark } from 'react-icons/fi'
import { initPostsSocket, initCommentsSocket } from '@/lib/socket'
import { UserBadges } from '@/components/profile/UserBadges'
import { FeellinkRoleBadge } from '@/components/FeellinkRoleBadge'
import { ROLE_METADATA, normalizeRole } from '@/lib/role-utils'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { GC_STANDARD, STALE_SHORT } from '@/lib/query-config'
import { ProfileArtworksGrid } from '@/components/profile/ProfileArtworksGrid'
import toast from 'react-hot-toast'
import { ProfileCommentsList } from '@/components/profile/ProfileCommentsList'
import { ArtistHighlights } from '@/components/profile/ArtistHighlights'
import { ProfileAnalysisPanel } from '@/components/profile/ProfileAnalysisPanel'
import { ArtGallery3D } from '@/components/gallery/ArtGallery3D'
import ZoomModal from '@/components/common/ZoomModal'
import {
  type ProfileGridSortMode,
  sortProfileItems,
  applyPostReorderInUserPostsCache,
  applyArtworkReorderInUserPostsCache,
} from '@/lib/profileGridSort'

const LS_PROFILE_SORT_POSTS = 'feellink-profile-sort-posts'
const LS_PROFILE_SORT_ARTWORKS = 'feellink-profile-sort-artworks'

function readProfileGridSortMode(key: string): ProfileGridSortMode {
  if (typeof window === 'undefined') return 'newest'
  try {
    const v = localStorage.getItem(key)
    if (v === 'newest' || v === 'oldest' || v === 'custom') return v
  } catch {
    /* ignore */
  }
  return 'newest'
}

function persistProfileGridSortMode(key: string, mode: ProfileGridSortMode) {
  try {
    localStorage.setItem(key, mode)
  } catch {
    /* ignore */
  }
}

// 🔖 Kaydedilenler Grid Component
function SavedPostsGrid() {
  const queryClient = useQueryClient()
  const { accessToken, user } = useAuthStore() // ✅ user ekle!
  const [selectedPost, setSelectedPost] = useState<any>(null)

  // Get saved posts
  const { data: savedPosts, isLoading, error } = useQuery({
    queryKey: ['saved-posts'],
    queryFn: async () => {
      console.log('🔖 [SavedPostsGrid] Fetching saved posts...')
      console.log('🔖 [SavedPostsGrid] API base URL:', api.defaults.baseURL)
      console.log('🔖 [SavedPostsGrid] Full URL:', `${api.defaults.baseURL}/posts/saved`)
      
      // ✅ KRİTİK: localStorage'dan önceki data'yı yükle (sayfa yenilendiğinde korunur!)
      const localStorageKey = `saved-posts-${user?.id || 'anonymous'}`;
      let localStorageData: any[] | null = null;
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(localStorageKey);
          if (stored) {
            localStorageData = JSON.parse(stored);
            console.log('✅ [SavedPostsGrid] localStorage\'dan yüklendi:', localStorageData?.length || 0, 'posts');
          }
        } catch (e) {
          console.warn('⚠️ [SavedPostsGrid] localStorage parse hatası:', e);
        }
      }
      
      try {
        const response = await api.get('/posts/saved')
        console.log('✅ [SavedPostsGrid] SUCCESS - Response:', {
          status: response.status,
          dataType: typeof response.data,
          isArray: Array.isArray(response.data),
          length: Array.isArray(response.data) ? response.data.length : 'N/A',
          data: response.data,
        })
        
        // ✅ EĞER BOŞ İSE DAHA DETAYLI LOG!
        if (Array.isArray(response.data) && response.data.length === 0) {
          console.warn('⚠️ [SavedPostsGrid] BACKEND BOŞ DÖNDÜ!')
          console.warn('⚠️ [SavedPostsGrid] Muhtemel sebepler:')
          console.warn('   1. Hiç kayıtlı post yok (DB query boş)')
          console.warn('   2. Backend filter çok katı (media yok diye atıyor)')
          console.warn('   3. User ID mapping hatası')
          console.warn('⚠️ [SavedPostsGrid] Vercel backend log\'larını kontrol et!')
        }
        
        const result = Array.isArray(response.data) ? response.data : (response.data?.posts || [])
        console.log('✅ [SavedPostsGrid] Final result:', result.length, 'posts')
        
        // ✅ KRİTİK: Backend boş array döndü ama localStorage'da data varsa, localStorage'ı kullan!
        if (result.length === 0 && localStorageData && localStorageData.length > 0) {
          console.warn('⚠️ [SavedPostsGrid] Backend boş döndü ama localStorage\'da data var, localStorage kullanılıyor!');
          console.warn('⚠️ [SavedPostsGrid] localStorage\'daki post sayısı:', localStorageData.length);
          return localStorageData; // ✅ localStorage'daki data'yı koru!
        }
        
        // ✅ Backend'den data geldiyse localStorage'a kaydet!
        if (result.length > 0 && typeof window !== 'undefined') {
          try {
            localStorage.setItem(localStorageKey, JSON.stringify(result));
            console.log('✅ [SavedPostsGrid] localStorage\'a kaydedildi:', result.length, 'posts');
          } catch (e) {
            console.warn('⚠️ [SavedPostsGrid] localStorage kaydetme hatası:', e);
          }
        }
        
        // ✅ İlk post detayı
        if (result.length > 0) {
          console.log('✅ [SavedPostsGrid] İLK POST:', {
            id: result[0]?.id,
            hasMedia: !!result[0]?.media,
            mediaLength: result[0]?.media?.length,
            firstMediaUrl: result[0]?.media?.[0]?.url,
          })
        }
        
        return result
      } catch (fetchError: any) {
        console.error('❌ [SavedPostsGrid] ========== FETCH ERROR ==========');
        console.error('❌ [SavedPostsGrid] Error message:', fetchError?.message);
        console.error('❌ [SavedPostsGrid] Status code:', fetchError?.response?.status);
        console.error('❌ [SavedPostsGrid] Status text:', fetchError?.response?.statusText);
        console.error('❌ [SavedPostsGrid] Error data:', fetchError?.response?.data);
        console.error('❌ [SavedPostsGrid] Request URL:', fetchError?.config?.url);
        console.error('❌ [SavedPostsGrid] Full error:', fetchError);
        
        // STATUS CODE KONTROLÜ (logout yok; auth sadece global interceptor'da yönetilir)
        if (fetchError?.response?.status === 401) {
          console.warn('🚨 [SavedPostsGrid] 401 UNAUTHORIZED - auth interceptor handles logout if needed');
        } else if (fetchError?.response?.status === 500) {
          console.error('🚨 [SavedPostsGrid] 500 INTERNAL SERVER ERROR!');
          console.error('🚨 [SavedPostsGrid] Backend crash oluyor!');
          console.error('🚨 [SavedPostsGrid] Vercel backend log\'larını kontrol et!');
        } else if (!fetchError?.response) {
          console.error('🚨 [SavedPostsGrid] NETWORK ERROR!');
          console.error('🚨 [SavedPostsGrid] Backend\'e erişilemiyor veya CORS hatası!');
        }
        
        console.error('❌ [SavedPostsGrid] ========== END ERROR ==========');
        
        // ✅ KRİTİK: Error durumunda localStorage'dan yükle!
        if (localStorageData && localStorageData.length > 0) {
          console.warn('⚠️ [SavedPostsGrid] Error ama localStorage\'da data var, localStorage kullanılıyor!');
          return localStorageData; // ✅ localStorage'daki data'yı koru!
        }
        
        // ❌ BOŞ ARRAY DÖNME! Mevcut cache'i koru!
        const cachedData = queryClient.getQueryData(['saved-posts']) as any[] | undefined;
        if (cachedData && cachedData.length > 0) {
          console.warn('⚠️ [SavedPostsGrid] Error ama cache\'de data var, cache kullanılıyor!');
          return cachedData; // ✅ Cache'deki data'yı koru!
        }
        return [] // Sadece cache yoksa boş array dön
      }
    },
    enabled: !!accessToken && !!user?.id, // ✅ KRİTİK: Token VE user.id varsa query çalışsın!
    staleTime: 5 * 60 * 1000, // ✅ 5 dakika stale time (sayfa yenilendiğinde cache kullan)
    refetchOnMount: true, // ✅ Mount olduğunda refetch (fresh data için)
    refetchOnWindowFocus: false, // ❌ Window focus'ta refetch YOK! (optimistic update'i bozmamak için)
    refetchOnReconnect: true, // ✅ Reconnect olduğunda refetch
    gcTime: 10 * 60 * 1000, // ✅ 10 dakika cache'de tut
    // ✅ KRİTİK: placeholderData ile cache korunur! Boş array ile overwrite ETME!
    placeholderData: (previousData) => {
      // Eğer önceki data varsa onu kullan (sayfa yenilendiğinde kaybolmasın!)
      if (previousData && Array.isArray(previousData) && previousData.length > 0) {
        console.log('✅ [SavedPostsGrid] Using cached placeholder data:', previousData.length, 'posts');
        return previousData;
      }
      return undefined; // Cache yoksa undefined dön, query çalışsın
    },
  })

  // Debug log - DETAYLI
  console.log('🔖 [SavedPostsGrid] Render state:', {
    isLoading,
    hasError: !!error,
    errorDetails: error,
    savedPostsCount: savedPosts?.length || 0,
    savedPosts,
    firstPost: savedPosts?.[0],
  })
  
  // Backend'den gelen data yapısını kontrol et
  if (savedPosts && savedPosts.length > 0) {
    console.log('✅ [SavedPostsGrid] İLK POST DETAYI:', {
      id: savedPosts[0]?.id,
      caption: savedPosts[0]?.caption?.substring(0, 50),
      hasMedia: !!savedPosts[0]?.media,
      mediaCount: savedPosts[0]?.media?.length,
      user: savedPosts[0]?.user?.username,
      counts: savedPosts[0]?._count,
    })
  }

  // Unsave mutation
  const unsaveMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.delete(`/posts/${postId}/save`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] })
      toast.success('Kayıtlı gönderilerden kaldırıldı')
    },
  })

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange mx-auto"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Kaydedilenler yükleniyor...</p>
      </div>
    )
  }

  if (!savedPosts || savedPosts.length === 0) {
    console.warn('⚠️ [SavedPostsGrid] BOŞ ARRAY - Backend query başarısız veya hiç kayıtlı post yok')
    return (
      <div className="text-center py-16">
        <FiBookmark className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">Henüz kayıtlı gönderi yok</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          Beğendiğin gönderileri kaydet, buradan tekrar bak
        </p>
      </div>
    )
  }
  
  console.log(`✅ [SavedPostsGrid] GRID RENDER EDİLİYOR: ${savedPosts.length} posts`)

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {savedPosts.map((savedPost: any) => {
          const post = savedPost.post || savedPost
          const firstMedia = post?.media?.[0]

          return (
            <div
              key={post.id}
              className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer group"
              onClick={() => setSelectedPost(post)}
            >
              {firstMedia ? (
                <img
                  src={resolveImageUrl(firstMedia.url)}
                  alt=""
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-4 text-white">
                  <div className="flex items-center gap-1">
                    <Heart size={20} fill="white" />
                    <span className="font-semibold">{post._count?.likes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle size={20} fill="white" />
                    <span className="font-semibold">{post._count?.comments || 0}</span>
                  </div>
                </div>
              </div>

              {/* Unsave button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  unsaveMutation.mutate(post.id)
                }}
                className="absolute top-2 right-2 p-2 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-black/80"
                title="Kayıtlılardan kaldır"
              >
                <FiBookmark className="w-4 h-4 text-brand-orange" fill="currentColor" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Post Modal */}
      {selectedPost && (
        <PostModal
          postId={selectedPost.id}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </>
  )
}

function ProfileContent() {
  const params = useParams()
  const router = useRouter()
  const { accessToken, user: currentUser, capabilities } = useAuthStore()
  const queryClient = useQueryClient()
  
  // 🔥 KRİTİK: Parametreyi array olabilir kontrolü ile string'e zorla
  const rawParam = params.username
  const paramUsername = Array.isArray(rawParam) ? rawParam[0] : (rawParam || '')
  
  // 🔥 KRİTİK: "me" parametresini currentUser.username'e çevir - GARANTİLİ DÖNÜŞÜM
  // Eğer "me" ise ve currentUser.username yoksa, /users/me endpoint'ini kullan
  const isMe = paramUsername === 'me'
  const username = isMe ? (currentUser?.username || '') : paramUsername
  
  // 🔥 KRİTİK: Parametre geçersizse erken return
  if (!paramUsername && !isMe) {
    return (
      <div className="text-center py-12">
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          <p className="font-semibold mb-2">Geçersiz profil adresi</p>
          <p className="text-xs">Profil sayfası yüklenemedi. Lütfen tekrar deneyin.</p>
        </div>
      </div>
    )
  }
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [postType, setPostType] = useState<'post' | 'artwork'>('post')
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'articles' | 'comments' | 'artworks' | 'events' | 'drafts' | 'saved' | 'analysis' | 'gallery'>('posts')
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const [postsSortMode, setPostsSortModeState] = useState<ProfileGridSortMode>(() =>
    readProfileGridSortMode(LS_PROFILE_SORT_POSTS),
  )
  const [artworksSortMode, setArtworksSortModeState] = useState<ProfileGridSortMode>(() =>
    readProfileGridSortMode(LS_PROFILE_SORT_ARTWORKS),
  )

  const setPostsSortMode = (m: ProfileGridSortMode) => {
    setPostsSortModeState(m)
    persistProfileGridSortMode(LS_PROFILE_SORT_POSTS, m)
  }
  const setArtworksSortMode = (m: ProfileGridSortMode) => {
    setArtworksSortModeState(m)
    persistProfileGridSortMode(LS_PROFILE_SORT_ARTWORKS, m)
  }
  const [zoomImage, setZoomImage] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Profil isteği zaman aşımı (sonsuz loading önlenir) — Vercel cold-start için 25s
  const PROFILE_FETCH_TIMEOUT_MS = 25000

  // Get profile data
  const { data: profile, isLoading, error: profileError } = useQuery({
    queryKey: ['profile', username, paramUsername, currentUser?.id],
    queryFn: async () => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Profil yüklenemedi. Zaman aşımı. Lütfen sayfayı yenileyin.')), PROFILE_FETCH_TIMEOUT_MS)
      )
      const fetchProfile = async () => {
        // "me" parametresi için önce /users/me endpoint'ini dene
        if (paramUsername === 'me') {
          try {
            const meResponse = await api.get('/users/me')
            const meData = meResponse.data
            if (!meData) throw new Error('Kullanıcı bilgisi alınamadı')
            if (meData?.username) {
              const profileResponse = await api.get(`/users/profile/${meData.username}`)
              if (profileResponse.data) return profileResponse.data
            }
            throw new Error('Kullanıcı adı bulunamadı')
          } catch (err: any) {
            if (currentUser?.username) {
              try {
                const response = await api.get(`/users/profile/${currentUser.username}`)
                if (response.data) return response.data
              } catch {
                throw new Error('Profil yüklenemedi.')
              }
            }
            const status = err?.response?.status
            const isAuthError = status === 401 || status === 403
            const fallbackMessage = isAuthError
              ? 'Oturum geçersiz. Lütfen tekrar giriş yapın.'
              : 'Profil yüklenemedi.'
            throw new Error(err?.response?.data?.message || err?.message || fallbackMessage)
          }
        }
        if (!username || username === 'undefined' || username === 'null') {
          throw new Error('Geçersiz kullanıcı adı')
        }
        try {
          const response = await api.get(`/users/profile/${username}`)
          return response.data
        } catch (err: any) {
          throw new Error(err?.response?.data?.message || err?.message || 'Profil yüklenemedi')
        }
      }
      return Promise.race([fetchProfile(), timeoutPromise])
    },
    enabled: !!accessToken && (!!username || paramUsername === 'me'),
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('Geçersiz') || error?.message?.includes('bulunamadı')) return false
      // Timeout: 1 otomatik retry (cold-start için)
      if (error?.message?.includes('Zaman aşımı')) return failureCount < 1
      return failureCount < 2
    },
    retryDelay: 1500,
    staleTime: STALE_SHORT,
    gcTime: GC_STANDARD,
  })

  // Helper function to check if user is corporate
  const isCorporateUser = profile?.role?.toUpperCase() === 'CORPORATE'
  
  // Helper function to check if user is artist or corporate (plan kontrolü kaldırıldı)
  // Profile yüklenene kadar güvenli kontrol
  const isProArtist = profile 
    ? (() => {
        // Role string kontrolü (case-insensitive)
        const roleStr = String(profile.role || '').toLowerCase()
        const isRoleMatch = roleStr === 'artist' || roleStr === 'corporate'
        
        // Roles array kontrolü
        const hasRoleInArray = Array.isArray(profile.roles) && (
          profile.roles.includes('artist') || 
          profile.roles.includes('corporate') ||
          profile.roles.some((r: string) => String(r).toLowerCase() === 'artist') ||
          profile.roles.some((r: string) => String(r).toLowerCase() === 'corporate')
        )
        
        // Plan kontrolü kaldırıldı - artık sadece rol bazlı
        const isArtistRole = profile.role === 'artist' || profile.role === 'ARTIST' || 
                            (Array.isArray(profile.roles) && profile.roles.includes('artist'))
        const isCorporateRole = profile.role === 'corporate' || profile.role === 'CORPORATE' ||
                               (Array.isArray(profile.roles) && profile.roles.includes('corporate'))
        
        const result = isRoleMatch || hasRoleInArray || isArtistRole || isCorporateRole
        
        return result
      })()
    : false

  // Backend capabilities ile hizalı: eser oluşturabilen tüm roller (art_lover/collector dahil)
  const canShowProfileArtworks =
    typeof profile?.capabilities?.permissions?.canCreateArtworks === 'boolean'
      ? profile.capabilities.permissions.canCreateArtworks
      : isProArtist
  
  const isOwnProfile = Boolean(profile?.isOwnProfile)
  const canViewAnalytics =
    isOwnProfile ||
    !profile?.isPrivate ||
    Boolean(profile?.isFollowing)

  // Tab config: saved sadece kendi profilde; analiz herkeste görünür (içerik erişimi ayrı)
  const profileTabs = [
    { key: 'posts', label: 'Gönderiler', icon: FiGrid, visible: true },
    { key: 'artworks', label: 'Eserler', icon: FiImage, visible: true },
    { key: 'articles', label: 'Yazılar', icon: FiFileText, visible: true },
    { key: 'comments', label: 'Yorumlar', icon: FiMessageCircle, visible: true },
    { key: 'events', label: 'Etkinlikler', icon: FiCalendar, visible: true },
    { key: 'saved', label: 'Kaydedilenler', icon: FiBookmark, visible: isOwnProfile },
    { key: 'analysis', label: 'Analiz', icon: BarChart3, visible: true },
    { key: 'gallery', label: 'Sergi', icon: Sparkles, visible: true },
  ].filter((tab) => tab.visible)

  const tabs = profileTabs

  // Geçersiz activeTab ise posts'a düş (saved sadece kendi profilde; analysis herkeste)
  useEffect(() => {
    if (!profile) return
    const allowedKeys = [
      'posts',
      'artworks',
      'articles',
      'comments',
      'events',
      'analysis',
      'gallery',
      ...(isOwnProfile ? ['saved'] : []),
    ]
    if (!allowedKeys.includes(activeTab)) {
      setActiveTab('posts')
    }
  }, [profile?.id, isOwnProfile, activeTab])
  
  // Debug: Tab'ların oluşturulmasını kontrol et (development'ta)
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && profile) {
      console.log('🔍 Profile Tab Debug:', {
        hasProfile: !!profile,
        isOwnProfile,
        profileRole: profile?.role,
        tabKeys: tabs.map(t => t.key),
      })
    }
  }, [profile, isOwnProfile])

  // Get user posts - with fallback endpoint support
  const { data: userPostsData, isLoading: isLoadingPosts, error: postsError } = useQuery({
    queryKey: ['user-posts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      
      // Primary endpoint: /posts/user/:userId
      try {
        const response = await api.get(`/posts/user/${profile.id}`)
        const posts = response.data || []
        
        // Debug log
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          console.log('🔍 User Posts Query Debug:', {
            userId: profile.id,
            postsCount: posts.length,
            posts: posts.map((p: any) => ({ id: p.id, type: p.type, hasMedia: !!p.media?.length }))
          })
        }
        
        return posts
      } catch (error: any) {
        // Fallback: Try username-based endpoint if userId fails
        console.warn('Primary endpoint failed, trying fallback:', error)
        try {
          const response = await api.get(`/posts/user/${username}`)
          return response.data || []
        } catch (fallbackError) {
          console.error('Both endpoints failed:', fallbackError)
          return []
        }
      }
    },
    enabled: !!accessToken && !!profile?.id,
    staleTime: STALE_SHORT,
    gcTime: GC_STANDARD,
  })

  // Get user events (for corporate users and pro artists)
  const { data: userEvents } = useQuery({
    queryKey: ['user-events', profile?.id],
    queryFn: async () => {
      if (!profile?.id || (!isCorporateUser && !isProArtist)) return []
      const response = await api.get(`/events?authorId=${profile.id}`)
      return response.data
    },
    enabled: !!accessToken && !!profile?.id && (isCorporateUser || isProArtist),
  })

  // Eserler: user-posts ile aynı kaynak (tek istek, upload sonrası invalidate ile senkron)
  const profileArtworksBase = useMemo(
    () => (userPostsData || []).filter((p: any) => p.type === 'artwork'),
    [userPostsData],
  )

  const rawProfilePostsOnly = useMemo(
    () =>
      (userPostsData || []).filter((p: any) => !p.type || p.type === 'post'),
    [userPostsData],
  )

  const profilePostOrder = useMemo(
    () => (Array.isArray(profile?.profilePostOrder) ? profile.profilePostOrder : []) as string[],
    [profile?.profilePostOrder],
  )
  const profileArtworkOrder = useMemo(
    () =>
      (Array.isArray(profile?.profileArtworkOrder) ? profile.profileArtworkOrder : []) as string[],
    [profile?.profileArtworkOrder],
  )

  const sortedProfilePosts = useMemo(
    () => sortProfileItems(rawProfilePostsOnly, postsSortMode, profilePostOrder),
    [rawProfilePostsOnly, postsSortMode, profilePostOrder],
  )

  const sortedProfileArtworks = useMemo(
    () => sortProfileItems(profileArtworksBase, artworksSortMode, profileArtworkOrder),
    [profileArtworksBase, artworksSortMode, profileArtworkOrder],
  )

  const patchGridOrderMutation = useMutation({
    mutationFn: async (body: { postOrder?: string[]; artworkOrder?: string[] }) => {
      const { data } = await api.patch('/users/me/profile-grid-order', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'profile',
      })
    },
  })

  const enablePostsDrag = isOwnProfile && postsSortMode === 'custom'
  const enableArtworksDrag = isOwnProfile && artworksSortMode === 'custom'

  const profileQueryKey = useMemo(
    () => ['profile', username, paramUsername, currentUser?.id] as const,
    [username, paramUsername, currentUser?.id],
  )

  const handleProfilePostsReorder = useCallback(
    (items: any[]) => {
      if (!enablePostsDrag || !profile?.id) return
      const previousPosts = queryClient.getQueryData<any[]>(['user-posts', profile.id])
      const previousProfile = queryClient.getQueryData<any>(profileQueryKey)
      queryClient.setQueryData(['user-posts', profile.id], (old: any[] = []) =>
        applyPostReorderInUserPostsCache(old, items),
      )
      queryClient.setQueryData(profileQueryKey, (old: any) =>
        old && old.id === profile.id
          ? { ...old, profilePostOrder: items.map((p: any) => String(p.id)) }
          : old,
      )
      patchGridOrderMutation.mutate(
        { postOrder: items.map((p) => p.id) },
        {
          onError: () => {
            if (previousPosts) queryClient.setQueryData(['user-posts', profile.id], previousPosts)
            if (previousProfile !== undefined) {
              queryClient.setQueryData(profileQueryKey, previousProfile)
            }
            toast.error('Sıra kaydedilemedi')
          },
        },
      )
    },
    [enablePostsDrag, profile?.id, profileQueryKey, queryClient, patchGridOrderMutation],
  )

  const handleArtworksReorder = useCallback(
    (items: any[]) => {
      if (!profile?.id) return
      const previousPosts = queryClient.getQueryData<any[]>(['user-posts', profile.id])
      const previousProfile = queryClient.getQueryData<any>(profileQueryKey)
      queryClient.setQueryData(['user-posts', profile.id], (old: any[] = []) =>
        applyArtworkReorderInUserPostsCache(old, items),
      )
      queryClient.setQueryData(profileQueryKey, (old: any) =>
        old && old.id === profile.id
          ? { ...old, profileArtworkOrder: items.map((a: any) => String(a.id)) }
          : old,
      )
      patchGridOrderMutation.mutate(
        { artworkOrder: items.map((a) => a.id) },
        {
          onError: () => {
            if (previousPosts) queryClient.setQueryData(['user-posts', profile.id], previousPosts)
            if (previousProfile !== undefined) {
              queryClient.setQueryData(profileQueryKey, previousProfile)
            }
            toast.error('Sıra kaydedilemedi')
          },
        },
      )
    },
    [profile?.id, profileQueryKey, queryClient, patchGridOrderMutation],
  )

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.delete(`/posts/${postId}`)
    },
    onSuccess: (_, postId) => {
      toast.success('Gönderi başarıyla silindi')
      // 🎯 OPTIMISTIC UPDATE - Instagram mantığı: Anında sayacı azalt
      queryClient.setQueriesData(
        { 
          predicate: (query) => {
            const key = query.queryKey
            return Array.isArray(key) && key[0] === 'profile'
          }
        },
        (oldData: any) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            _count: {
              ...oldData._count,
              posts: Math.max(0, (oldData._count?.posts || 0) - 1), // ✅ Anında -1 (min 0)
            }
          }
        }
      )
      
      // Invalidate queries (background refresh)
      queryClient.invalidateQueries({ queryKey: ['user-posts', profile?.id] })
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      
      setMenuOpen(null)
      setConfirmDelete(null)
    },
    onError: (error: any) => {
      console.error('Delete error:', error)
      toast.error(error.response?.data?.message || 'Gönderi silinirken bir hata oluştu')
      setConfirmDelete(null)
    },
  })

  const handleDeleteClick = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation()
    setConfirmDelete(postId)
    setMenuOpen(null)
  }

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDelete) {
      deletePostMutation.mutate(confirmDelete)
    }
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete(null)
  }

  // Close menu when clicking outside - Only check clicks outside the menu container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen) {
        const menuElement = menuRefs.current[menuOpen]
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setMenuOpen(null)
        }
      }
    }
    if (menuOpen) {
      // Use capture phase to check before other handlers
      document.addEventListener('mousedown', handleClickOutside, true)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true)
      }
    }
  }, [menuOpen])

  // 🔔 Socket.IO ile real-time post dinleme
  useEffect(() => {
    if (!accessToken || !profile?.id) return

    const postsSocket = initPostsSocket(accessToken)

    postsSocket.on('postCreated', (newPost: any) => {
      if (newPost.author?.id === profile.id) {
        queryClient.setQueryData(['user-posts', profile.id], (old: any[] = []) => {
          if (old.some((p) => p.id === newPost.id)) return old
          return [newPost, ...old]
        })
        queryClient.invalidateQueries({ queryKey: ['profile', username] })
      }
    })

    // 🔔 Real-time beğeni güncellemeleri
    postsSocket.on('postLikeUpdated', (data: { postId: string; change: number; likeCount: number; isLiked: boolean; userId: string }) => {
      queryClient.setQueryData(['user-posts', profile.id], (old: any[] = []) =>
        old.map((p: any) => {
          if (p.id === data.postId) {
            return {
              ...p,
              _count: {
                ...p._count,
                likes: data.likeCount,
              },
            }
          }
          return p
        }),
      )
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      queryClient.invalidateQueries({ queryKey: ['user-posts', profile?.id] })
    })

    // 🔔 Real-time yorum güncellemeleri (yorum sayısı için)
    const commentsSocket = initCommentsSocket(accessToken)
    commentsSocket.on('commentCreated', (data: any) => {
      queryClient.setQueryData(['user-posts', profile.id], (old: any[] = []) =>
        old.map((p: any) => {
          if (p.id === data.postId) {
            return {
              ...p,
              _count: {
                ...p._count,
                comments: (p._count?.comments || 0) + 1,
              },
            }
          }
          return p
        }),
      )
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      // ✅ Yorumlar grid'ini de güncelle (eğer aktif sekme yorumlar ise)
      queryClient.invalidateQueries({ queryKey: ['user-comments', profile?.id] })
    })

    commentsSocket.on(
      'commentDeleted',
      (data: { id: string; postId: string; deletedCount?: number }) => {
      const dec = typeof data.deletedCount === 'number' && data.deletedCount > 0 ? data.deletedCount : 1
      queryClient.setQueryData(['user-posts', profile.id], (old: any[] = []) =>
        old.map((p: any) => {
          if (p.id === data.postId) {
            return {
              ...p,
              _count: {
                ...p._count,
                comments: Math.max(0, (p._count?.comments || 0) - dec),
              },
            }
          }
          return p
        }),
      )
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      // ✅ Yorumlar grid'ini de güncelle (eğer aktif sekme yorumlar ise)
      queryClient.invalidateQueries({ queryKey: ['user-comments', profile?.id] })
    })

    commentsSocket.on('connect', () => {
      console.log('✅ Comments socket connected for profile')
    })

    postsSocket.on('connect', () => {
      console.log('✅ Posts socket connected for profile')
    })

    return () => {
      postsSocket.off('postCreated')
      postsSocket.off('postLikeUpdated')
      postsSocket.off('connect')
      commentsSocket.off('commentCreated')
      commentsSocket.off('commentDeleted')
      commentsSocket.off('connect')
    }
  }, [accessToken, profile?.id, username, queryClient])

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      if (action === 'follow') {
        const response = await api.post(`/follow/${profile.id}`)
        return response.data
      } else {
        await api.delete(`/follow/${profile.id}`)
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      
      // Optimistically update profile
      queryClient.setQueryData(['profile', username], (oldData: any) => {
        if (!oldData) return oldData
        
        // If it was a follow request, update hasRequested
        if (data?.status === 'requested') {
          return {
            ...oldData,
            hasRequested: true,
          }
        }
        
        // If it was accepted follow
        if (data?.status === 'following') {
          return {
            ...oldData,
            isFollowing: true,
            hasRequested: false,
            followerCount: (oldData.followerCount ?? 0) + 1,
          }
        }
        
        // Unfollow
        return {
          ...oldData,
          isFollowing: false,
          followerCount: Math.max(0, (oldData.followerCount ?? 0) - 1),
        }
      })
    },
  })

  // Get followers
  const { data: followers } = useQuery({
    queryKey: ['followers', profile?.id],
    queryFn: async () => {
      const response = await api.get(`/follow/${profile.id}/followers`)
      return response.data
    },
    enabled: !!profile && showFollowers,
  })

  // Get following
  const { data: following } = useQuery({
    queryKey: ['following', profile?.id],
    queryFn: async () => {
      const response = await api.get(`/follow/${profile.id}/following`)
      return response.data
    },
    enabled: !!profile && showFollowing,
  })

  const handleFollow = () => {
    if (profile.isFollowing) {
      followMutation.mutate('unfollow')
    } else if (profile.hasRequested) {
      // Cancel follow request
      handleCancelRequest()
    } else {
      followMutation.mutate('follow')
    }
  }

  const handleCancelRequest = async () => {
    if (!profile.id) return
    try {
      await api.post(`/follow/request/${profile.id}/cancel`)
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch (error) {
      console.error('Failed to cancel request:', error)
    }
  }

  const handleMessage = async () => {
    if (!profile.id || creatingConversation) return
    
    setCreatingConversation(true)
    try {
      const response = await api.post('/chat/conversations', {
        participantIds: [profile.id],
      })
      // Mesajlar sayfasına yönlendir
      router.push(`/messages?conversation=${response.data.id}`)
    } catch (error: any) {
      console.error('Failed to create conversation:', error)
      // Hata durumunda da mesajlar sayfasına git
      router.push('/messages')
    } finally {
      setCreatingConversation(false)
    }
  }

  // Misafir: boş ekran yerine giriş CTA (derin link / modal sonrası profil tıklaması)
  if (!accessToken) {
    const returnTo =
      typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search || ''}` : '/feed'
    const safeFrom =
      returnTo.startsWith('/') && !returnTo.includes('//') ? returnTo : '/feed'
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950 px-4">
        <div className="max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111827] p-8 text-center shadow-sm">
          <p className="text-gray-900 dark:text-white font-semibold mb-2">Profili görmek için giriş yapın</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Feellink&apos;te sanatçı profilleri ve içerikler giriş yaptıktan sonra görüntülenebilir.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/login?from=${encodeURIComponent(safeFrom)}`}
              className="inline-flex items-center justify-center rounded-full bg-brand-orange px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-orange/90 transition-colors"
            >
              Giriş yap
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Kayıt ol
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  // 🔥 KRİTİK: Hata durumunu göster
  if (profileError) {
    const errorMessage = profileError instanceof Error ? profileError.message : 'Bilinmeyen bir hata oluştu'
    const isTimeout = errorMessage.includes('Zaman aşımı')
    return (
      <div className="text-center py-12">
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          <p className="font-semibold mb-2">Profil yüklenemedi</p>
          <p className="text-xs mb-4">{isTimeout ? 'Sunucu yanıt vermedi. Lütfen sayfayı yenileyin.' : errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-xs font-medium bg-brand-orange text-white rounded-xl hover:bg-brand-orange/90 transition"
          >
            Sayfayı Yenile
          </button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          <p className="font-semibold mb-2">Kullanıcı bulunamadı</p>
          <p className="text-xs mb-4">
            {paramUsername === 'me' 
              ? 'Profil bilgileriniz yüklenemedi. Lütfen sayfayı yenileyin veya tekrar giriş yapın.'
              : 'Aradığınız kullanıcı bulunamadı veya hesap silinmiş olabilir.'}
          </p>
          {paramUsername === 'me' && (
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-medium bg-brand-orange text-white rounded-xl hover:bg-brand-orange/90 transition"
            >
              Sayfayı Yenile
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-start space-y-4 md:space-y-0 md:space-x-8 mb-8 bg-white dark:bg-gray-950 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
          {/* Avatar */}
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
            {profile.avatar ? (
              (() => {
                const imageUrl = resolveImageUrl(profile.avatar)
                console.log('Profile Avatar IMAGE URL:', imageUrl, 'Original:', profile.avatar)
                return (
                  <img
                    src={imageUrl}
                    alt={profile.username}
                    className="w-full h-full object-cover cursor-zoom-in transition-transform hover:scale-105"
                    onClick={() => setZoomImage(imageUrl)}
                    onError={(e) => {
                      console.error('Profile Avatar Error:', imageUrl)
                      ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                    }}
                  />
                )
              })()
            ) : (
              <span className="text-3xl md:text-4xl text-gray-500 dark:text-gray-400">
                {profile.username[0].toUpperCase()}
              </span>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-light text-gray-900 dark:text-gray-100 flex flex-wrap items-center gap-x-1 gap-y-2">
                    <span className="inline-flex items-center gap-0">
                      {profile.username}
                      <FeellinkRoleBadge roles={profile.roles} />
                    </span>
                  </h1>
                </div>
                <UserBadges badges={profile.badges} />
              </div>
              {/* Sağ Buton Grubu - Profili Düzenle + Yeni Gönderi */}
              {profile.isOwnProfile && (
                <div className="flex items-center gap-3">
                  {/* ➕ Yeni Gönderi/Eser - Açılır Menü */}
                  <div className="relative">
                    <button
                      onClick={() => setCreateMenuOpen(!createMenuOpen)}
                      className="flex items-center justify-center w-9 h-9 rounded-full 
                                 bg-[#FF8A00] text-white shadow-sm hover:bg-[#e67a00] 
                                 transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Yeni İçerik"
                    >
                      <Plus size={18} strokeWidth={2.5} />
                    </button>

                    {/* Açılır Menü */}
                    {createMenuOpen && (
                      <>
                        {/* Backdrop - menüyü kapatmak için */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setCreateMenuOpen(false)}
                        />
                        {/* Menü */}
                        <div className="absolute right-0 mt-2 bg-white dark:bg-[#1a1a1a] shadow-lg rounded-xl z-20 w-48 border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <button
                            onClick={() => {
                              setPostType('post')
                              setShowCreateModal(true)
                              setCreateMenuOpen(false)
                            }}
                            className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <FiGrid size={18} className="text-brand-orange" />
                              <span>Gönderi Yükle</span>
                            </div>
                          </button>
                          {/* Eser yükleme butonu sadece eser oluşturma yetkisi olan kullanıcılar için */}
                          {capabilities?.permissions.canCreateArtworks && (
                            <button
                              onClick={() => {
                                setPostType('artwork')
                                setShowCreateModal(true)
                                setCreateMenuOpen(false)
                              }}
                              className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-t border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-center gap-2">
                                <FiImage size={18} className="text-brand-orange" />
                                <span>Eser Yükle</span>
                              </div>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Profili Düzenle Butonu */}
                  <button
                    onClick={() => router.push('/profile/edit')}
                    className="px-4 py-2 text-sm font-medium bg-[#FF8A00] text-white rounded-lg 
                               shadow-sm hover:bg-[#e67a00] transition"
                  >
                    Profili Düzenle
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4 mb-4">
              {!profile.isOwnProfile && (
                <>
                  <button
                    onClick={handleFollow}
                    disabled={followMutation.isPending}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      profile.isFollowing
                        ? 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                        : profile.hasRequested
                        ? 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
                        : 'bg-brand-orange text-white hover:bg-brand-orange/90'
                    }`}
                  >
                    {followMutation.isPending
                      ? '...'
                      : profile.isFollowing
                      ? 'Takibi Bırak'
                      : profile.hasRequested
                      ? 'İstek Gönderildi (Geri Çek)'
                      : profile.isPrivate
                      ? 'Takip İsteği Gönder'
                      : 'Takip Et'}
                  </button>
                  <button
                    onClick={handleMessage}
                    disabled={creatingConversation}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingConversation ? '...' : 'Mesaj'}
                  </button>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="flex space-x-6 mb-4">
              <button
                onClick={() => setShowFollowers(true)}
                className="cursor-pointer"
              >
                <span className="font-semibold text-gray-900 dark:text-gray-100">{profile._count.posts}</span>{' '}
                <span className="text-gray-600 dark:text-gray-400">posts</span>
              </button>
              <button
                onClick={() => setShowFollowers(true)}
                className="cursor-pointer"
              >
                <span className="font-semibold text-gray-900 dark:text-gray-100">{profile.followerCount ?? 0}</span>{' '}
                <span className="text-gray-600 dark:text-gray-400">takipçi</span>
              </button>
              <button
                onClick={() => setShowFollowing(true)}
                className="cursor-pointer"
              >
                <span className="font-semibold text-gray-900 dark:text-gray-100">{profile.followingCount ?? 0}</span>{' '}
                <span className="text-gray-600 dark:text-gray-400">takip</span>
              </button>
            </div>

            {/* Bio */}
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{profile.fullName || profile.username}</p>
              {profile.bio && <p className="mt-1 text-gray-900 dark:text-gray-100">{profile.bio}</p>}
              {/* Role Label - Sadece whitelist'teki etiket; raw role asla basılmaz */}
              {(() => {
                const roleLabel = profile.role ? ROLE_METADATA[normalizeRole(profile.role)]?.label : null
                return roleLabel ? (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{roleLabel}</p>
                ) : null
              })()}
            </div>
          </div>
        </div>

        {/* Öne Çıkan Temalar - Tüm kullanıcılarda görünür */}
        <ArtistHighlights username={username} userId={profile?.id} isOwnProfile={profile.isOwnProfile} />

        {/* Sekme Butonları — z-30 modalların (z-50) altında, içerik panellerinin (z-0) üstünde; overflow-x + pb tooltip kırpmasın */}
        <div className="relative z-30 mb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto overscroll-x-contain pt-1 pb-10">
            <div className="flex items-center justify-center gap-6 md:gap-10 min-w-min px-2 mx-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.key

                return (
                  <div
                    key={tab.key}
                    className="relative flex flex-col items-center shrink-0"
                    onMouseEnter={() => setHoveredTab(tab.key)}
                    onMouseLeave={() => setHoveredTab(null)}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.key as any)}
                      title={tab.label}
                      aria-label={tab.label}
                      className={`flex items-center justify-center min-w-[44px] min-h-[44px] pb-2 px-3 transition-all relative group ${
                        isActive
                          ? 'text-brand-orange'
                          : 'text-gray-600 dark:text-gray-400 hover:text-brand-orange'
                      }`}
                    >
                      <Icon
                        size={22}
                        className={`transition-all duration-200 ${
                          isActive ? 'scale-110' : 'group-hover:scale-105'
                        }`}
                      />
                      {isActive && (
                        <div
                          className="absolute -bottom-3 left-0 right-0 h-[2px] bg-brand-orange rounded-full shadow-[0_1px_2px_rgba(255,123,0,0.3)]"
                          aria-hidden
                        />
                      )}
                    </button>

                    {hoveredTab === tab.key && (
                      <div
                        className="absolute top-full left-1/2 z-40 mt-1.5 -translate-x-1/2 rounded-lg border border-gray-200/70 bg-white/95 px-3 py-1.5 text-xs font-medium text-brand-orange shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150 dark:border-gray-700/50 dark:bg-[#1a1a1a]/95 dark:text-brand-orange whitespace-nowrap pointer-events-none"
                        role="tooltip"
                      >
                        {tab.label}
                        <div
                          className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-l border-t border-gray-200/70 bg-white/95 dark:border-gray-700/50 dark:bg-[#1a1a1a]/95"
                          aria-hidden
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sekme içerikleri — z-0 ile sekme şeridinin altında kalır (tooltip çakışması olmaz) */}
        <div className="relative z-0">
        {activeTab === 'gallery' ? (
          <div className="rounded-2xl overflow-hidden" style={{ background:'linear-gradient(160deg,#0d1018,#080b12)', border:'1px solid rgba(201,165,80,0.1)' }}>
            <div className="pointer-events-none" style={{ height:3, background:'linear-gradient(90deg,transparent,rgba(201,165,80,0.2),transparent)' }} />
            <div className="flex flex-col items-center justify-center py-16 px-6 gap-6 relative">
              <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(201,165,80,0.04), transparent 70%)' }} />
              <p style={{ color:'rgba(201,165,80,0.35)', fontSize:10, letterSpacing:'0.38em', textTransform:'uppercase', fontFamily:'Georgia,serif' }}>
                Sanal Sergi
              </p>
              <div className="text-center">
                <h2 style={{ color:'rgba(255,255,255,0.75)', fontSize:22, fontFamily:'Georgia,serif', fontWeight:400 }}>
                  {username} sergisi
                </h2>
                {profileArtworksBase.filter((a: any) => a.media?.length > 0 && a.media[0]?.url).length > 0 && (
                  <p style={{ color:'rgba(201,165,80,0.3)', fontSize:11, marginTop:6, letterSpacing:'0.1em' }}>
                    {profileArtworksBase.filter((a: any) => a.media?.length > 0 && a.media[0]?.url).length} eser sergileniyor
                  </p>
                )}
              </div>
              {profileArtworksBase.filter((a: any) => a.media?.length > 0 && a.media[0]?.url).length > 0 ? (
                <button
                  onClick={() => setGalleryOpen(true)}
                  style={{
                    padding:'13px 44px',
                    background:'linear-gradient(135deg,rgba(201,165,80,0.18),rgba(201,165,80,0.08))',
                    border:'1px solid rgba(201,165,80,0.4)',
                    borderRadius:3, color:'rgba(201,165,80,0.9)',
                    fontSize:11, letterSpacing:'0.32em', textTransform:'uppercase',
                    fontFamily:'Georgia,serif', cursor:'pointer',
                    boxShadow:'0 0 30px rgba(201,165,80,0.08)', transition:'all .25s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='linear-gradient(135deg,rgba(201,165,80,0.28),rgba(201,165,80,0.15))'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(201,165,80,0.7)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='linear-gradient(135deg,rgba(201,165,80,0.18),rgba(201,165,80,0.08))'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(201,165,80,0.4)' }}
                >
                  Sergiye Gir
                </button>
              ) : (
                <div className="text-center">
                  <p style={{ color:'rgba(255,255,255,0.25)', fontSize:13 }}>Henüz eser yüklenmemiş</p>
                  {isMe && canShowProfileArtworks && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      style={{ marginTop:16, padding:'10px 28px', background:'rgba(201,165,80,0.12)', border:'1px solid rgba(201,165,80,0.3)', borderRadius:3, color:'rgba(201,165,80,0.7)', fontSize:11, letterSpacing:'0.2em', cursor:'pointer' }}
                    >
                      + Eser Yükle
                    </button>
                  )}
                </div>
              )}
              {isMe && canShowProfileArtworks && profileArtworksBase.filter((a: any) => a.media?.length > 0 && a.media[0]?.url).length > 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{ color:'rgba(201,165,80,0.3)', fontSize:10, letterSpacing:'0.2em', background:'none', border:'none', cursor:'pointer', textTransform:'uppercase' }}
                >
                  + Yeni Eser Ekle
                </button>
              )}
            </div>
            <div className="pointer-events-none" style={{ height:3, background:'linear-gradient(90deg,transparent,rgba(201,165,80,0.1),transparent)' }} />
          </div>
        ) : activeTab === 'articles' ? (
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
            <UserArticles authorId={profile.id} />
          </div>
        ) : activeTab === 'comments' ? (
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
            <ProfileCommentsList username={username} userId={profile.id} />
          </div>
        ) : activeTab === 'artworks' && canShowProfileArtworks ? (
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-4 md:p-6 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50/80 dark:bg-gray-900/50">
                {(['newest', 'oldest', 'custom'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setArtworksSortMode(m)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      artworksSortMode === m
                        ? 'bg-white dark:bg-gray-800 text-[#ff7b00] shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {m === 'newest' ? 'En Yeni' : m === 'oldest' ? 'En Eski' : 'Serbest Dizim'}
                  </button>
                ))}
              </div>
              {isOwnProfile && artworksSortMode === 'custom' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-right">
                  Kartları sürükleyip bırakarak sıralayabilirsin.
                </p>
              )}
            </div>
            <ProfileArtworksGrid
              username={username}
              artworks={sortedProfileArtworks}
              userId={profile?.id}
              showColorPalette={false}
              enableReorder={enableArtworksDrag}
              onReorder={handleArtworksReorder}
            />
          </div>
        ) : activeTab === 'artworks' && !canShowProfileArtworks ? (
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-8 md:p-10 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <ImageIcon className="h-7 w-7 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-base font-medium text-gray-900 dark:text-gray-100">
              Eserler bu hesap için görüntülenemiyor
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Bu profil türünde eser galerisi gösterilmez. Gönderiler sekmesinden paylaşımları görebilirsiniz.
            </p>
          </div>
        ) : activeTab === 'events' && (isCorporateUser || isProArtist) ? (
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
            {userEvents && userEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {userEvents.map((event: any) => {
                  const hasTickets = event.tickets && event.tickets.length > 0
                  const isFree = hasTickets && event.tickets.some((t: any) => t.price === 0)
                  const hasPaidTickets = hasTickets && event.tickets.some((t: any) => t.price > 0)
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => router.push(`/events/${event.id}`)}
                      className="bg-white dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                    >
                      {/* Etkinlik Görseli */}
                      {event.coverImage ? (
                        <div className="w-full h-40 relative overflow-hidden">
                          <img
                            src={resolveImageUrl(event.coverImage)}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-brand-orange/20 to-brand-orange/5 dark:from-brand-orange/10 dark:to-brand-orange/5 flex items-center justify-center">
                          <Calendar className="w-12 h-12 text-brand-orange opacity-50" />
                        </div>
                      )}
                      
                      {/* Etkinlik Bilgileri */}
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-brand-orange transition-colors">
                          {event.title}
                        </h3>
                        {event.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                            {event.description}
                          </p>
                        )}
                        
                        {/* Tarih ve Durum */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Calendar size={14} />
                            <span>{new Date(event.date).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}</span>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full font-medium ${
                              (isFree && !hasPaidTickets) || !hasTickets
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                : 'bg-brand-orange/10 dark:bg-brand-orange/20 text-brand-orange'
                            }`}
                          >
                            {(isFree && !hasPaidTickets) || !hasTickets ? 'Ücretsiz' : 'Ücretli'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  Henüz oluşturulmuş etkinlik yok
                </p>
              </div>
            )}
          </div>
        ) : activeTab === 'drafts' && profile.isOwnProfile ? (
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
            <DraftArticles authorId={profile.id} />
          </div>
        ) : activeTab === 'saved' && isOwnProfile ? (
          <SavedPostsGrid />
        ) : activeTab === 'analysis' ? (
          canViewAnalytics ? (
            <ProfileAnalysisPanel username={username} />
          ) : (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60">
                <Lock size={22} className="text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Analiz içeriği gizli
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Bu hesabın analiz bölümü yalnızca profil sahibi ve takipçileri tarafından görüntülenebilir.
              </p>
            </div>
          )
        ) : !profile.canViewPosts && profile.isPrivate && !profile.isOwnProfile ? (
          <div className="text-center py-12 border border-gray-100 dark:border-gray-900 rounded-2xl bg-white dark:bg-gray-950 transition-colors shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bu Hesap Gizli</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Bu hesabın gönderilerini görmek için takip isteği gönderin
            </p>
          </div>
        ) : activeTab === 'posts' ? (
          // Posts tab - show loading, error, or posts
          isLoadingPosts ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff7b00] mx-auto"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Gönderiler yükleniyor...</p>
            </div>
          ) : postsError ? (
            <div className="text-center py-12">
              <p className="text-sm text-red-500 dark:text-red-400">Gönderiler yüklenirken bir hata oluştu.</p>
            </div>
          ) : sortedProfilePosts.length > 0 ? (
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-4 md:p-6 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50/80 dark:bg-gray-900/50">
                  {(['newest', 'oldest', 'custom'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPostsSortMode(m)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        postsSortMode === m
                          ? 'bg-white dark:bg-gray-800 text-[#ff7b00] shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      {m === 'newest' ? 'En Yeni' : m === 'oldest' ? 'En Eski' : 'Serbest Dizim'}
                    </button>
                  ))}
                </div>
                {isOwnProfile && postsSortMode === 'custom' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-right">
                    Kartları sürükleyip bırakarak sıralayabilirsin.
                  </p>
                )}
              </div>
              <ProfileSortableThreeColumnGrid
                items={sortedProfilePosts}
                disabled={!enablePostsDrag}
                onReorder={handleProfilePostsReorder}
                renderItem={(post: any, _index: number, { isDragging }) => {
                  const isOwner =
                    currentUser?.id === post.userId || currentUser?.username === username
                  return (
                    <div
                      className={`aspect-square relative cursor-pointer group overflow-hidden rounded-xl transition-all duration-300 hover:ring-2 hover:ring-brand-orange hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-gray-950 ${
                        isDragging ? 'ring-2 ring-[#ff7b00] opacity-90 z-50' : ''
                      }`}
                      onClick={() => setSelectedPostId(post.id)}
                    >
                      {post.media && post.media.length > 0 ? (
                        <>
                          {post.media[0].type === 'video' ? (
                            <video
                              src={resolveImageUrl(post.media[0].url)}
                              className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                              muted
                            />
                          ) : (
                            <img
                              src={resolveImageUrl(post.media[0].url)}
                              alt={post.caption || 'Post'}
                              className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                              }}
                            />
                          )}
                          {/* 🏷️ Post ikon rozeti */}
                          <div className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-sm text-white p-1.5 shadow-lg z-[55]">
                            <ImageIcon size={14} strokeWidth={2.5} />
                          </div>
                          
                          {/* Menü butonu - Silme seçeneği - Sadece sahip görür - Post z-index */}
                          {isOwner && (
                            <div 
                              ref={(el) => {
                                menuRefs.current[post.id] = el
                              }}
                              className="absolute bottom-2 right-2 z-[60]"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setMenuOpen(menuOpen === post.id ? null : post.id)
                                }}
                                className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors pointer-events-auto"
                                title="Menü"
                              >
                                <MoreVertical size={14} strokeWidth={2.5} />
                              </button>
                              
                              {/* Açılır menü - Sadece kartın içinde - Post z-index */}
                              {menuOpen === post.id && (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute bottom-10 right-0 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[120px] z-[60]"
                                >
                                  <button
                                    onClick={(e) => handleDeleteClick(e, post.id)}
                                    disabled={deletePostMutation.isPending}
                                    className="w-full px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Trash2 size={16} />
                                    Sil
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Modern Hover Overlay - Glass Effect - Düşük z-index ile menü butonlarının altında */}
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center rounded-xl z-[5]">
                            <div className="flex items-center gap-8">
                              {/* Likes */}
                              <div className="flex items-center gap-2 text-white text-lg font-semibold">
                                <Heart className="w-6 h-6" fill="currentColor" />
                                <span>{post._count?.likes || post.likeCount || 0}</span>
                              </div>
                              
                              {/* Comments */}
                              <div className="flex items-center gap-2 text-white text-lg font-semibold">
                                <MessageCircle className="w-6 h-6" />
                                <span>{post._count?.comments || post.commentCount || 0}</span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
                          <ImageIcon size={32} />
                        </div>
                      )}
                    </div>
                  )
                }}
              />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-12 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors text-center">
              <p className="text-gray-500 dark:text-gray-400">Henüz gönderi yok</p>
            </div>
          )
        ) : null}
        </div>
      </div>

      {/* Followers Modal */}
      {showFollowers && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Followers</h2>
              <button
                onClick={() => setShowFollowers(false)}
                className="text-2xl hover:opacity-70 text-gray-500 dark:text-gray-400"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {followers && followers.length > 0 ? (
                followers.map((follower: any) => (
                  <div
                    key={follower.id}
                    className="p-4 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => {
                      setShowFollowers(false)
                      router.push(`/profile/${follower.username}`)
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                      {follower.avatar ? (
                        <img
                          src={resolveImageUrl(follower.avatar)}
                          alt={follower.username}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                          }}
                        />
                      ) : (
                        <span className="text-gray-500 dark:text-gray-300">
                          {follower.username[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{follower.username}</p>
                      {follower.fullName && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{follower.fullName}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">No followers yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Silme onay modalı - Gönderiler için */}
      {confirmDelete && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-40"
        >
          <div 
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Gönderiyi Sil
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Bu gönderiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletePostMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletePostMutation.isPending ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowing && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Following</h2>
              <button
                onClick={() => setShowFollowing(false)}
                className="text-2xl hover:opacity-70 text-gray-500 dark:text-gray-400"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {following && following.length > 0 ? (
                following.map((follow: any) => (
                  <div
                    key={follow.id}
                    className="p-4 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => {
                      setShowFollowing(false)
                      router.push(`/profile/${follow.username}`)
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                      {follow.avatar ? (
                        <img
                          src={resolveImageUrl(follow.avatar)}
                          alt={follow.username}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                          }}
                        />
                      ) : (
                        <span className="text-gray-500 dark:text-gray-300">
                          {follow.username[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{follow.username}</p>
                      {follow.fullName && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{follow.fullName}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">Not following anyone yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {profile.isOwnProfile && (
        <CreatePostModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setPostType('post') // Reset to default
          }}
          username={username}
          userId={profile?.id} // Pass user ID for query invalidation
          postType={postType}
        />
      )}

      {/* Post Detail Modal */}
      {selectedPostId && (
        <PostModal
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}

      {/* Profile Photo Zoom Modal */}
      {zoomImage && (
        <ZoomModal src={zoomImage} onClose={() => setZoomImage(null)} />
      )}

      {/* 3D Sergi Turu */}
      <ArtGallery3D
        artworks={profileArtworksBase}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
    </>
  )
}

export default function ProfilePage() {
  // QueryClientProvider'ın kesinlikle çalıştığından emin olmak için
  // ProfileContent'i doğrudan render et (AuthGuard zaten Providers içinde)
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  )
}

