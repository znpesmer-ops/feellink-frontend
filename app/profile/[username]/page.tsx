'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import { CreatePostModal } from '@/components/create-post-modal'
import { PostModal } from '@/components/post-modal'
import UserArticles from '@/components/user-articles'
import DraftArticles from '@/components/draft-articles'
import { Plus, Grid, FileText, Calendar, Image as ImageIcon, Heart, MessageCircle, MoreVertical, Trash2, Clock, Edit, Bookmark } from 'lucide-react'
import { FiGrid, FiFileText, FiMessageCircle, FiImage, FiCalendar, FiClock } from 'react-icons/fi'
import { initPostsSocket, initCommentsSocket } from '@/lib/socket'
// ✅ Legacy badge component'leri kaldırıldı - sadece activeRole gösterilecek
// import UserBadge from '@/components/UserBadge'
// import { UserBadges } from '@/components/profile/UserBadges'
// import { ProRoleBadge } from '@/components/ProRoleBadge'
import { ROLE_METADATA, normalizeRole } from '@/lib/role-utils'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { ProfileArtworksGrid } from '@/components/profile/ProfileArtworksGrid'
import toast from 'react-hot-toast'
import { ProfileCommentsList } from '@/components/profile/ProfileCommentsList'
import { ArtistHighlights } from '@/components/profile/ArtistHighlights'
import { SavedArtworks } from '@/components/profile/SavedArtworks'
import ZoomModal from '@/components/common/ZoomModal'
import { EditPostModal } from '@/components/profile/EditPostModal'
import { Avatar } from '@/components/ui/Avatar'
import { safeAvatar } from '@/lib/avatar-constants'
import { ProfileColorSignature } from '@/components/profile/ProfileColorSignature'

function ProfileContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { accessToken, user: currentUser, capabilities } = useAuthStore()
  const queryClient = useQueryClient()
  
  // 🔥 KRİTİK: Parametreyi array olabilir kontrolü ile string'e zorla ve decode et
  const rawParam = params.username
  const rawParamString = Array.isArray(rawParam) ? rawParam[0] : (rawParam || '')
  const decodedParam = decodeURIComponent(rawParamString) // URL decode (Sude%20Esmer -> Sude Esmer)
  
  // Parametreyi al - backend'den kontrol edilecek, frontend tahmin etmeyecek
  const paramUsername = decodedParam || ''
  
  // isMe'yi useMemo ile memoize et - infinite loop'u önlemek için
  const isMe = useMemo(() => {
    if (!currentUser?.id) return false
    return paramUsername === 'me' || paramUsername === currentUser.id || paramUsername === currentUser.username
  }, [paramUsername, currentUser?.id, currentUser?.username])
  
  // Username değişkenini güvenli şekilde tanımla
  const username: string = useMemo(() => {
    if (isMe && currentUser?.username) {
      return currentUser.username
    }
    return paramUsername || ''
  }, [isMe, currentUser?.username, paramUsername])
  
  // Aktif tab'ı URL query parameter'ından oku (sayfa yenilendiğinde korunur)
  const validTabs: Array<'posts' | 'articles' | 'comments' | 'artworks' | 'events' | 'drafts' | 'saved'> = ['posts', 'articles', 'comments', 'artworks', 'events', 'drafts', 'saved']
  const tabFromUrl = searchParams.get('tab') as 'posts' | 'articles' | 'comments' | 'artworks' | 'events' | 'drafts' | 'saved' | null
  const initialTab = (tabFromUrl && validTabs.includes(tabFromUrl)) ? tabFromUrl : 'posts'
  
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [postType, setPostType] = useState<'post' | 'artwork'>('post')
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'articles' | 'comments' | 'artworks' | 'events' | 'drafts' | 'saved'>(initialTab)
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  
  // Tab değiştiğinde URL'yi güncelle (sayfa yenilendiğinde korunur)
  const handleTabChange = (tab: 'posts' | 'articles' | 'comments' | 'artworks' | 'events' | 'drafts' | 'saved') => {
    setActiveTab(tab)
    // URL query parameter'ını güncelle (replace kullanarak history'ye ekleme)
    const currentUrl = new URL(window.location.href)
    if (tab === 'posts') {
      // 'posts' varsayılan tab, URL'den kaldır
      currentUrl.searchParams.delete('tab')
    } else {
      currentUrl.searchParams.set('tab', tab)
    }
    router.replace(currentUrl.pathname + currentUrl.search, { scroll: false })
  }
  
  // URL'den tab değiştiğinde state'i güncelle (sadece ilk yüklemede)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as 'posts' | 'articles' | 'comments' | 'artworks' | 'events' | 'drafts' | 'saved' | null
    if (tabFromUrl && validTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Sadece ilk yüklemede çalış

  // Eserler sekmesinde action=upload kontrolü - Eser yükleme modalını aç
  useEffect(() => {
    const action = searchParams.get('action')
    if (activeTab === 'artworks' && action === 'upload') {
      setPostType('artwork')
      setShowCreateModal(true)
      // URL'den action parametresini kaldır (temiz URL)
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.delete('action')
      router.replace(currentUrl.pathname + currentUrl.search, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchParams])
  const [profilePosts, setProfilePosts] = useState<any[]>([])
  const [zoomImage, setZoomImage] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<any | null>(null)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // 🔥 KRİTİK: Token yoksa hemen login'e yönlendir
  useEffect(() => {
    if (!accessToken) {
      const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      if (!tokenFromStorage) {
        // Hemen redirect yap - bekleme
        window.location.href = '/login'
      }
    }
  }, [accessToken, router])

  // Get profile data
  const { data: profile, isLoading, error: profileError } = useQuery({
    queryKey: ['profile', username, paramUsername, currentUser?.id],
    queryFn: async () => {
      // 🔥 KRİTİK: "me" parametresi için önce /users/me endpoint'ini dene
      if (paramUsername === 'me') {
        try {
          // Önce /users/me ile kullanıcı bilgisini al
          const meResponse = await api.get('/users/me')
          const meData = meResponse.data
          
          // 🔥 KRİTİK: Response kontrolü
          if (!meData) {
            throw new Error('Kullanıcı bilgisi alınamadı')
          }
          
          if (meData?.username) {
            // Username bulundu, profile endpoint'ini kullan
            const profileResponse = await api.get(`/users/profile/${meData.username}`)
            if (profileResponse.data) {
              console.log('🔍 Profile Data:', {
                activeRole: profileResponse.data.activeRole,
                roles: profileResponse.data.roles,
                isAdmin: profileResponse.data.isAdmin,
              })
            }
            return profileResponse.data
          }
          
          throw new Error('Kullanıcı adı bulunamadı')
        } catch (err: any) {
          // 401 hatası durumunda login'e yönlendir
          if (err?.response?.status === 401) {
            console.error('[Profile] Unauthorized - redirecting to login')
            useAuthStore.getState().clearAuth()
            router.push('/login')
            throw err
          }
          
          console.warn('Failed to fetch /users/me, falling back to username:', err)
          
          // Fallback 1: currentUser.username kullan
          if (currentUser?.username) {
            try {
              const response = await api.get(`/users/profile/${currentUser.username}`)
              if (response.data) {
                console.log('🔍 Profile Role:', response.data.role, 'Type:', typeof response.data.role)
              }
              return response.data
            } catch (fallbackErr: any) {
              // 401 hatası durumunda login'e yönlendir
              if (fallbackErr?.response?.status === 401) {
                console.error('[Profile] Unauthorized in fallback - redirecting to login')
                useAuthStore.getState().clearAuth()
                router.push('/login')
                throw fallbackErr
              }
              
              // Fallback 2: currentUser.id kullan
              if (currentUser?.id) {
                try {
                  const response = await api.get(`/users/profile/${currentUser.id}`)
                  if (response.data) {
                    return response.data
                  }
                } catch (idErr: any) {
                  // 401 hatası durumunda login'e yönlendir
                  if (idErr?.response?.status === 401) {
                    console.error('[Profile] Unauthorized in id fallback - redirecting to login')
                    useAuthStore.getState().clearAuth()
                    router.push('/login')
                    throw idErr
                  }
                  
                  // Son fallback: Backend'den gelen hata mesajını kullan
                  throw new Error(fallbackErr?.response?.data?.message || idErr?.response?.data?.message || 'Profil yüklenemedi')
                }
              }
              throw new Error(fallbackErr?.response?.data?.message || 'Profil yüklenemedi')
            }
          }
          
          // Fallback 3: currentUser.id ile dene
          if (currentUser?.id) {
            try {
              const response = await api.get(`/users/profile/${currentUser.id}`)
              if (response.data) {
                return response.data
              }
            } catch (idErr: any) {
              if (idErr?.response?.status === 401) {
                useAuthStore.getState().clearAuth()
                router.push('/login')
                throw idErr
              }
              throw new Error(idErr?.response?.data?.message || err?.response?.data?.message || err?.message || 'Kullanıcı bilgisi bulunamadı')
            }
          }
          
          throw new Error(err?.response?.data?.message || err?.message || 'Kullanıcı bilgisi bulunamadı')
        }
      }
      
      // Normal username veya id ile profil çek - backend kontrol edecek
      if (!username || username === 'undefined' || username === 'null') {
        throw new Error('Geçersiz kullanıcı adı.')
      }
      
      try {
        // Backend hem username hem id ile çalışacak şekilde güncellenecek
        const response = await api.get(`/users/profile/${encodeURIComponent(username)}`)
        // Debug: Log profile data to check role value
        if (response.data) {
          console.log('🔍 Profile Role:', response.data.role, 'Type:', typeof response.data.role)
        }
        return response.data
      } catch (err: any) {
        // 401 hatası durumunda login'e yönlendir
        if (err?.response?.status === 401) {
          console.error('[Profile] Unauthorized - redirecting to login')
          useAuthStore.getState().clearAuth()
          router.push('/login')
          throw err
        }
        
        // Backend'den gelen hata mesajını kullan
        throw new Error(err?.response?.data?.message || err?.message || 'Profil yüklenemedi')
      }
    },
    // Query enabled koşulu: accessToken varsa ve (username varsa veya "me" parametresi varsa)
    // "me" durumunda username currentUser'dan gelecek, bu yüzden enabled her zaman true olmalı
    // Sayfa yenilendiğinde username boş olabilir, bu durumda query çalışmamalı (redirect'i engelle)
    enabled: !!accessToken && (paramUsername === 'me' ? !!currentUser?.id : (!!username && username !== 'undefined' && username !== 'null')),
    // Profil query'si invalidate edildiğinde refetch sırasında boş gelmesini engelle
    // placeholderData ile stale data'yı göster, böylece sayfa yenilendiğinde redirect olmaz
    placeholderData: (previousData) => previousData,
    retry: (failureCount, error: any) => {
      // 401 hatası için retry yapma
      if (error?.response?.status === 401) {
        return false
      }
      // Geçersiz parametreler için retry yapma
      if (error?.message?.includes('Geçersiz') || error?.message?.includes('bulunamadı')) {
        return false
      }
      return failureCount < 2
    },
  })

  // 🔒 401 hatası durumunda login'e yönlendir - HEMEN!
  useEffect(() => {
    if (profileError && (profileError as any)?.response?.status === 401) {
      console.error('[Profile] Unauthorized error detected - redirecting to login')
      useAuthStore.getState().clearAuth()
      // Hemen redirect yap - bekleme
      window.location.href = '/login'
      return
    }
  }, [profileError, router])

  // 🔒 GÜVENLİ REDIRECT - Sadece gerekli durumlarda ve guard'larla
  useEffect(() => {
    // Guard: currentUser yoksa hiçbir şey yapma
    if (!currentUser?.id) return
    
    // Guard: Zaten /profile/me'deyse redirect yapma (infinite loop önleme)
    if (paramUsername === 'me') return
    
    // Guard: isLoading devam ediyorsa bekle
    if (isLoading) return
    
    // Guard: Sadece kendi profiliyse (username veya id ile) ve profil yüklenemezse redirect et
    // paramUsername === 'me' kontrolü yukarıda yapıldı, burada sadece username/id kontrolü yap
    const isOwnProfile = paramUsername === currentUser.username || paramUsername === currentUser.id
    if (!profile && isOwnProfile) {
      router.replace('/profile/me')
    }
  }, [isLoading, profile, currentUser?.id, currentUser?.username, paramUsername, router])

  // Profil hatası durumunda kendi profiliyse redirect et (güvenli)
  useEffect(() => {
    // Guard: currentUser yoksa hiçbir şey yapma
    if (!currentUser?.id) return
    
    // Guard: Zaten /profile/me'deyse redirect yapma (infinite loop önleme)
    if (paramUsername === 'me') return
    
    // Guard: Hata yoksa veya hala yükleniyorsa bekle
    if (!profileError || isLoading) return
    
    // Guard: Sadece kendi profiliyse (username veya id ile) redirect et
    const isOwnProfile = paramUsername === currentUser.username || paramUsername === currentUser.id
    if (isOwnProfile) {
      router.replace('/profile/me')
    }
  }, [profileError, isLoading, currentUser?.id, currentUser?.username, paramUsername, router])

  // Boşluklu isim veya geçersiz kullanıcı adı hatası için redirect (güvenli)
  useEffect(() => {
    // Guard: currentUser yoksa hiçbir şey yapma
    if (!currentUser?.username) return
    
    // Guard: Zaten /profile/me'deyse redirect yapma
    if (paramUsername === 'me') return
    
    // Guard: Hata yoksa veya hala yükleniyorsa bekle
    if (!profileError || isLoading) return
    
    const errorMessage = profileError instanceof Error ? profileError.message : ''
    const rawParamString = Array.isArray(params.username) ? params.username[0] : (params.username || '')
    const decodedParamCheck = decodeURIComponent(rawParamString)
    
    // Sadece geçersiz kullanıcı adı hatası varsa redirect et
    if ((errorMessage.includes('Geçersiz kullanıcı adı') || decodedParamCheck?.includes(' '))) {
      router.replace('/profile/me')
    }
  }, [profileError, isLoading, currentUser?.username, params.username, paramUsername, router])

  // Helper function to check if user is corporate
  const isCorporateUser = profile?.role?.toUpperCase() === 'CORPORATE'
  
  // Helper function to check if user can upload artwork (capability-based)
  // ✅ KRİTİK: Yetki kontrolü HER ZAMAN giriş yapan kullanıcıdan (currentUser/me) okunur
  // 🎯 Rol bazlı yetki kısıtları izole edildi (devre dışı, kod korunuyor)
  // Tüm kullanıcılar tüm özelliklere erişebilir
  const ALLOW_ALL_ROLES = true // Geri alınabilir flag

  // ❌ YANLIŞ: profile.role ile kontrol (başkasının profili olabilir)
  // ✅ DOĞRU: currentUser veya capabilities ile kontrol
  const canUploadArtwork = useMemo(() => {
    // ✅ Tüm kullanıcılar eser yükleyebilir (rol kısıtı yok)
    if (ALLOW_ALL_ROLES) {
      return true
    }

    // 🔄 Orijinal kod (geri alınabilir)
    // Önce capabilities'den kontrol et (en güvenilir kaynak)
    if (capabilities?.permissions?.canCreateArtworks) {
      return true
    }
    
    // Fallback: currentUser'dan kontrol et
    if (!currentUser) {
      return false
    }
    
    // Eser yükleme yetkisi olan roller
    const artworkUploadRoles = ['artist', 'corporate', 'collector', 'gallery']
    
    // Role string kontrolü (case-insensitive)
    const roleStr = String(currentUser.role || '').toLowerCase()
    const isRoleMatch = artworkUploadRoles.includes(roleStr)
    
    // Roles array kontrolü
    const hasRoleInArray = Array.isArray(currentUser.roles) && (
      currentUser.roles.some((r: string) => artworkUploadRoles.includes(String(r).toLowerCase()))
    )
    
    // Direct role checks (case-insensitive)
    const hasArtworkRole = artworkUploadRoles.some(role => 
      currentUser.role?.toLowerCase() === role || 
      (Array.isArray(currentUser.roles) && currentUser.roles.some((r: string) => String(r).toLowerCase() === role))
    )
    
    return isRoleMatch || hasRoleInArray || hasArtworkRole
  }, [capabilities?.permissions?.canCreateArtworks, currentUser])
  
  // Tab yapısı - Tüm sekmeler (herkes için görünür, plan kontrolü kaldırıldı)
  const allTabs = [
    { key: 'posts', label: 'Gönderiler', icon: FiGrid },
    { key: 'artworks', label: 'Eserler', icon: FiImage },
    { key: 'articles', label: 'Yazılar', icon: FiFileText },
    { key: 'comments', label: 'Yorumlar', icon: FiMessageCircle },
    { key: 'events', label: 'Etkinlikler', icon: FiCalendar },
    // Kaydedilenler sekmesi sadece kendi profili için görünür
    ...(isMe ? [{ key: 'saved', label: 'Kaydedilenler', icon: Bookmark }] : []),
  ]
  
  // Plan kontrolü kaldırıldı - artık tüm sekmeler herkes için görünür
  const tabs = allTabs
  
  // Debug: Tab'ların oluşturulmasını kontrol et (development'ta)
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && profile) {
      console.log('🔍 Profile Tab Debug:', {
        hasProfile: !!profile,
        profileRole: profile?.role,
        profileRoles: profile?.roles,
        profilePlan: profile?.plan,
        canUploadArtwork,
        allTabsCount: allTabs.length,
        filteredTabsCount: tabs.length,
        tabKeys: tabs.map(t => t.key),
        tabs: tabs.map(t => ({ key: t.key, label: t.label, requiresPro: (t as any).requiresPro || false }))
      })
    }
  }, [profile, canUploadArtwork])

  // Get user posts - with fallback endpoint support
  // ✅ Posts tab için: sadece type='post' olanları getir
  const { data: userPostsData, isLoading: isLoadingPosts, error: postsError } = useQuery({
    queryKey: ['user-posts', profile?.id, 'post'],
    queryFn: async () => {
      if (!profile?.id) return []
      
      // ✅ Type filtresi ile sadece 'post' tipindekileri getir
      const response = await api.get(`/posts/user/${profile.id}?type=post`)
      const posts = response.data || []
      
      // Debug log
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('🔍 User Posts Query Debug (type=post):', {
          userId: profile.id,
          postsCount: posts.length,
          posts: posts.map((p: any) => ({ id: p.id, type: p.type, hasMedia: !!p.media?.length }))
        })
      }
      
      return posts
    },
    enabled: !!accessToken && !!profile?.id,
    retry: 1, // Sadece 1 kez retry yap
    retryOnMount: false, // Mount'ta retry yapma
  })

  // Get user events (for corporate users and users who can upload artwork)
  const { data: userEvents } = useQuery({
    queryKey: ['user-events', profile?.id],
    queryFn: async () => {
      if (!profile?.id || (!isCorporateUser && !canUploadArtwork)) return []
      const response = await api.get(`/events?authorId=${profile.id}`)
      return response.data
    },
    enabled: !!accessToken && !!profile?.id && (isCorporateUser || canUploadArtwork),
  })

  // ✅ Artworks tab için: sadece type='artwork' olanları getir
  const { data: userArtworks, isLoading: isLoadingArtworks } = useQuery({
    queryKey: ['user-artworks', profile?.id, 'artwork'],
    queryFn: async () => {
      if (!profile?.id) return []
      
      // ✅ Type filtresi ile sadece 'artwork' tipindekileri getir
      const response = await api.get(`/posts/user/${profile.id}?type=artwork`)
      const posts = response.data || []
      
      // Debug log
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('🔍 User Artworks Query Debug (type=artwork):', {
          userId: profile.id,
          artworksCount: posts.length,
          artworks: posts.map((p: any) => ({ id: p.id, type: p.type, hasMedia: !!p.media?.length }))
        })
      }
      
      return posts
    },
    enabled: !!accessToken && !!profile?.id,
    retry: 1,
    retryOnMount: false,
  })

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.delete(`/posts/${postId}`)
    },
    onSuccess: (_, postId) => {
      toast.success('Gönderi başarıyla silindi')
      // Remove from local state
      setProfilePosts((prev) => prev.filter((p) => p.id !== postId))
      // Sadece ilgili query'leri invalidate et (profil query'sine dokunma - redirect'i engelle)
      queryClient.invalidateQueries({ queryKey: ['user-posts', profile?.id] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      // Profil query'sini invalidate etme - kullanıcı profil sayfasında kalmalı
      
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
      if (profileMenuOpen) {
        const target = event.target as HTMLElement
        if (!target.closest('.profile-menu-container')) {
          setProfileMenuOpen(false)
        }
      }
    }
    if (menuOpen || profileMenuOpen) {
      // Use capture phase to check before other handlers
      document.addEventListener('mousedown', handleClickOutside, true)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true)
      }
    }
  }, [menuOpen, profileMenuOpen])

  // ✅ Username değiştiğinde profilePosts'u sıfırla (çift render'ı önle)
  useEffect(() => {
    setProfilePosts([])
  }, [username, profile?.id])

  // ✅ Tab değiştiğinde doğru data'yı göster
  useEffect(() => {
    if (activeTab === 'posts') {
      // Posts tab: backend'den zaten type=post filtrelenmiş geliyor
      setProfilePosts(userPostsData || [])
    } else if (activeTab === 'artworks') {
      // Artworks tab: backend'den zaten type=artwork filtrelenmiş geliyor
      setProfilePosts(userArtworks || [])
    } else {
      // Diğer tab'lar için boş
      setProfilePosts([])
    }
  }, [activeTab, userPostsData, userArtworks])

  // 🔔 Socket.IO ile real-time post dinleme
  useEffect(() => {
    if (!accessToken || !profile?.id) return

    const postsSocket = initPostsSocket(accessToken)

    postsSocket.on('postCreated', (newPost: any) => {
      // Eğer yeni gönderi bu profil kullanıcısına aitse listeye ekle
      if (newPost.author?.id === profile?.id) {
        // ✅ Type kontrolü: sadece aktif tab'a uygun olanları ekle
        const shouldAdd = 
          (activeTab === 'posts' && (!newPost.type || newPost.type === 'post')) ||
          (activeTab === 'artworks' && newPost.type === 'artwork')
        
        if (shouldAdd) {
          setProfilePosts((prev) => {
            // Çift eklemeyi önle
            if (prev.some((p) => p.id === newPost.id)) {
              return prev
            }
            return [newPost, ...prev]
          })
        }
        
        // İlgili query'leri invalidate et
        if (newPost.type === 'artwork') {
          queryClient.invalidateQueries({ queryKey: ['user-artworks', profile?.id, 'artwork'] })
        } else {
          queryClient.invalidateQueries({ queryKey: ['user-posts', profile?.id, 'post'] })
        }
        queryClient.invalidateQueries({ queryKey: ['profile', username] })
      }
    })

    // 🔔 Real-time beğeni güncellemeleri
    postsSocket.on('postLikeUpdated', (data: { postId: string; change: number; likeCount: number; isLiked: boolean; userId: string }) => {
      // Profil postlarından bu post'u güncelle
      setProfilePosts((prev) =>
        prev.map((p: any) => {
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
        })
      )
      // Profil query'sini de güncelle
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      queryClient.invalidateQueries({ queryKey: ['user-posts', profile?.id] })
    })

    // 🔔 Real-time yorum güncellemeleri (yorum sayısı için)
    const commentsSocket = initCommentsSocket(accessToken)
    commentsSocket.on('commentCreated', (data: any) => {
      // Profil postlarından bu post'un yorum sayısını güncelle
      setProfilePosts((prev) =>
        prev.map((p: any) => {
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
        })
      )
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      // ✅ Yorumlar grid'ini de güncelle (eğer aktif sekme yorumlar ise)
      queryClient.invalidateQueries({ queryKey: ['user-comments', profile?.id] })
    })

    commentsSocket.on('commentDeleted', (data: { id: string; postId: string }) => {
      // Profil postlarından bu post'un yorum sayısını güncelle
      setProfilePosts((prev) =>
        prev.map((p: any) => {
          if (p.id === data.postId) {
            return {
              ...p,
              _count: {
                ...p._count,
                comments: Math.max(0, (p._count?.comments || 0) - 1),
              },
            }
          }
          return p
        })
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
      if (!profile?.id) throw new Error('Profile ID is required')
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
      if (!profile?.id) return []
      const response = await api.get(`/follow/${profile.id}/followers`)
      return response.data || []
    },
    enabled: !!profile?.id && showFollowers,
  })

  // Get following
  const { data: following } = useQuery({
    queryKey: ['following', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const response = await api.get(`/follow/${profile.id}/following`)
      return response.data
    },
    enabled: !!profile && showFollowing,
  })

  // Remove follower mutation (Instagram-style: remove someone who follows you)
  const removeFollowerMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/follow/remove-follower/${userId}`)
    },
    onSuccess: () => {
      toast.success('Takipçi kaldırıldı')
      queryClient.invalidateQueries({ queryKey: ['followers', profile?.id] })
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Takipçi kaldırılamadı')
    },
  })

  // Unfollow mutation (for following list)
  const unfollowMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/follow/${userId}`)
    },
    onSuccess: () => {
      toast.success('Takip bırakıldı')
      queryClient.invalidateQueries({ queryKey: ['following', profile?.id] })
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Takip bırakılamadı')
    },
  })

  // State for remove follower confirmation modal
  const [showRemoveFollowerModal, setShowRemoveFollowerModal] = useState<{ userId: string; username: string } | null>(null)
  
  // State for unfollow confirmation modal
  const [showUnfollowModal, setShowUnfollowModal] = useState<{ userId: string; username: string } | null>(null)

  // State for dropdown menu in followers/following lists
  const [listMenuOpen, setListMenuOpen] = useState<string | null>(null)

  const handleFollow = () => {
    if (!profile?.id) return
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
    if (!profile?.id) return
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

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/users/${userId}/block`)
    },
    onSuccess: () => {
      toast.success('Kullanıcı engellendi')
      setShowBlockModal(false)
      setProfileMenuOpen(false)
      // Ana sayfaya yönlendir
      router.push('/')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kullanıcı engellenirken bir hata oluştu')
    },
  })

  const handleBlockUser = () => {
    if (!profile?.id) return
    setShowBlockModal(true)
    setProfileMenuOpen(false)
  }

  const handleConfirmBlock = () => {
    if (!profile?.id) return
    blockUserMutation.mutate(profile.id)
  }

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (listMenuOpen) {
        setListMenuOpen(null)
      }
    }

    if (listMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [listMenuOpen])

  // Early return kontrolleri - ASLA null dönme, her zaman UI göster
  if (!accessToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  // 🔥 KRİTİK: ÖNCE 401 hatası kontrolü - currentUser kontrolünden önce!
  // 401 hatası varsa login'e yönlendir (loading gösterilmesin)
  if (profileError && (profileError as any)?.response?.status === 401) {
    // useEffect'te redirect yapıldı, burada sadece kısa loading göster
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Yönlendiriliyorsunuz...</p>
        </div>
      </div>
    )
  }

  // 🔥 KRİTİK: Token yoksa login'e yönlendir (loading gösterme)
  if (!accessToken) {
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    if (!tokenFromStorage) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Yönlendiriliyorsunuz...</p>
          </div>
        </div>
      )
    }
  }

  // 🔥 KRİTİK: Query enabled koşulu kontrolü
  // Query enabled koşulu: accessToken varsa ve (username varsa veya "me" parametresi varsa)
  const isQueryEnabled = !!accessToken && (paramUsername === 'me' ? !!currentUser?.id : (!!username && username !== 'undefined' && username !== 'null'))
  
  // Query disabled ise ve token yoksa - hemen login'e yönlendir
  if (!isQueryEnabled && !accessToken) {
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    if (!tokenFromStorage) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Yönlendiriliyorsunuz...</p>
          </div>
        </div>
      )
    }
  }
  
  // Query disabled ise ve token varsa ama currentUser yoksa - AuthGuard yükleniyor olabilir
  if (!isQueryEnabled && accessToken && !currentUser?.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }
  
  // Query disabled ise ve profil yoksa - query çalışmıyor, null döndür
  if (!isQueryEnabled && !profile) {
    return null
  }

  // 🔥 KRİTİK: Önce loading kontrolü - sadece query enabled ise loading göster
  if (isLoading && isQueryEnabled) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  // 🔥 KRİTİK: Hata durumunu göster - loading false ve error varsa
  if (profileError && !isLoading) {
    const errorMessage = profileError instanceof Error ? profileError.message : 'Bilinmeyen bir hata oluştu'
    const errorStatus = (profileError as any)?.response?.status
    
    // 🔥 KRİTİK: 404 hatası - kullanıcı bulunamadı (başkasının profili için)
    if (errorStatus === 404 || errorMessage.includes('bulunamadı') || errorMessage.includes('not found')) {
      return (
        <div className="text-center py-12">
          <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            <p className="font-semibold mb-2">Kullanıcı bulunamadı</p>
            <p className="text-xs mb-4">
              {paramUsername === 'me' 
                ? 'Profil bilgileriniz yüklenemedi. Lütfen sayfayı yenileyin veya tekrar giriş yapın.'
                : `@${paramUsername} kullanıcısı bulunamadı veya hesap silinmiş olabilir.`}
            </p>
            {paramUsername === 'me' && (
              <button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['profile', username, paramUsername, currentUser?.id] })
                  window.location.reload()
                }}
                className="px-4 py-2 text-xs font-medium bg-brand-orange text-white rounded-xl hover:bg-brand-orange/90 transition"
              >
                Sayfayı Yenile
              </button>
            )}
          </div>
        </div>
      )
    }
    
    // Kendi profiliyse ve /profile/me'de değilsek redirect yapılacak (useEffect'te)
    // /profile/me'deysek normal akışa devam et (hata mesajını göster)
    if (isMe && currentUser?.id && paramUsername !== 'me') {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      )
    }

    // Boşluklu isim (fullName) hatası için otomatik yönlendirme
    const rawParamString = Array.isArray(params.username) ? params.username[0] : (params.username || '')
    const decodedParamCheck = decodeURIComponent(rawParamString)
    if ((errorMessage.includes('Geçersiz kullanıcı adı') || decodedParamCheck?.includes(' ')) && currentUser?.username) {
      // Redirect useEffect'te yapılacak, burada loading göster
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      )
    }
    
    // Network error'ları için daha yumuşak mesaj ve otomatik retry
    const isNetworkError = errorMessage.includes('Bağlantı kurulamadı') || 
                          errorMessage.includes('Sunucuya bağlanılamıyor') ||
                          errorMessage.includes('Network Error') ||
                          errorMessage.includes('ERR_NETWORK')
    
    if (isNetworkError) {
      // Network error için daha yumuşak mesaj ve otomatik retry
      return (
        <div className="text-center py-12">
          <div className="rounded-3xl border border-orange-200 bg-orange-50 px-6 py-8 text-center text-sm text-orange-700 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-300">
            <p className="font-semibold mb-2">Bağlantı sorunu</p>
            <p className="text-xs mb-4">Profil bilgileri yüklenemedi. Lütfen sayfayı yenileyin.</p>
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['profile', username] })
                window.location.reload()
              }}
              className="px-4 py-2 text-xs font-medium bg-brand-orange text-white rounded-xl hover:bg-brand-orange/90 transition"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      )
    }
    
    // Kendi profiliyse ve /profile/me'de değilsek otomatik redirect yap
    if (isMe && currentUser?.id && paramUsername !== 'me') {
      // Redirect useEffect'te yapılacak, burada loading göster
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      )
    }

    return (
      <div className="text-center py-12">
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          <p className="font-semibold mb-2">Profil yüklenemedi</p>
          <p className="text-xs mb-4">{errorMessage}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['profile', username, paramUsername, currentUser?.id] })
              }}
              className="px-4 py-2 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Tekrar Dene
            </button>
            {isMe && (
              <button
                onClick={() => router.replace('/profile/me')}
                className="px-4 py-2 text-xs font-medium bg-brand-orange text-white rounded-xl hover:bg-brand-orange/90 transition"
              >
                Profilime Git
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  // 🔥 KRİTİK: Profil yoksa ve error da yoksa - sadece query disabled olduğunda olabilir
  // Bu durumda loading gösterme, query enabled olmadığı için veri gelmeyecek
  if (!profile && !isLoading && !profileError) {
    // Query enabled kontrolü yapılmış, burada sadece guard olarak kontrol
    // Normalde buraya ulaşmamalı çünkü enabled koşulu var
    return null
  }

  // 🔥 KRİTİK: Profile yoksa ve error yoksa ama loading false ise - bu durumda query disabled
  // Token yoksa login'e yönlendir, token varsa ama profil yoksa loading göster
  if (!profile) {
    // Token yoksa login'e yönlendir (zaten useEffect'te yapılıyor)
    if (!accessToken) {
      const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      if (!tokenFromStorage) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        )
      }
    }
    // Token varsa ama profil yoksa - query disabled olabilir veya henüz yükleniyor
    // Query enabled kontrolü yapılmış, burada sadece guard olarak kontrol
    // Normalde buraya ulaşmamalı çünkü enabled koşulu var
    return null
  }

  return (
    <>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-start space-y-4 md:space-y-0 md:space-x-8 mb-8 bg-white dark:bg-gray-950 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
          {/* ✅ Avatar - Güvenli fallback ile */}
          <div 
            className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 cursor-zoom-in transition-transform hover:scale-105"
            onClick={() => {
              // Avatar varsa zoom modal aç
              const avatarSrc = profile?.avatar ? resolveImageUrl(profile.avatar) : null
              if (avatarSrc) {
                setZoomImage(avatarSrc)
              }
            }}
          >
            <Avatar
              src={profile?.avatar ? resolveImageUrl(profile.avatar) : null}
              alt={profile?.username || 'Kullanıcı'}
              className="w-full h-full"
            />
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-light text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {profile?.username || 'Kullanıcı'}
                    {profile?.isVerified && <span className="text-gray-900 dark:text-gray-100">✓</span>}
                    {/* ✅ Legacy badge component'leri kaldırıldı - sadece activeRole gösterilecek */}
                  </h1>
                </div>
                {/* ✅ Rol Badge - LED çerçeveli, username'in hemen altında */}
                {profile?.activeRole && (
                  <div className="group relative inline-block">
                    <span className="role-badge-led">
                      {profile.activeRole}
                    </span>
                    {/* 🔒 Rol değiştir linki kaldırıldı - Rol değişikliği artık sadece Admin Paneli üzerinden yapılacak */}
                  </div>
                )}
                {/* ✅ Legacy UserBadges component'i kaldırıldı - sadece activeRole gösterilecek */}
              </div>
              {/* Sağ Buton Grubu - Profili Düzenle + İçerik Yükle */}
              {profile?.isOwnProfile && (
                <div className="flex items-center gap-2">
                  {/* ➕ İçerik Yükle - Dropdown Menü */}
                  <div className="relative">
                    <button
                      onClick={() => setCreateMenuOpen(!createMenuOpen)}
                      className="flex items-center justify-center w-10 h-10 rounded-full 
                                 bg-[#FF8A00] text-white shadow-sm hover:bg-[#e67a00] 
                                 transition-all duration-200 hover:scale-105 active:scale-95"
                      title="İçerik Yükle"
                    >
                      <Plus size={20} strokeWidth={2.5} />
                    </button>

                    {/* Dropdown Menü */}
                    {createMenuOpen && (
                      <>
                        {/* Backdrop - menüyü kapatmak için */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setCreateMenuOpen(false)}
                        />
                        {/* Menü */}
                        <div className="absolute right-0 mt-2 bg-white dark:bg-[#1a1a1a] shadow-lg rounded-xl z-20 w-52 border border-gray-200 dark:border-gray-700 overflow-hidden">
                          {/* Menü Başlığı */}
                          <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              İçerik Yükle
                            </p>
                          </div>
                          
                          {/* Gönderi Yükle */}
                          <button
                            onClick={() => {
                              setPostType('post')
                              setShowCreateModal(true)
                              setCreateMenuOpen(false)
                            }}
                            className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <FiGrid size={18} className="text-brand-orange" />
                              <span>Gönderi Yükle</span>
                            </div>
                          </button>
                          
                          {/* Eser Yükle */}
                          <button
                            onClick={() => {
                              // Direkt eser yükleme modalını aç
                              setPostType('artwork')
                              setShowCreateModal(true)
                              setCreateMenuOpen(false)
                            }}
                            className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-t border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-center gap-3">
                              <FiImage size={18} className="text-brand-orange" />
                              <span>Eser Yükle</span>
                            </div>
                          </button>
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
            
            {/* Stats - Üst satır */}
            <div className="flex space-x-6 mb-4">
              <button
                onClick={() => setShowFollowers(true)}
                className="cursor-pointer"
              >
                <span className="font-semibold text-gray-900 dark:text-gray-100">{profile?._count?.posts ?? 0}</span>{' '}
                <span className="text-gray-600 dark:text-gray-400">posts</span>
              </button>
              <button
                onClick={() => setShowFollowers(true)}
                className="cursor-pointer"
              >
                <span className="font-semibold text-gray-900 dark:text-gray-100">{profile?.followerCount ?? profile?._count?.followers ?? 0}</span>{' '}
                <span className="text-gray-600 dark:text-gray-400">takipçi</span>
              </button>
              <button
                onClick={() => setShowFollowing(true)}
                className="cursor-pointer"
              >
                <span className="font-semibold text-gray-900 dark:text-gray-100">{profile?.followingCount ?? profile?._count?.following ?? 0}</span>{' '}
                <span className="text-gray-600 dark:text-gray-400">takip</span>
              </button>
            </div>

            {/* Actions - Alt satır */}
            <div className="flex items-center gap-2 mb-4">
              {!profile?.isOwnProfile && (
                <>
                  <button
                    onClick={handleFollow}
                    disabled={followMutation.isPending}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      profile?.isFollowing
                        ? 'bg-[#f97316] text-white hover:bg-[#ea580c] active:scale-[0.97]'
                        : profile?.hasRequested
                        ? 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
                        : 'bg-[#f97316] text-white hover:bg-[#ea580c] active:scale-[0.97]'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {followMutation.isPending
                      ? '...'
                      : profile?.isFollowing
                      ? 'Takibi Bırak'
                      : profile?.hasRequested
                      ? 'İstek Gönderildi (Geri Çek)'
                      : profile.isPrivate
                      ? 'Takip İsteği Gönder'
                      : 'Takip Et'}
                  </button>
                  <button
                    onClick={handleMessage}
                    disabled={creatingConversation}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-[#f97316] text-white hover:bg-[#ea580c] active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingConversation ? '...' : 'Mesaj'}
                  </button>
                  {/* Üç nokta menü */}
                  <div className="relative profile-menu-container">
                    <button
                      onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <MoreVertical size={20} className="text-gray-700 dark:text-gray-300" />
                    </button>
                    {profileMenuOpen && (
                      <div className="absolute right-0 mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[160px] z-50">
                        <button
                          onClick={handleBlockUser}
                          className="w-full px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                          Engelle
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Bio */}
            <div>
              {/* ✅ FullName ve Renk İmzası - Aynı satır, sağ tarafta renk kutuları */}
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{profile?.fullName || profile?.username || 'Kullanıcı'}</p>
                {/* 🎨 Renk İmzası - Sağ tarafta, minimal LED hissi - Sadece kullanıcı açmışsa göster */}
                {username && username !== 'undefined' && username !== 'null' && profile?.showProfileColorSignature !== false && (
                  <ProfileColorSignature username={username} />
                )}
              </div>
              {profile?.bio && <p className="mt-1 text-gray-900 dark:text-gray-100">{profile.bio}</p>}
            </div>
          </div>
        </div>

        {/* Öne Çıkan Temalar - Eser yükleme yetkisi olan tüm rollere açık */}
        {/* Görünürlük mantığı:
            - Kullanıcı kendi profilindeyse → Temalar görünsün
            - Kullanıcı başkasının profiline bakıyorsa:
              * Profil gizliyse → Temalar gizlensin
              * Profil açıksa → Temalar görünsün */}
        {canUploadArtwork && (profile.isOwnProfile || !profile.isPrivate) && (
          <ArtistHighlights username={username} userId={profile?.id} isOwnProfile={profile.isOwnProfile} />
        )}

        {/* Sekme Butonları - Instagram Tarzı İkonlu Sekmeler - Rol bazlı görünürlük */}
        <div className="flex justify-center gap-10 mb-6 border-b border-gray-200 dark:border-gray-700 pb-3 relative">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            
            return (
              <div
                key={tab.key}
                className="relative flex flex-col items-center"
                onMouseEnter={() => setHoveredTab(tab.key)}
                onMouseLeave={() => setHoveredTab(null)}
              >
                <button
                  onClick={() => handleTabChange(tab.key as any)}
                  className={`flex items-center justify-center pb-2 px-3 transition-all relative group ${
                    isActive
                      ? 'text-brand-orange'
                      : 'text-gray-600 dark:text-gray-400 hover:text-brand-orange'
                  }`}
                  title={tab.label}
                >
                  <Icon 
                    size={22} 
                    className={`transition-all duration-200 ${
                      isActive 
                        ? 'scale-110' 
                        : 'group-hover:scale-105'
                    }`}
                  />
                  {/* Aktif sekme alt çizgisi */}
                  {isActive && (
                    <div className="absolute -bottom-3 left-0 right-0 h-[2px] bg-brand-orange rounded-full shadow-[0_1px_2px_rgba(255,123,0,0.3)]"></div>
                  )}
                </button>

                {/* Tooltip */}
                {hoveredTab === tab.key && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium text-brand-orange dark:text-brand-orange shadow-lg border border-gray-200/70 dark:border-gray-700/50 whitespace-nowrap z-10 animate-in fade-in slide-in-from-top-1 duration-150">
                    {tab.label}
                    {/* Tooltip ok */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/90 dark:bg-[#1a1a1a]/90 border-l border-t border-gray-200/70 dark:border-gray-700/50 rotate-45"></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Sekme İçerikleri */}
        {activeTab === 'articles' ? (
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
            <UserArticles key={`articles-${profile.id}-${activeTab}`} authorId={profile.id} />
          </div>
        ) : activeTab === 'comments' ? (
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
            <ProfileCommentsList username={username} userId={profile.id} />
          </div>
        ) : activeTab === 'artworks' && canUploadArtwork ? (
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-4 md:p-6 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
            <ProfileArtworksGrid username={username} artworks={userArtworks || []} userId={profile?.id} />
          </div>
        ) : activeTab === 'saved' && isMe ? (
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-4 md:p-6 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
            <SavedArtworks userId={profile.id} />
          </div>
        ) : activeTab === 'events' && (isCorporateUser || canUploadArtwork) ? (
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
          ) : profilePosts.length > 0 ? (
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-4 md:p-6 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
              <div className="grid grid-cols-3 gap-2">
                {profilePosts.map((post: any) => {
                  // Check if current user is the post owner
                  const isOwner = currentUser?.id === post.userId || currentUser?.username === username
                  
                  return (
                    <div
                      key={post.id}
                      className="aspect-square relative cursor-pointer group overflow-hidden rounded-xl transition-all duration-300 hover:ring-2 hover:ring-brand-orange hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-gray-950"
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
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingPost(post)
                                      setMenuOpen(null)
                                    }}
                                    className="w-full px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-sm font-medium transition-colors"
                                  >
                                    <Edit size={16} />
                                    Düzenle
                                  </button>
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
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-12 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors text-center">
              <p className="text-gray-500 dark:text-gray-400">Henüz gönderi yok</p>
            </div>
          )
        ) : null}
      </div>

      {/* Followers Modal */}
      {showFollowers && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFollowers(false)}
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
                    className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative"
                  >
                    <div
                      className="flex items-center space-x-3 flex-1 cursor-pointer min-w-0"
                      onClick={() => {
                        setShowFollowers(false)
                        router.push(`/profile/${follower.username}`)
                      }}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        <Avatar
                          src={follower.avatar ? resolveImageUrl(follower.avatar) : null}
                          alt={follower.username}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{follower.username}</p>
                        {follower.fullName && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{follower.fullName}</p>
                        )}
                      </div>
                    </div>
                    {/* Sağ taraf - Takipten çıkar butonu - sadece kendi profilinde görünür */}
                    {isMe && (
                      <div className="flex items-center shrink-0 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowRemoveFollowerModal({ userId: follower.id, username: follower.username })
                          }}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline leading-none px-2 py-1"
                          type="button"
                        >
                          Takipten çıkar
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">No followers yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Düzenleme modalı - Gönderiler için */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          open={!!editingPost}
          onClose={() => setEditingPost(null)}
          onSuccess={() => {
            setEditingPost(null)
          }}
        />
      )}

      {/* Silme onay modalı - Gönderiler için */}
      {confirmDelete && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-40"
          onClick={handleCancelDelete}
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
          onClick={() => setShowFollowing(false)}
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
                    className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative"
                  >
                    <div
                      className="flex items-center space-x-3 flex-1 cursor-pointer min-w-0"
                      onClick={() => {
                        setShowFollowing(false)
                        router.push(`/profile/${follow.username}`)
                      }}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        <Avatar
                          src={follow.avatar ? resolveImageUrl(follow.avatar) : null}
                          alt={follow.username}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{follow.username}</p>
                        {follow.fullName && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{follow.fullName}</p>
                        )}
                      </div>
                    </div>
                    {/* Sağ taraf - Takibi bırak butonu - sadece kendi profilinde görünür */}
                    {isMe && (
                      <div className="flex items-center shrink-0 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowUnfollowModal({ userId: follow.id, username: follow.username })
                          }}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline leading-none px-2 py-1"
                          type="button"
                        >
                          Takibi bırak
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">Not following anyone yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remove Follower Confirmation Modal */}
      {showRemoveFollowerModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowRemoveFollowerModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Takipten çıkar
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              <span className="font-semibold">@{showRemoveFollowerModal.username}</span> kullanıcısını takipçilerinizden çıkarmak istiyor musunuz? Bu işlem sessizce gerçekleşir ve bildirim gönderilmez.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveFollowerModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  removeFollowerMutation.mutate(showRemoveFollowerModal.userId)
                  setShowRemoveFollowerModal(null)
                  setListMenuOpen(null)
                }}
                disabled={removeFollowerMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {removeFollowerMutation.isPending ? 'Kaldırılıyor...' : 'Takipten çıkar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unfollow Confirmation Modal */}
      {showUnfollowModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowUnfollowModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Takibi bırak
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              <span className="font-semibold">@{showUnfollowModal.username}</span> kullanıcısını takip etmeyi bırakmak istiyor musunuz?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUnfollowModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  unfollowMutation.mutate(showUnfollowModal.userId)
                  setShowUnfollowModal(null)
                  setListMenuOpen(null)
                }}
                disabled={unfollowMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {unfollowMutation.isPending ? 'Bırakılıyor...' : 'Takibi bırak'}
              </button>
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
          userId={profile?.id}
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

      {/* Block User Modal */}
      {showBlockModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowBlockModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Bu kişiyi engelle
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Bu kişiyi engellersen:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Profilini göremezsin</li>
                <li>Sana mesaj atamaz</li>
                <li>Takip edemez</li>
              </ul>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleConfirmBlock}
                disabled={blockUserMutation.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {blockUserMutation.isPending ? '...' : 'Engelle'}
              </button>
            </div>
          </div>
        </div>
      )}
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

