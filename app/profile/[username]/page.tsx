'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import { CreatePostModal } from '@/components/create-post-modal'
import { PostModal } from '@/components/post-modal'
import UserArticles from '@/components/user-articles'
import DraftArticles from '@/components/draft-articles'
import { Plus, Grid, FileText, Calendar, Image as ImageIcon, Heart, MessageCircle } from 'lucide-react'
import { initPostsSocket, initCommentsSocket } from '@/lib/socket'
import UserBadge from '@/components/UserBadge'
import { UserBadges } from '@/components/profile/UserBadges'
import { ProRoleBadge } from '@/components/ProRoleBadge'

function ProfileContent() {
  const params = useParams()
  const router = useRouter()
  const { accessToken, user: currentUser } = useAuthStore()
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
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'articles' | 'drafts' | 'events'>('posts')
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const [profilePosts, setProfilePosts] = useState<any[]>([])

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
              console.log('🔍 Profile Role:', profileResponse.data.role, 'Type:', typeof profileResponse.data.role)
            }
            return profileResponse.data
          }
          
          throw new Error('Kullanıcı adı bulunamadı')
        } catch (err: any) {
          console.warn('Failed to fetch /users/me, falling back to username:', err)
          
          // Fallback: currentUser.username kullan
          if (currentUser?.username) {
            try {
              const response = await api.get(`/users/profile/${currentUser.username}`)
              if (response.data) {
                console.log('🔍 Profile Role:', response.data.role, 'Type:', typeof response.data.role)
              }
              return response.data
            } catch (fallbackErr) {
              throw new Error('Profil yüklenemedi. Lütfen tekrar giriş yapın.')
            }
          }
          
          throw new Error(err?.response?.data?.message || err?.message || 'Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.')
        }
      }
      
      // Normal username ile profil çek
      if (!username || username === 'undefined' || username === 'null') {
        throw new Error('Geçersiz kullanıcı adı')
      }
      
      try {
        const response = await api.get(`/users/profile/${username}`)
        // Debug: Log profile data to check role value
        if (response.data) {
          console.log('🔍 Profile Role:', response.data.role, 'Type:', typeof response.data.role)
        }
        return response.data
      } catch (err: any) {
        throw new Error(err?.response?.data?.message || err?.message || 'Profil yüklenemedi')
      }
    },
    enabled: !!accessToken && (!!username || paramUsername === 'me'),
    retry: (failureCount, error: any) => {
      // Geçersiz parametreler için retry yapma
      if (error?.message?.includes('Geçersiz') || error?.message?.includes('bulunamadı')) {
        return false
      }
      return failureCount < 2
    },
  })

  // Helper function to check if user is corporate
  const isCorporateUser = profile?.role?.toUpperCase() === 'CORPORATE'

  // Get user posts
  const { data: userPostsData } = useQuery({
    queryKey: ['user-posts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const response = await api.get(`/posts/user/${profile.id}`)
      return response.data
    },
    enabled: !!accessToken && !!profile?.id,
  })

  // Get user events (only for corporate users)
  const { data: userEvents } = useQuery({
    queryKey: ['user-events', profile?.id],
      queryFn: async () => {
      if (!profile?.id || !isCorporateUser) return []
      const response = await api.get(`/events?authorId=${profile.id}`)
      return response.data
    },
    enabled: !!accessToken && !!profile?.id && isCorporateUser,
  })

  // Update profilePosts when data changes
  useEffect(() => {
    if (userPostsData) {
      setProfilePosts(userPostsData || [])
    }
  }, [userPostsData])

  // 🔔 Socket.IO ile real-time post dinleme
  useEffect(() => {
    if (!accessToken || !profile?.id) return

    const postsSocket = initPostsSocket(accessToken)

    postsSocket.on('postCreated', (newPost: any) => {
      // Eğer yeni gönderi bu profil kullanıcısına aitse listeye ekle
      if (newPost.author?.id === profile.id) {
        setProfilePosts((prev) => {
          // Çift eklemeyi önle
          if (prev.some((p) => p.id === newPost.id)) {
            return prev
          }
          return [newPost, ...prev]
        })
        // Profil query'sini de invalidate et
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

  // Early return kontrolleri - JSX içinde yapılacak
  if (!accessToken) {
    return null
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
    return (
      <div className="text-center py-12">
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          <p className="font-semibold mb-2">Profil yüklenemedi</p>
          <p className="text-xs mb-4">{errorMessage}</p>
          <button
            onClick={() => router.push('/profile/me')}
            className="px-4 py-2 text-xs font-medium bg-[#ff7b00] text-white rounded-xl hover:bg-[#e96f00] transition"
          >
            Profilime Git
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
              className="px-4 py-2 text-xs font-medium bg-[#ff7b00] text-white rounded-xl hover:bg-[#e96f00] transition"
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
              <img
                src={profile.avatar}
                alt={profile.username}
                className="w-full h-full object-cover"
              />
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
                  <h1 className="text-2xl font-light text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {profile.username}
                    {profile.isVerified && <span className="text-gray-900 dark:text-gray-100">✓</span>}
                    <UserBadge role={profile.role} />
                    <ProRoleBadge roles={profile.roles} plan={profile.plan} />
                  </h1>
                </div>
                <UserBadges badges={profile.badges} />
              </div>
              {/* Sağ Buton Grubu - Profili Düzenle + Yeni Gönderi */}
              {profile.isOwnProfile && (
                <div className="flex items-center gap-3">
                  {/* ➕ Yeni Gönderi - Minimalist İkon Butonu */}
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center justify-center w-9 h-9 rounded-full 
                               bg-[#ff7b00] text-white shadow-sm hover:bg-[#e36f00] 
                               transition-all duration-200 hover:scale-105 active:scale-95
                               hover:shadow-md"
                    title="Yeni Gönderi"
                  >
                    <Plus size={18} strokeWidth={2.5} />
                  </button>

                  {/* Profili Düzenle Butonu */}
                  <button
                    onClick={() => router.push('/profile/edit')}
                    className="px-4 py-2 text-sm font-medium bg-[#ff7b00] text-white rounded-xl 
                               shadow-sm hover:bg-[#e36f00] transition-all"
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
                        : 'bg-[#ff7b00] text-white hover:bg-[#e36f00]'
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
            </div>
          </div>
        </div>

        {/* Sekme Butonları - Instagram Tarzı İkonlu Sekmeler - Tüm kullanıcılar için görünür */}
        <div className="flex justify-center gap-10 mb-6 border-b border-gray-200 dark:border-gray-700 pb-3 relative">
          {/* Gönderiler Sekmesi */}
          <div
            className="relative flex flex-col items-center"
            onMouseEnter={() => setHoveredTab('posts')}
            onMouseLeave={() => setHoveredTab(null)}
          >
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex items-center justify-center pb-2 px-3 transition-all relative group ${
                activeTab === 'posts'
                  ? 'text-[#ff7b00]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#ff7b00]'
              }`}
            >
              <Grid 
                size={22} 
                className={`transition-all duration-200 ${
                  activeTab === 'posts' 
                    ? 'scale-110' 
                    : 'group-hover:scale-105'
                }`}
                strokeWidth={activeTab === 'posts' ? 2.5 : 1.75}
              />
              {/* Aktif sekme alt çizgisi */}
              {activeTab === 'posts' && (
                <div className="absolute -bottom-3 left-0 right-0 h-[2px] bg-[#ff7b00] rounded-full shadow-[0_1px_2px_rgba(255,123,0,0.3)]"></div>
              )}
            </button>

            {/* Tooltip - Gönderiler */}
            {hoveredTab === 'posts' && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium text-[#ff7b00] dark:text-orange-400 shadow-lg border border-gray-200/70 dark:border-gray-700/50 whitespace-nowrap z-10 animate-in fade-in slide-in-from-top-1 duration-150">
                Gönderiler
                {/* Tooltip ok */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/90 dark:bg-[#1a1a1a]/90 border-l border-t border-gray-200/70 dark:border-gray-700/50 rotate-45"></div>
              </div>
            )}
          </div>

          {/* Yazılar Sekmesi */}
          <div
            className="relative flex flex-col items-center"
            onMouseEnter={() => setHoveredTab('articles')}
            onMouseLeave={() => setHoveredTab(null)}
          >
            <button
              onClick={() => setActiveTab('articles')}
              className={`flex items-center justify-center pb-2 px-3 transition-all relative group ${
                activeTab === 'articles'
                  ? 'text-[#ff7b00]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#ff7b00]'
              }`}
            >
              <FileText 
                size={22} 
                className={`transition-all duration-200 ${
                  activeTab === 'articles' 
                    ? 'scale-110' 
                    : 'group-hover:scale-105'
                }`}
                strokeWidth={activeTab === 'articles' ? 2.5 : 1.75}
              />
              {/* Aktif sekme alt çizgisi */}
              {activeTab === 'articles' && (
                <div className="absolute -bottom-3 left-0 right-0 h-[2px] bg-[#ff7b00] rounded-full shadow-[0_1px_2px_rgba(255,123,0,0.3)]"></div>
              )}
            </button>

            {/* Tooltip - Yazılar */}
            {hoveredTab === 'articles' && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium text-[#ff7b00] dark:text-orange-400 shadow-lg border border-gray-200/70 dark:border-gray-700/50 whitespace-nowrap z-10 animate-in fade-in slide-in-from-top-1 duration-150">
                Yazılar
                {/* Tooltip ok */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/90 dark:bg-[#1a1a1a]/90 border-l border-t border-gray-200/70 dark:border-gray-700/50 rotate-45"></div>
              </div>
            )}
          </div>

          {/* Etkinlikler Sekmesi - Sadece Corporate Kullanıcılar İçin */}
          {isCorporateUser && (
            <div
              className="relative flex flex-col items-center"
              onMouseEnter={() => setHoveredTab('events')}
              onMouseLeave={() => setHoveredTab(null)}
            >
              <button
                onClick={() => setActiveTab('events')}
                className={`flex items-center justify-center pb-2 px-3 transition-all relative group ${
                  activeTab === 'events'
                    ? 'text-[#ff7b00]'
                    : 'text-gray-600 dark:text-gray-400 hover:text-[#ff7b00]'
                }`}
                title="Bu kurumsal hesabın oluşturduğu etkinlikleri görüntüle"
              >
                <Calendar 
                  size={22} 
                  className={`transition-all duration-200 ${
                    activeTab === 'events' 
                      ? 'scale-110' 
                      : 'group-hover:scale-105'
                  }`}
                  strokeWidth={activeTab === 'events' ? 2.5 : 1.75}
                />
                {/* Aktif sekme alt çizgisi */}
                {activeTab === 'events' && (
                  <div className="absolute -bottom-3 left-0 right-0 h-[2px] bg-[#ff7b00] rounded-full shadow-[0_1px_2px_rgba(255,123,0,0.3)]"></div>
                )}
              </button>

              {/* Tooltip - Etkinlikler */}
              {hoveredTab === 'events' && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium text-[#ff7b00] dark:text-orange-400 shadow-lg border border-gray-200/70 dark:border-gray-700/50 whitespace-nowrap z-10 animate-in fade-in slide-in-from-top-1 duration-150">
                  Kurumsal hesabın oluşturduğu etkinlikler
                  {/* Tooltip ok */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/90 dark:bg-[#1a1a1a]/90 border-l border-t border-gray-200/70 dark:border-gray-700/50 rotate-45"></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sekme İçerikleri */}
        {activeTab === 'events' && isCorporateUser ? (
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
                            src={event.coverImage}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-[#ff7b00]/20 to-[#ff7b00]/5 dark:from-[#ff7b00]/10 dark:to-[#ff7b00]/5 flex items-center justify-center">
                          <Calendar className="w-12 h-12 text-[#ff7b00] opacity-50" />
                        </div>
                      )}
                      
                      {/* Etkinlik Bilgileri */}
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-[#ff7b00] transition-colors">
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
                                : 'bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20 text-[#ff7b00]'
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
        ) : activeTab === 'articles' ? (
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
            <UserArticles authorId={profile.id} />
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
        ) : (profile.isOwnProfile && activeTab === 'posts' || !profile.isOwnProfile) && (profilePosts.length > 0 || (profile.posts && profile.posts.length > 0)) ? (
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-4 md:p-6 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
            <div className="grid grid-cols-3 gap-2">
            {(profilePosts.length > 0 ? profilePosts : profile.posts || []).map((post: any) => (
              <div
                key={post.id}
                className="aspect-square relative cursor-pointer group overflow-hidden rounded-xl transition-all duration-300 hover:ring-2 hover:ring-[#ff7b00] hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-gray-950"
                onClick={() => setSelectedPostId(post.id)}
              >
                {post.media && post.media.length > 0 ? (
                  <>
                    {post.media[0].type === 'video' ? (
                      <video
                        src={post.media[0].url}
                        className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                        muted
                      />
                    ) : (
                      <img
                        src={post.media[0].url}
                        alt={post.caption || 'Post'}
                        className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    {/* 🏷️ Post ikon rozeti */}
                    <div className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-sm text-white p-1.5 shadow-lg z-10">
                      <ImageIcon size={14} strokeWidth={2.5} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-end justify-center pb-2">
                      <div className="flex items-center space-x-3 text-white text-xs mb-2">
                        <span className="font-semibold flex items-center gap-1">❤️ {post._count?.likes || post.likeCount || 0}</span>
                        <span className="font-semibold flex items-center gap-1">💬 {post._count?.comments || post.commentCount || 0}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <ImageIcon size={32} />
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-12 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors text-center">
            <p className="text-gray-500 dark:text-gray-400">Henüz gönderi yok</p>
          </div>
        )}
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
                    className="p-4 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => {
                      setShowFollowers(false)
                      router.push(`/profile/${follower.username}`)
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                      {follower.avatar ? (
                        <img
                          src={follower.avatar}
                          alt={follower.username}
                          className="w-full h-full object-cover"
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
                    className="p-4 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => {
                      setShowFollowing(false)
                      router.push(`/profile/${follow.username}`)
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                      {follow.avatar ? (
                        <img
                          src={follow.avatar}
                          alt={follow.username}
                          className="w-full h-full object-cover"
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
              onClose={() => setShowCreateModal(false)}
              username={username}
            />
          )}

          {/* Post Detail Modal */}
          {selectedPostId && (
            <PostModal
              postId={selectedPostId}
              onClose={() => setSelectedPostId(null)}
            />
          )}
        </>
      )
    }

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  )
}

