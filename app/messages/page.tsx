'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, useParams, useRouter, usePathname } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { initChatSocket } from '@/lib/socket'
import { useAuthStore } from '@/lib/store'
import { ProRoleBadge } from '@/components/ProRoleBadge'
import { Send, Search, Image as ImageIcon, X, Edit, Trash2, MoreVertical, Paperclip, Download, FileText } from 'lucide-react'
import { NewMessageModal } from '@/components/new-message-modal'
import { Avatar } from '@/components/ui/Avatar'
import toast from 'react-hot-toast'

// Feellink Message Empty State Icon
const FeellinkMessageEmptyIcon = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="mx-auto">
    <defs>
      <linearGradient id="flGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FF8A00" />
        <stop offset="100%" stopColor="#4DA3FF" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <rect
      x="12"
      y="14"
      width="48"
      height="34"
      rx="10"
      stroke="url(#flGradient)"
      strokeWidth="2"
      filter="url(#glow)"
      className="dark:opacity-90"
    />

    <circle cx="26" cy="31" r="3" fill="#FF8A00" className="dark:opacity-90" />
    <circle cx="36" cy="31" r="3" fill="#4DA3FF" className="dark:opacity-90" />
    <circle cx="46" cy="31" r="3" fill="#FF8A00" className="dark:opacity-90" />
  </svg>
)

const formatTimeAgo = (date: string | Date) => {
  const now = new Date()
  const messageDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000)

  if (diffInSeconds < 60) return 'şimdi'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dk önce`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} sa önce`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`
  
  return messageDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

const formatLastSeen = (date: string | Date | null | undefined) => {
  if (!date) return 'Son görülme bilgisi yok'
  const now = new Date()
  const lastSeenDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - lastSeenDate.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Az önce görüldü'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce görüldü`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce görüldü`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce görüldü`
  
  return lastSeenDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

interface Message {
  id: string
  content?: string | null
  imageUrl?: string | null
  fileUrl?: string | null
  fileName?: string | null
  fileType?: string | null
  senderId: string
  conversationId: string
  read: boolean
  isEdited?: boolean
  isDeleted?: boolean
  isRequest?: boolean
  createdAt: string
  pending?: boolean // Geçici mesaj flag'i
  sender: {
    id: string
    username: string
    avatar?: string
  }
}

interface Conversation {
  id: string
  createdAt: string
  updatedAt: string
  lastMessage?: string | null // Son mesaj içeriği (sol panel için)
  context?: 'DIRECT' | 'JOB_APPLICATION' // "DIRECT" | "JOB_APPLICATION" - mesaj bağlamı (LinkedIn/Upwork mantığı)
  jobId?: string | null // İlan üzerinden mesaj ise ilan ID'si
  applicationId?: string | null // ✅ Başvuruya bağlı sohbet ise başvuru ID'si
  participants: Array<{
    id: string
    userId: string
    user: {
      id: string
      username: string
      avatar?: string
      fullName?: string
    }
  }>
  messages?: Message[]
  unreadCount?: number
}

export default function MessagesPage() {
  const { user, accessToken } = useAuthStore()
  const searchParams = useSearchParams()
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const pathname = usePathname()
  
  // 🔥 KRİTİK: URL'den conversationId al (Instagram mantığı)
  // Önce route param'a bak, yoksa query param'a bak
  const conversationIdFromRoute = params?.conversationId as string | undefined
  const conversationIdFromQuery = searchParams?.get('conversation')
  const conversationId = conversationIdFromRoute || conversationIdFromQuery || null
  
  // ✅ KRİTİK: Silinen conversation'ları sakla (geri gelmesin diye) - useMemo'dan önce tanımlanmalı
  const deletedConversationsRef = useRef<Set<string>>(new Set())
  
  // ✅ KRİTİK: Silinen conversation'ları takip etmek için state (useMemo'yu tetiklemek için)
  const [deletedConversationsVersion, setDeletedConversationsVersion] = useState(0)
  
  // ✅ KRİTİK: Conversations'ı React Query ile yönet (kalıcı cache için)
  const { data: conversationsData, refetch: refetchConversations } = useQuery({
    queryKey: ['conversations', accessToken],
    queryFn: async () => {
      if (!accessToken) return []
      const response = await api.get('/chat/conversations')
      return response.data || []
    },
    enabled: !!accessToken,
    staleTime: Infinity, // ✅ Conversations her zaman fresh kabul edilsin
    gcTime: Infinity, // ✅ Cache hiç temizlenmesin (kalıcılık için - route değişiminde kaybolmasın)
    refetchOnWindowFocus: false,
    refetchOnMount: false, // ✅ Cache'den yükle, her mount'ta refetch yapma (kalıcılık için)
    retry: 3,
    // ✅ KRİTİK: Placeholder data'yı cache'den oku (route değişiminde kaybolmasın)
    placeholderData: () => {
      const cached = queryClient.getQueryData<Conversation[]>(['conversations', accessToken])
      return cached || undefined
    },
  })

  // ✅ KRİTİK: Cache'den gelen conversations'ı state'e yükle (geriye uyumluluk için)
  // Her zaman cache'den oku, route değişiminde kaybolmasın
  // conversationsData undefined olsa bile cache'den oku
  // ✅ KRİTİK: Silinen conversation'ları filtrele
  const conversations = useMemo(() => {
    // Önce conversationsData'dan oku (React Query'den gelen)
    let data = conversationsData
    if (!data || data.length === 0) {
      // Eğer conversationsData yoksa veya boşsa, cache'den oku
      data = queryClient.getQueryData<Conversation[]>(['conversations', accessToken]) || []
    }
    // ✅ KRİTİK: Silinen conversation'ları filtrele
    const filtered = data.filter((c) => !deletedConversationsRef.current.has(c.id))
    console.log('📋 [Frontend] Conversations filtered:', {
      total: data.length,
      deleted: deletedConversationsRef.current.size,
      filtered: filtered.length,
      deletedIds: Array.from(deletedConversationsRef.current)
    })
    return filtered
  }, [conversationsData, accessToken, queryClient, deletedConversationsVersion])
  
  // State setter'ı koru (socket event'leri için)
  const setConversations = (updater: Conversation[] | ((prev: Conversation[]) => Conversation[])) => {
    if (typeof updater === 'function') {
      const current = conversationsData || []
      const updated = updater(current)
      queryClient.setQueryData(['conversations', accessToken], updated)
    } else {
      queryClient.setQueryData(['conversations', accessToken], updater)
    }
  }

  const [messageRequests, setMessageRequests] = useState<Conversation[]>([]) // 🔥 Instagram tarzı mesaj istekleri
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<{ name: string; type: string } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNewMessageModal, setShowNewMessageModal] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({})
  const [userLastSeen, setUserLastSeen] = useState<Record<string, string>>({})
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState<string>('')
  const [showMenuForId, setShowMenuForId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'requests' | 'media' | 'files'>('chat') // 🔥 Instagram tarzı mesaj istekleri sekmesi
  const [media, setMedia] = useState<Array<{ id: string; imageUrl: string; createdAt: string; senderId: string }>>([])
  const [jobApplications, setJobApplications] = useState<Record<string, { listingTitle: string; company?: string }>>({})
  const [jobContext, setJobContext] = useState<{ id: string; title: string } | null>(null) // ✅ Aktif sohbet için ilan bağlamı
  const [files, setFiles] = useState<Array<{ id: string; fileUrl: string; fileName: string | null; fileType: string | null; createdAt: string; senderId: string }>>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showConversationMenu, setShowConversationMenu] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockCheckLoading, setBlockCheckLoading] = useState(false)
  const conversationMenuRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatSocketRef = useRef<any>(null)

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const activeConversationRef = useRef<Conversation | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const isSendingRef = useRef(false) // ✅ Mesaj çift gönderme koruması
  const hasInitializedConversationRef = useRef<string | null>(null) // ✅ Conversation oluşturma tek seferlik koruması (userId saklar)
  const recentConversationsRef = useRef<Set<string>>(new Set()) // ✅ Son eklenen conversation'ları sakla (receiver için)

  // Socket bağlantısı - sadece bir kez kurulmalı
  useEffect(() => {
    if (!accessToken || !user) return

    const socket = initChatSocket(accessToken)
    chatSocketRef.current = socket

    socket.on('connect', () => {
      console.log('✅ [Frontend] Chat socket connected:', socket.id)
      console.log('✅ [Frontend] Current user:', user?.id, user?.username)
      // Aktif kullanıcıları al
      socket.emit('get_active_users')
      // 🔥 KRİTİK: User room'a otomatik join oluyor (backend handleConnection'da)
      // Ama garantilemek için burada da kontrol ediyoruz
      console.log('✅ [Frontend] Socket connected, user room should be: user_' + user?.id)
    })

    socket.on('disconnect', () => {
      console.log('❌ Chat socket disconnected')
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    // Receive message handler - aktif konuşma için
    // ✅ KRİTİK: Bu handler hem sender hem receiver için çalışmalı
    const handleReceiveMessage = (message: Message) => {
      console.log('📨 [Frontend] ✅ RECEIVE_MESSAGE EVENT RECEIVED:', {
        messageId: message.id,
        senderId: message.senderId,
        conversationId: message.conversationId,
        content: message.content?.substring(0, 50),
        activeConversation: activeConversationRef.current?.id,
        conversationIdFromURL: conversationId,
        currentUser: user?.id,
        isFromCurrentUser: message.senderId === user?.id,
      })
      
      // 🔥 KRİTİK: Anlık görünüm için direkt state'e ekle (optimistic update)
      // ✅ KRİTİK: Hem conversationId hem de activeConversationRef'i kontrol et
      const currentConversationId = conversationId || activeConversationRef.current?.id
      
      // ✅ KRİTİK: Mesaj aktif conversation'a aitse state'e ekle
      // Bu, receiver mesaj konsolunda olsa bile mesajı görmesi için kritik
      if (message.conversationId === currentConversationId && currentConversationId) {
        console.log('✅ [Frontend] Message belongs to active conversation, adding to state immediately')
        
        // ANLIK: Mesajı direkt state'e ekle (gecikme yok)
        setMessages((prev) => {
          // Duplicate kontrolü
          if (prev.some((m) => m.id === message.id)) {
            console.log('⚠️ [Frontend] Message already in state, skipping:', message.id)
            return prev
          }
          
          // Temp mesajı gerçek mesajla değiştir (eğer varsa)
          const hasTempMessage = prev.some((m) => m.id.startsWith('temp_'))
          if (hasTempMessage) {
            const filtered = prev.filter((m) => !m.id.startsWith('temp_'))
            const updated = [...filtered, message]
            updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            console.log('✅ [Frontend] Replaced temp message with real message:', message.id)
            return updated
          }
          
          // Yeni mesajı ekle
          const updated = [...prev, message]
          // Tarihe göre sırala
          updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          console.log('✅ [Frontend] Message added to state immediately:', message.id)
          return updated
        })
        
        // Scroll'u anında yap
        setTimeout(() => scrollToBottom(), 0)

        // Cache'i güncelle (mesajı cache'e ekle) - kalıcı olması için
        queryClient.setQueryData(['messages', currentConversationId], (oldData: any) => {
          if (!oldData) return { messages: [message] }
          const existingMessages = oldData.messages || []
          
          // Temp mesajı gerçek mesajla değiştir (eğer varsa)
          const filtered = existingMessages.filter((m: Message) => !m.id.startsWith('temp_'))
          
          // Duplicate kontrolü
          if (filtered.some((m: Message) => m.id === message.id)) {
            return oldData
          }
          
          const updated = [...filtered, message]
          updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          return { messages: updated }
        })
        
        // ✅ KRİTİK: invalidateQueries KALDIRILDI - cache'i temizlemesin, mesajlar kalıcı olsun
        // Backend ile senkronizasyon için sadece cache'i güncelle (yukarıda setQueryData ile yapıldı)

        // Karşı taraftan gelen yeni mesajı otomatik okundu işaretle
        if (message.senderId !== user?.id && !message.read) {
          api.put(`/chat/conversations/${message.conversationId}/read`).catch(console.error)
        }
      } else {
        console.log('📨 [Frontend] Message not in active conversation, but will update conversation list via new_message event')
        // Conversation listesi new_message veya conversation_updated event'i ile güncellenecek
      }
    }

    // New message notification - başka bir konuşmadan
    const handleNewMessage = (data: { conversationId: string; message: Message; conversation?: Conversation }) => {
      console.log('📬 [Frontend] ✅ NEW_MESSAGE EVENT RECEIVED:', {
        messageId: data.message.id,
        senderId: data.message.senderId,
        conversationId: data.conversationId,
        content: data.message.content?.substring(0, 50),
        activeConversation: activeConversationRef.current?.id,
        conversationIdFromURL: conversationId,
        currentUser: user?.id,
        hasConversation: !!data.conversation,
      })
      
      // 🔥 KRİTİK: Conversation bilgisi varsa, conversation listesini güncelle
      if (data.conversation) {
        const conv = data.conversation
        
        // ✅ KRİTİK: Silinen conversation'ları kontrol et - geri gelmesin
        if (deletedConversationsRef.current.has(conv.id)) {
          console.log('⚠️ [Frontend] Conversation was deleted, not adding back:', conv.id)
          return
        }
        
        console.log('✅ [Frontend] Updating conversation list with new conversation data:', conv.id)
        // Recent conversation listesine ekle (receiver için koruma)
        recentConversationsRef.current.add(conv.id)
        setTimeout(() => {
          recentConversationsRef.current.delete(conv.id)
        }, 30000)
        
        // ✅ KRİTİK: React Query cache'i güncelle (kalıcılık için)
        // ✅ DOĞRU MANTIK: Conversation ID bazlı kontrol - varsa güncelle ve en üste taşı, yoksa ekle
        queryClient.setQueryData(['conversations', accessToken], (oldData: Conversation[] | undefined) => {
          if (!oldData) return [conv]
          
          // ✅ KRİTİK: Duplicate kontrolü - aynı ID varsa güncelle ve EN ÜSTE TAŞI
          const exists = oldData.find((c) => c.id === conv.id)
          if (exists) {
            // Mevcut conversation'ı çıkar, güncelle ve EN ÜSTE ekle
            const filtered = oldData.filter((c) => c.id !== conv.id)
            return [
              {
                ...conv,
                lastMessage: conv.lastMessage || exists.lastMessage,
                updatedAt: conv.updatedAt || exists.updatedAt,
              },
              ...filtered,
            ]
          }
          // Yeni conversation'ı EN ÜSTE ekle
          return [conv, ...oldData]
        })
        
        // State'i de güncelle (geriye uyumluluk için)
        // ✅ KRİTİK: Duplicate kontrolü - aynı ID varsa güncelle ve EN ÜSTE TAŞI
        setConversations((prev) => {
          const exists = prev.find((c) => c.id === conv.id)
          if (exists) {
            // Mevcut conversation'ı çıkar, güncelle ve EN ÜSTE ekle
            const filtered = prev.filter((c) => c.id !== conv.id)
            return [
              {
                ...conv,
                lastMessage: conv.lastMessage || exists.lastMessage,
                updatedAt: conv.updatedAt || exists.updatedAt,
              },
              ...filtered,
            ]
          }
          // Yeni conversation'ı EN ÜSTE ekle
          return [conv, ...prev]
        })
      }
      
      // 🔥 KRİTİK: Anlık görünüm için direkt state'e ekle (optimistic update)
      const currentConversationId = conversationId || activeConversationRef.current?.id
      
      // ✅ KRİTİK: Mesaj aktif conversation'a aitse state'e ekle
      // Ayrıca, karşı taraf mesaj konsolunda değilse bile conversation listesi güncellenmiş olacak
      if (data.conversationId === currentConversationId) {
        console.log('📬 [Frontend] Message belongs to active conversation, adding to state immediately')
        
        // ANLIK: Mesajı direkt state'e ekle (gecikme yok)
        setMessages((prev) => {
          // Duplicate kontrolü
          if (prev.some((m) => m.id === data.message.id)) {
            console.log('⚠️ [Frontend] Message already in state, skipping:', data.message.id)
            return prev
          }
          
          // Temp mesajı gerçek mesajla değiştir (eğer varsa)
          const hasTempMessage = prev.some((m) => m.id.startsWith('temp_'))
          if (hasTempMessage) {
            const filtered = prev.filter((m) => !m.id.startsWith('temp_'))
            const updated = [...filtered, data.message]
            updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            console.log('✅ [Frontend] Replaced temp message with real message:', data.message.id)
            return updated
          }
          
          // Yeni mesajı ekle
          const updated = [...prev, data.message]
          // Tarihe göre sırala
          updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          console.log('✅ [Frontend] Message added to state immediately:', data.message.id)
          return updated
        })
        
        // Scroll'u anında yap
        setTimeout(() => scrollToBottom(), 0)

        // Cache'i güncelle (mesajı cache'e ekle) - kalıcı olması için
        queryClient.setQueryData(['messages', currentConversationId], (oldData: any) => {
          if (!oldData) return { messages: [data.message] }
          const existingMessages = oldData.messages || []
          
          // Temp mesajı gerçek mesajla değiştir (eğer varsa)
          const filtered = existingMessages.filter((m: Message) => !m.id.startsWith('temp_'))
          
          // Duplicate kontrolü
          if (filtered.some((m: Message) => m.id === data.message.id)) {
            return oldData
          }
          
          const updated = [...filtered, data.message]
          updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          return { messages: updated }
        })
        
        // ✅ KRİTİK: invalidateQueries KALDIRILDI - cache'i temizlemesin, mesajlar kalıcı olsun
        // Backend ile senkronizasyon için sadece cache'i güncelle (yukarıda setQueryData ile yapıldı)
        
        // Karşı taraftan gelen yeni mesajı otomatik okundu işaretle
        if (data.message.senderId !== user?.id && !data.message.read) {
          api.put(`/chat/conversations/${data.conversationId}/read`).catch(console.error)
        }
      } else {
        console.log('📬 [Frontend] Message not in active conversation, conversation list already updated')
        // ✅ KRİTİK: Mesaj aktif conversation'a ait değilse bile, eğer conversation objesi varsa listeyi güncelle
        // Bu sayede karşı taraf mesaj konsolunda değilse bile conversation listesinde görür
        if (data.conversation) {
          console.log('📬 [Frontend] Conversation updated in list, user can see it when they open messages')
        }
      }
    }

    // Conversation updated - conversation listesini güncelle
    const handleConversationUpdated = (updatedConversation: Conversation) => {
      console.log('🔄 [Frontend] Conversation updated:', updatedConversation.id)
      // 🔥 KRİTİK: Bu conversation'ı recent listesine ekle (receiver için koruma)
      recentConversationsRef.current.add(updatedConversation.id)
      // 30 saniye sonra listeden çıkar
      setTimeout(() => {
        recentConversationsRef.current.delete(updatedConversation.id)
      }, 30000)
      
      // ✅ KRİTİK: Silinen conversation'ları kontrol et - geri gelmesin
      if (deletedConversationsRef.current.has(updatedConversation.id)) {
        console.log('⚠️ [Frontend] Conversation was deleted, not adding back:', updatedConversation.id)
        return
      }
      
      // ✅ KRİTİK: React Query cache'i güncelle (kalıcılık için)
      // ✅ DOĞRU MANTIK: Conversation ID bazlı kontrol - varsa güncelle ve en üste taşı, yoksa ekle
      queryClient.setQueryData(['conversations', accessToken], (oldData: Conversation[] | undefined) => {
        if (!oldData) return [updatedConversation]
        const exists = oldData.find((c) => c.id === updatedConversation.id)
        if (exists) {
          // Mevcut conversation'ı çıkar, güncelle ve EN ÜSTE ekle
          const filtered = oldData.filter((c) => c.id !== updatedConversation.id)
          return [
            {
              ...updatedConversation,
              lastMessage: updatedConversation.lastMessage || exists.lastMessage,
              updatedAt: updatedConversation.updatedAt || exists.updatedAt,
            },
            ...filtered,
          ]
        }
        // Yeni conversation'ı EN ÜSTE ekle
        return [updatedConversation, ...oldData]
      })
      
      // State'i de güncelle (geriye uyumluluk için)
      // ✅ KRİTİK: Duplicate kontrolü - aynı ID varsa güncelle ve EN ÜSTE TAŞI
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === updatedConversation.id)
        if (exists) {
          // Mevcut conversation'ı çıkar, güncelle ve EN ÜSTE ekle
          const filtered = prev.filter((c) => c.id !== updatedConversation.id)
          return [
            {
              ...updatedConversation,
              lastMessage: updatedConversation.lastMessage || exists.lastMessage,
              updatedAt: updatedConversation.updatedAt || exists.updatedAt,
            },
            ...filtered,
          ]
        }
        // Yeni conversation'ı EN ÜSTE ekle
        return [updatedConversation, ...prev]
      })
    }

    // Typing indicator - eski sistem (uyumluluk için)
    const handleUserTyping = (data: { userId: string; conversationId: string; isTyping: boolean }) => {
      if (data.conversationId === conversationId && data.userId !== user.id) {
        setIsTyping(data.isTyping)
      }
    }

    // Typing start - yeni sistem
    const handleTypingStart = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === conversationId && data.userId !== user.id) {
        setIsTyping(true)
      }
    }

    // Typing stop - yeni sistem
    const handleTypingStop = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === conversationId && data.userId !== user.id) {
        setIsTyping(false)
      }
    }

    // User status update - çevrim içi durumu
    const handleUserStatusUpdate = (data: { userId: string; isOnline: boolean; lastSeen?: string | Date | null }) => {
      console.log('🟢 User status update:', data)
      setOnlineUsers((prev) => ({
        ...prev,
        [data.userId]: data.isOnline,
      }))
      
      if (!data.isOnline && data.lastSeen) {
        const lastSeenString = typeof data.lastSeen === 'string' ? data.lastSeen : data.lastSeen.toISOString()
        setUserLastSeen((prev) => ({
          ...prev,
          [data.userId]: lastSeenString,
        }))
      } else if (data.isOnline) {
        // Çevrim içi olduğunda lastSeen'i temizle
        setUserLastSeen((prev) => {
          const updated = { ...prev }
          delete updated[data.userId]
          return updated
        })
      }
    }

    // Aktif kullanıcı listesi - ilk bağlantıda
    const handleActiveUsersList = (userIds: string[]) => {
      console.log('👥 Active users list:', userIds)
      const onlineMap: Record<string, boolean> = {}
      userIds.forEach((userId) => {
        onlineMap[userId] = true
      })
      setOnlineUsers((prev) => ({
        ...prev,
        ...onlineMap,
      }))
    }

    // Messages read - tüm mesajlar okundu (konuşma açıldığında)
    const handleMessagesRead = (data: { conversationId: string; userId: string; count?: number }) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId !== user.id ? { ...m, read: true } : m))
        )
      }
    }

    // Message read update - tek mesaj okundu
    const handleMessageReadUpdate = (data: { messageId: string; conversationId: string; readBy: string }) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, read: true } : m))
        )
      }
    }

    // Message edited - mesaj düzenlendi
    const handleMessageEdited = (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? message : m))
        )
      }
    }

    // Message deleted - mesaj silindi
    const handleMessageDeleted = (data: { id: string; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.id ? { ...m, isDeleted: true, content: null, imageUrl: null } : m))
        )
      }
    }

    // 🔥 KRİTİK: Mesaj gönderildiğinde state'e ekle (optimistic update)
    const handleMessageSent = (data: { success: boolean; message: Message }) => {
      if (data.success && data.message) {
        console.log('✅ Message sent event received:', data.message)
        // Mesaj zaten state'e eklenmiş olabilir (callback'den), duplicate kontrolü yap
        setMessages((prev) => {
          const exists = prev.find((m) => m.id === data.message.id)
          if (exists) {
            console.log('⚠️ Message already in state, skipping:', data.message.id)
            return prev
          }
          console.log('✅ Adding sent message to state from event:', data.message.id)
          return [...prev, data.message]
        })
        setTimeout(() => scrollToBottom(), 0)
      }
    }

    socket.on('receive_message', handleReceiveMessage)
    socket.on('new_message', handleNewMessage)
    socket.on('conversation_updated', handleConversationUpdated)
    socket.on('user_typing', handleUserTyping)
    socket.on('typing_start', handleTypingStart)
    socket.on('typing_stop', handleTypingStop)
    socket.on('messages_read', handleMessagesRead)
    socket.on('message_read_update', handleMessageReadUpdate)
    socket.on('messageEdited', handleMessageEdited)
    socket.on('messageDeleted', handleMessageDeleted)
    socket.on('user_status_update', handleUserStatusUpdate)
    socket.on('active_users_list', handleActiveUsersList)

    return () => {
      // Typing timeout'unu temizle
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }

      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
      socket.off('receive_message', handleReceiveMessage)
      socket.off('new_message', handleNewMessage)
      socket.off('user_typing', handleUserTyping)
      socket.off('typing_start', handleTypingStart)
      socket.off('typing_stop', handleTypingStop)
      socket.off('messages_read', handleMessagesRead)
      socket.off('message_read_update', handleMessageReadUpdate)
      socket.off('messageEdited', handleMessageEdited)
      socket.off('messageDeleted', handleMessageDeleted)
      socket.off('user_status_update', handleUserStatusUpdate)
      socket.off('active_users_list', handleActiveUsersList)
    }
  }, [accessToken, user])

  // Medya ve dosyaları yükle
  useEffect(() => {
    if (!conversationId) {
      setMedia([])
      setFiles([])
      return
    }

    if (activeTab === 'media') {
      setLoadingMedia(true)
      api
        .get(`/chat/conversations/${conversationId}/media`)
        .then((res) => {
          setMedia(res.data)
        })
        .catch((err) => {
          console.error('Failed to load media:', err)
          setMedia([])
        })
        .finally(() => {
          setLoadingMedia(false)
        })
    } else if (activeTab === 'files') {
      setLoadingFiles(true)
      api
        .get(`/chat/conversations/${conversationId}/files`)
        .then((res) => {
          setFiles(res.data)
        })
        .catch((err) => {
          console.error('Failed to load files:', err)
          setFiles([])
        })
        .finally(() => {
          setLoadingFiles(false)
        })
    }
  }, [activeTab, conversationId])

  // Yeni mesaj geldiğinde medya/dosya listelerini güncelle
  useEffect(() => {
    if (!chatSocketRef.current || !conversationId) return

    const socket = chatSocketRef.current

    // Medya/dosya listelerini güncellemek için receive_message handler
    const handleReceiveMessageForMedia = (message: Message) => {
      if (message.conversationId !== conversationId) return

      // Eğer görsel mesaj ise medya listesine ekle
      if (message.imageUrl && !message.isDeleted) {
        setMedia((prev) => {
          // Zaten varsa ekleme
          if (prev.some((m) => m.id === message.id)) return prev
          return [{ id: message.id, imageUrl: message.imageUrl!, createdAt: message.createdAt, senderId: message.senderId }, ...prev]
        })
      }

      // Eğer dosya mesajı ise dosya listesine ekle
      if (message.fileUrl && !message.isDeleted) {
        setFiles((prev) => {
          // Zaten varsa ekleme
          if (prev.some((f) => f.id === message.id)) return prev
          return [
            {
              id: message.id,
              fileUrl: message.fileUrl!,
              fileName: message.fileName || null,
              fileType: message.fileType || null,
              createdAt: message.createdAt,
              senderId: message.senderId,
            },
            ...prev,
          ]
        })
      }
    }

    socket.on('receive_message', handleReceiveMessageForMedia)

    return () => {
      socket.off('receive_message', handleReceiveMessageForMedia)
    }
  }, [activeConversation])

  // 🔥 INSTAGRAM MANTIĞI: Mesaj isteklerini yükle
  const loadMessageRequests = async () => {
    try {
      const response = await api.get('/chat/message-requests')
      setMessageRequests(response.data || [])
    } catch (error) {
      console.error('Failed to load message requests:', error)
      setMessageRequests([])
    }
  }

  // Konuşmaları yükle (React Query refetch kullan - cache kalıcı olacak)
  const loadConversations = async () => {
    try {
      console.log('📋 [Frontend] Loading conversations...')
      const result = await refetchConversations()
      const loadedConversations = result.data || []
      console.log('📋 [Frontend] Conversations loaded:', loadedConversations.length, loadedConversations)
      
      // 🔥 KRİTİK: Mevcut conversation'ları koru (eğer yeni listede yoksa)
      // Bu, conversation'ın bir saniye görünüp kaybolmasını önler
      // Özellikle receiver için önemli - mesaj geldiğinde conversation listeye ekleniyor
      // ama loadConversations() çağrıldığında kaybolabiliyor
      const currentConversationId = activeConversationRef.current?.id || conversationId
      const currentConversations = conversationsData || []
      
      setConversations((prev) => {
        // Yeni listede olmayan ama mevcut state'te olan conversation'ları bul
        const conversationsToKeep: Conversation[] = []
        
        // 1. Aktif conversation'ı koru (ama silinmişse koruma)
        if (currentConversationId) {
          // ✅ KRİTİK: Silinen conversation'ı koruma
          if (deletedConversationsRef.current.has(currentConversationId)) {
            console.log('⚠️ [Frontend] Active conversation was deleted, not keeping:', currentConversationId)
          } else {
            const existsInNew = loadedConversations.find((c: Conversation) => c.id === currentConversationId)
            if (!existsInNew) {
              const existingConv = prev.find((c) => c.id === currentConversationId)
              if (existingConv) {
                console.log('⚠️ [Frontend] Active conversation not in new list, keeping existing:', currentConversationId)
                conversationsToKeep.push(existingConv)
              }
            }
          }
        }
        
        // 2. Yeni eklenen conversation'ları koru (receiver için önemli)
        // Son eklenen conversation'ları (recentConversationsRef) ve son mesajı olan conversation'ları koru
        // ✅ KRİTİK: Silinen conversation'ları koruma - geri gelmesin
        const now = Date.now()
        prev.forEach((conv) => {
          // ✅ KRİTİK: Silinen conversation'ları koruma
          if (deletedConversationsRef.current.has(conv.id)) {
            console.log('⚠️ [Frontend] Conversation was deleted, not keeping:', conv.id)
            return
          }
          
          const existsInNew = loadedConversations.find((c: Conversation) => c.id === conv.id)
          if (!existsInNew) {
            // Recent conversation listesinde varsa koru
            if (recentConversationsRef.current.has(conv.id)) {
              console.log('⚠️ [Frontend] Recent conversation (from event) not in new list, keeping:', conv.id)
              conversationsToKeep.push(conv)
            } else {
              // Conversation'ın son mesajına bak
              const lastMessage = conv.messages?.[0]
              if (lastMessage) {
                const messageTime = new Date(lastMessage.createdAt).getTime()
                const timeDiff = now - messageTime
                // Son 30 saniye içinde mesaj varsa koru
                if (timeDiff < 30000) {
                  console.log('⚠️ [Frontend] Recent conversation (with message) not in new list, keeping:', conv.id)
                  conversationsToKeep.push(conv)
                }
              }
            }
          }
        })
        
        // ✅ KRİTİK: Silinen conversation'ları filtrele - geri gelmesin
        const filteredLoaded = loadedConversations.filter((c: Conversation) => {
          const isDeleted = deletedConversationsRef.current.has(c.id)
          if (isDeleted) {
            console.log('⚠️ [Frontend] Filtered out deleted conversation from backend list:', c.id)
          }
          return !isDeleted
        })
        const filteredKept = conversationsToKeep.filter((c) => {
          const isDeleted = deletedConversationsRef.current.has(c.id)
          if (isDeleted) {
            console.log('⚠️ [Frontend] Filtered out deleted conversation from kept list:', c.id)
          }
          return !isDeleted
        })
        
        // Yeni listede olan conversation'lar + korunan conversation'lar (silinenler hariç)
        const merged = [...filteredLoaded, ...filteredKept]
        
        // Duplicate'leri kaldır
        const unique = merged.filter((conv, index, self) => 
          index === self.findIndex((c) => c.id === conv.id)
        )
        
        // updatedAt'e göre sırala (en yeni en üstte)
        unique.sort((a, b) => {
          const aTime = new Date(a.updatedAt).getTime()
          const bTime = new Date(b.updatedAt).getTime()
          return bTime - aTime
        })
        
        // ✅ KRİTİK: React Query cache'i güncelle (silinen conversation'lar filtrelenmiş olarak)
        queryClient.setQueryData(['conversations', accessToken], unique)
        
        // Online status'leri güncelle
        unique.forEach((conv: Conversation) => {
          const otherUser = getOtherParticipant(conv)
          if (otherUser?.user?.id) {
            if ('isOnline' in otherUser.user && otherUser.user.isOnline !== undefined) {
              const isOnline = Boolean(otherUser.user.isOnline)
              setOnlineUsers((prevOnline) => ({
                ...prevOnline,
                [otherUser.user.id]: isOnline,
              }))
            }
            if ('lastSeen' in otherUser.user && otherUser.user.lastSeen) {
              const lastSeenValue = otherUser.user.lastSeen
              const lastSeenString = typeof lastSeenValue === 'string' ? lastSeenValue : (lastSeenValue instanceof Date ? lastSeenValue.toISOString() : String(lastSeenValue))
              setUserLastSeen((prevLastSeen) => ({
                ...prevLastSeen,
                [otherUser.user.id]: lastSeenString,
              }))
            }
          }
        })
        
        return unique
      })
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  // ACCEPTED başvuruları yükle (ilan üzerinden etiketi için)
  useEffect(() => {
    if (!accessToken || !user?.id) return

    async function loadAcceptedApplications() {
      try {
        const response = await api.get('/jobs/me/applications')
        const applications = response.data || []
        const acceptedMap: Record<string, { listingTitle: string; company?: string }> = {}
        
        applications.forEach((app: any) => {
          if (app.status === 'ACCEPTED' && app.jobListing?.createdBy?.id) {
            // İlan sahibinin ID'si ile eşleştir
            acceptedMap[app.jobListing.createdBy.id] = {
              listingTitle: app.jobListing.title,
              company: app.jobListing.company,
            }
          }
        })
        
        setJobApplications(acceptedMap)
      } catch (error) {
        console.error('Failed to load accepted applications:', error)
      }
    }

    loadAcceptedApplications()
  }, [accessToken, user?.id])

  // ✅ KRİTİK: Route değişimini dinle - React Query cache'den yükle
  // Sidebar'dan başka sayfaya gidip Mesajlar'a geri dönünce conversations cache'den yüklenecek
  // gcTime: Infinity olduğu için cache kalıcı, refetchOnMount: false olduğu için cache'den yükler
  useEffect(() => {
    if (pathname === '/messages' && accessToken) {
      console.log('🔄 [Frontend] Messages route detected, loading conversations from cache...')
      
      // ✅ KRİTİK: Cache'den conversations'ı oku ve garantile
      const cachedConversations = queryClient.getQueryData<Conversation[]>(['conversations', accessToken])
      if (cachedConversations && cachedConversations.length > 0) {
        console.log('✅ [Frontend] Conversations loaded from cache:', cachedConversations.length)
        // Cache'den okunan conversations zaten conversationsData'ya yansıyacak (React Query otomatik)
      } else {
        console.log('⚠️ [Frontend] No cached conversations found, will fetch from backend...')
        // Cache yoksa fetch yap (React Query otomatik yapacak - enabled: !!accessToken)
        refetchConversations()
      }
      
      loadMessageRequests()
    }
  }, [pathname, accessToken, queryClient, refetchConversations])

  useEffect(() => {
    if (accessToken) {
      loadConversations()
      loadMessageRequests() // 🔥 Instagram tarzı mesaj isteklerini de yükle
      
      // 🔥 KRİTİK: Sayfa yenilendiğinde URL'de conversationId varsa, direkt backend'den çek
      // Bu, conversation'lar yüklenmeden önce conversation'ın görünmesini sağlar
      if (conversationId) {
        const fetchConversationOnLoad = async () => {
          try {
            const response = await api.get(`/chat/conversations/${conversationId}`)
            const fetchedConversation = response.data
            console.log('✅ [Frontend] Fetched conversation on page load:', fetchedConversation.id)
            
            // Conversation'ı listeye ekle (eğer yoksa)
            setConversations((prev) => {
              const exists = prev.find((c) => c.id === fetchedConversation.id)
              if (exists) {
                // Mevcut conversation'ı güncelle
                return prev.map((c) => c.id === fetchedConversation.id ? fetchedConversation : c)
              }
              // Yeni conversation'ı ekle
              return [fetchedConversation, ...prev]
            })
            
            // Conversation'ı aç
            setActiveConversation(fetchedConversation)
            activeConversationRef.current = fetchedConversation
          } catch (error: any) {
            console.error('❌ [Frontend] Failed to fetch conversation on load:', error)
            // Hata durumunda sessizce devam et, loadConversations zaten çalışacak
          }
        }
        
        // Kısa bir gecikme ile çalıştır (loadConversations ile çakışmaması için)
        setTimeout(() => {
          fetchConversationOnLoad()
        }, 100)
      }
    }
  }, [accessToken, conversationId])

  // ✅ İlan bağlamını çek (sadece jobId query parametresi varsa)
  useEffect(() => {
    const jobId = searchParams?.get('jobId')
    if (!jobId) {
      setJobContext(null)
      return
    }

    // İlan bilgisini çek
    const fetchJobContext = async () => {
      try {
        const response = await api.get(`/jobs/public`)
        const jobs = response.data || []
        const job = jobs.find((j: any) => j.id === jobId)
        
        if (job) {
          setJobContext({
            id: job.id,
            title: job.title,
          })
        }
      } catch (error) {
        console.error('Failed to fetch job context:', error)
        setJobContext(null)
      }
    }

    fetchJobContext()
  }, [searchParams?.get('jobId'), accessToken])

  // URL'den gelen conversation ID ile otomatik açma
  // 🔥 KRİTİK: URL'deki conversationId'ye göre activeConversation'ı set et
  useEffect(() => {
    if (!conversationId) {
      // URL'de conversationId yoksa activeConversation'ı temizle
      setActiveConversation(null)
      activeConversationRef.current = null
      return
    }

    // Önce conversations listesinde ara
    const conversation = conversations.find((c) => c.id === conversationId)
    if (conversation && activeConversation?.id !== conversationId) {
      console.log('✅ [Frontend] Found conversation in list, opening:', conversationId)
      setActiveConversation(conversation)
      activeConversationRef.current = conversation
      return
    }

    // Mesaj isteklerinde de ara
    if (messageRequests.length > 0) {
      const requestConversation = messageRequests.find((c) => c.id === conversationId)
      if (requestConversation) {
        console.log('✅ [Frontend] Found conversation in requests, opening:', conversationId)
        setActiveConversation(requestConversation)
        activeConversationRef.current = requestConversation
        return
      }
    }

    // 🔥 KRİTİK: Conversation listesinde yoksa, backend'den direkt çek
    // Bu, sayfa yenilendiğinde conversation'ın kaybolmaması için ZORUNLU
    // ⚠️ ÖNEMLİ: conversations.length > 0 kontrolü kaldırıldı, çünkü sayfa yenilendiğinde
    // conversations henüz yüklenmemiş olabilir
    if (!conversation && !loading && conversationId) {
      console.log('⚠️ [Frontend] Conversation not found in list, fetching from backend:', conversationId)
      const fetchConversation = async () => {
        try {
          const response = await api.get(`/chat/conversations/${conversationId}`)
          const fetchedConversation = response.data
          console.log('✅ [Frontend] Fetched conversation from backend:', fetchedConversation.id)
          
          // Conversation'ı listeye ekle (eğer yoksa) - ID bazlı duplicate kontrolü
          setConversations((prev) => {
            const exists = prev.find((c) => c.id === fetchedConversation.id)
            if (exists) {
              // Mevcut conversation'ı çıkar, güncelle ve EN ÜSTE ekle
              const filtered = prev.filter((c) => c.id !== fetchedConversation.id)
              return [
                {
                  ...fetchedConversation,
                  lastMessage: fetchedConversation.lastMessage || exists.lastMessage,
                  updatedAt: fetchedConversation.updatedAt || exists.updatedAt,
                },
                ...filtered,
              ]
            }
            // Yeni conversation'ı EN ÜSTE ekle
            return [fetchedConversation, ...prev]
          })
          
          // Conversation'ı aç
          setActiveConversation(fetchedConversation)
          activeConversationRef.current = fetchedConversation
        } catch (error: any) {
          console.error('❌ [Frontend] Failed to fetch conversation:', error)
          // Hata durumunda conversation bulunamadı, URL'yi temizle
          if (error?.response?.status === 404 || error?.response?.status === 403) {
            router.push('/messages')
          }
        }
      }
      
      fetchConversation()
    }
  }, [conversationId, conversations, messageRequests, loading])

  // URL'den gelen user ID ile otomatik konuşma açma/başlatma
  useEffect(() => {
    const userId = searchParams?.get('user')
    
    // ✅ KRİTİK KORUMA: Bu useEffect sadece bir kez çalışmalı (redirect sonrası)
    // Eğer aynı userId için zaten işlem yapıldıysa tekrar yapma
    if (!userId || hasInitializedConversationRef.current === userId || !user?.id || loading) {
      return
    }

    // ✅ Guard: Bu userId için işlem yapıldığını işaretle
    hasInitializedConversationRef.current = userId

    const initializeConversation = async () => {
      // Önce mevcut konuşmaları kontrol et
      const existingConversation = conversations.find((conv) => {
        const participant = conv.participants?.find((p) => p.userId === userId)
        return participant !== undefined
      })

      if (existingConversation) {
        // Konuşma varsa aç
        openConversation(existingConversation)
        return
      }

      // Konuşma yoksa backend'den get/create iste (backend duplicate kontrolü yapacak)
      try {
        const response = await api.post('/chat/conversations', {
          participantIds: [userId],
          context: 'DIRECT', // ✅ Direct mesaj için context: "DIRECT"
        })
        const conversation = response.data
        
        // Backend duplicate kontrolü yaptığı için, dönen conversation zaten mevcut olabilir
        // ✅ KRİTİK: ID bazlı duplicate kontrolü - varsa güncelle ve en üste taşı, yoksa ekle
        setConversations((prev) => {
          const exists = prev.find((c) => c.id === conversation.id)
          if (exists) {
            // Mevcut conversation'ı çıkar, güncelle ve EN ÜSTE ekle
            const filtered = prev.filter((c) => c.id !== conversation.id)
            return [
              {
                ...conversation,
                lastMessage: conversation.lastMessage || exists.lastMessage,
                updatedAt: conversation.updatedAt || exists.updatedAt,
              },
              ...filtered,
            ]
          }
          // Yeni conversation'ı EN ÜSTE ekle
          return [conversation, ...prev]
        })
        
        // Konuşmayı aç
        openConversation(conversation)
      } catch (error: any) {
        console.error('Failed to start conversation:', error)
        // Hata durumunda sessizce devam et (kullanıcı manuel olarak açabilir)
        hasInitializedConversationRef.current = null // Hata durumunda tekrar denemeye izin ver
      }
    }

    // Konuşmalar yüklendikten sonra işlem yap
    initializeConversation()
  }, [searchParams?.get('user'), user?.id, loading]) // ✅ Sadece userId ve loading değiştiğinde çalış

  // 🔥 KRİTİK: Mesajları React Query ile cache'le (kalıcı olması için)
  const { data: cachedMessagesData, refetch: refetchMessages } = useQuery({
    queryKey: ['messages', activeConversation?.id],
    queryFn: async () => {
      if (!activeConversation?.id) return { messages: [] }
      const response = await api.get(`/chat/conversations/${activeConversation.id}/messages`)
      return { messages: response.data.messages || [] }
    },
    enabled: !!activeConversation?.id,
    staleTime: Infinity, // ✅ Mesajlar her zaman fresh kabul edilsin (7/24)
    gcTime: Infinity, // ✅ Cache hiç temizlenmesin (7/24 - mesajlar kaybolmasın)
    refetchOnWindowFocus: false, // Sayfa focus olduğunda refetch yapma
    refetchOnReconnect: true, // Bağlantı yenilendiğinde refetch yap
    refetchOnMount: true, // Component mount olduğunda refetch yap (kalıcılık için)
    retry: 3, // Hata durumunda 3 kez dene
    retryDelay: 1000, // Her denemede 1 saniye bekle
  })

  // Cache'den gelen mesajları state'e yükle (kalıcılık için)
  useEffect(() => {
    if (cachedMessagesData?.messages && activeConversation?.id) {
      const conversationId = activeConversation.id
      const cachedMessages = cachedMessagesData.messages || []
      
      console.log('📥 [Frontend] Loading messages from cache:', {
        conversationId,
        cachedCount: cachedMessages.length,
        activeConversationId: activeConversation.id,
      })
      
      setMessages((prev) => {
        // Eğer önceki mesajlar farklı bir conversation'a aitse, direkt yeni mesajları kullan
        const prevConversationId = prev.length > 0 ? prev[0]?.conversationId : null
        if (prevConversationId !== conversationId) {
          console.log('📥 [Frontend] Different conversation, replacing all messages from cache')
          return cachedMessages
        }
        
        // Aynı conversation ise, merge yap (socket'ten gelen yeni mesajları koru)
        const merged = [...cachedMessages]
        const loadedIds = new Set(cachedMessages.map((m: Message) => m.id))
        
        // Socket'ten gelen ama henüz API'de olmayan mesajları ekle
        prev.forEach((prevMsg) => {
          if (prevMsg.conversationId === conversationId && !loadedIds.has(prevMsg.id)) {
            // Temp mesajlar hariç (bunlar zaten gerçek mesajla değiştirilecek)
            if (!prevMsg.id.startsWith('temp_')) {
              console.log('📥 [Frontend] Keeping socket message that not yet in API:', prevMsg.id)
              merged.push(prevMsg)
            }
          }
        })
        
        // ID'ye göre sırala ve duplicate'leri kaldır
        const unique = merged.filter((msg, index, self) => 
          index === self.findIndex((m) => m.id === msg.id)
        )
        
        // Tarihe göre sırala
        unique.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        
        console.log('📥 [Frontend] Merged messages from cache:', unique.length)
        return unique
      })
      
      // Scroll'u yap (cache'den yüklendikten sonra)
      setTimeout(() => scrollToBottom(), 100)
    } else if (activeConversation?.id && !cachedMessagesData) {
      // Cache'de mesaj yoksa, backend'den yükle
      console.log('📥 [Frontend] No cached messages, refetching from backend')
      refetchMessages()
    }
  }, [cachedMessagesData, activeConversation?.id, refetchMessages])

  // Aktif konuşma değiştiğinde mesajları yükle ve socket room'una join ol
  useEffect(() => {
    // Ref'i güncelle
    activeConversationRef.current = activeConversation

    // Typing durumunu sıfırla
    setIsTyping(false)

    // Typing timeout'unu temizle
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    if (activeConversation && chatSocketRef.current?.connected) {
      // Mesajları cache'den yükle (React Query otomatik yükler)
      refetchMessages()
      
      // Konuşmaya join ol
      chatSocketRef.current.emit('join_conversation', { 
        conversationId: activeConversation.id 
      }, (response: any) => {
        if (response?.error) {
          console.error('Failed to join conversation:', response.error)
        } else {
          console.log('✅ Joined conversation:', activeConversation.id)
        }
      })
      
      // Mesajları okundu olarak işaretle
      api.put(`/chat/conversations/${activeConversation.id}/read`).catch(console.error)
    }

    return () => {
      // Typing timeout'unu temizle
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }

      if (activeConversation && chatSocketRef.current?.connected) {
        chatSocketRef.current.emit('leave_conversation', {
          conversationId: activeConversation.id,
        })
        console.log('👋 Left conversation:', activeConversation.id)
      }
    }
  }, [activeConversation, refetchMessages])

  // 🔥 DEPRECATED: loadMessages artık React Query tarafından otomatik yönetiliyor
  // Bu fonksiyon sadece geriye dönük uyumluluk için tutuluyor
  const loadMessages = async (conversationId: string) => {
    // React Query cache'i güncelle
    await refetchMessages()
    
    // Mesajlar yüklendiğinde okundu işaretle
    if (cachedMessagesData?.messages && cachedMessagesData.messages.length > 0 && chatSocketRef.current?.connected) {
      // Kendi göndermediğimiz mesajları bul
      const unreadMessages = cachedMessagesData.messages.filter(
        (m: Message) => m.senderId !== user?.id && !m.read
      )

      if (unreadMessages.length > 0) {
        // Tüm okunmamış mesajları backend'de okundu işaretle (REST API)
        try {
          await api.put(`/chat/conversations/${conversationId}/read`)
        } catch (error) {
          console.error('Failed to mark messages as read:', error)
        }

        // Sadece son mesajı socket ile okundu işaretle (Instagram tarzı - sadece son mesajda "Görüldü")
        const lastUnreadMessage = unreadMessages[unreadMessages.length - 1]
        chatSocketRef.current?.emit('mark_message_read', {
          messageId: lastUnreadMessage.id,
          conversationId,
        })
      }
    }
    
    scrollToBottom()
  }

  const openConversation = async (conversation: Conversation) => {
    console.log('📂 [Frontend] Opening conversation:', conversation.id)
    
    // 🔥 KRİTİK: Instagram mantığı - URL'yi güncelle (state değil, URL tek gerçek kaynak)
    router.push(`/messages?conversation=${conversation.id}`)
    
    // State'i de güncelle (UI için)
    setActiveConversation(conversation)
    activeConversationRef.current = conversation
  }

  // ✅ Sohbet silme (soft delete)
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      console.log('🗑️ [Frontend] Deleting conversation:', conversationId)
      
      // ✅ KRİTİK: Önce ref'e ekle (loadConversations çağrılırsa geri gelmesin)
      deletedConversationsRef.current.add(conversationId)
      // ✅ KRİTİK: State'i güncelle (useMemo'yu tetiklemek için)
      setDeletedConversationsVersion((prev) => prev + 1)
      
      // Backend'e silme isteği gönder
      await api.delete(`/chat/conversations/${conversationId}`)
      console.log('✅ [Frontend] Conversation deleted successfully')
      
      // ✅ KRİTİK: React Query cache'den kaldır (hemen güncelle)
      queryClient.setQueryData(['conversations', accessToken], (oldData: Conversation[] | undefined) => {
        if (!oldData) return []
        const filtered = oldData.filter((c) => c.id !== conversationId)
        console.log('🗑️ [Frontend] Removed conversation from cache:', conversationId, 'Remaining:', filtered.length)
        return filtered
      })
      
      // ✅ KRİTİK: State'ten de kaldır (hemen güncelle)
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== conversationId)
        console.log('🗑️ [Frontend] Removed conversation from state:', conversationId, 'Remaining:', filtered.length)
        return filtered
      })
      
      // Eğer silinen sohbet aktif sohbetse, aktif sohbeti temizle
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null)
        activeConversationRef.current = null
        setMessages([])
        // URL'yi temizle
        router.push('/messages')
      }
      
      toast.success('Sohbet başarıyla silindi')
    } catch (error: any) {
      console.error('❌ [Frontend] Failed to delete conversation:', error)
      // Hata durumunda ref'ten kaldır (silme başarısız oldu)
      deletedConversationsRef.current.delete(conversationId)
      const errorMessage = error?.response?.data?.message || error?.message || 'Sohbet silinirken bir hata oluştu'
      toast.error(errorMessage)
    }
  }

  const handleNewMessageSelect = async (conversationId: string) => {
    // Konuşmayı direkt yükle ve aç
    try {
      const response = await api.get(`/chat/conversations/${conversationId}`)
      const conversation = response.data
      openConversation(conversation)
      
      // Konuşmaları yeniden yükle (listeyi güncellemek için)
      loadConversations()
      loadMessageRequests() // 🔥 Mesaj isteklerini de güncelle
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }

  // 🔥 INSTAGRAM MANTIĞI: Mesaj isteğini kabul et
  const handleAcceptMessageRequest = async (conversationId: string) => {
    try {
      await api.put(`/chat/message-requests/${conversationId}/accept`)
      toast.success('Mesaj isteği kabul edildi')
      // Konuşmaları ve istekleri yeniden yükle
      loadConversations()
      loadMessageRequests()
      // İsteği kabul edilen konuşmayı aç
      const conversation = conversations.find((c) => c.id === conversationId) || messageRequests.find((c) => c.id === conversationId)
      if (conversation) {
        openConversation(conversation)
      }
    } catch (error: any) {
      console.error('Failed to accept message request:', error)
      toast.error(error?.response?.data?.message || 'Mesaj isteği kabul edilemedi')
    }
  }

  // 🔥 INSTAGRAM MANTIĞI: Mesaj isteğini reddet
  const handleDeclineMessageRequest = async (conversationId: string) => {
    try {
      await api.put(`/chat/message-requests/${conversationId}/decline`)
      toast.success('Mesaj isteği reddedildi')
      // Mesaj isteklerini yeniden yükle
      loadMessageRequests()
    } catch (error: any) {
      console.error('Failed to decline message request:', error)
      toast.error(error?.response?.data?.message || 'Mesaj isteği reddedilemedi')
    }
  }

  // Input değişikliği ve typing handler - tek fonksiyon
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMessageText(value)

    if (!activeConversation || !chatSocketRef.current?.connected) return

    // typing_start gönder
    chatSocketRef.current.emit('typing_start', {
      conversationId: activeConversation.id,
    })

    // Önceki timeout'u temizle
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // 2 saniye sonra typing_stop gönder
    typingTimeoutRef.current = setTimeout(() => {
      if (chatSocketRef.current?.connected) {
        chatSocketRef.current.emit('typing_stop', {
          conversationId: activeConversation.id,
        })
      }
    }, 2000)
  }

  // Görsel seçme
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Dosya boyutu kontrolü (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Görsel boyutu 5MB\'dan küçük olmalıdır')
        return
      }

      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Görseli kaldır
  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Dosya seçme
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Dosya boyutu kontrolü (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('Dosya boyutu 50MB\'dan küçük olmalıdır')
        return
      }

      setSelectedFile(file)
      setFilePreview({
        name: file.name,
        type: file.type || 'application/octet-stream',
      })
    }
  }

  // Dosyayı kaldır
  const removeFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
  }

  // Mesaj gönderme - görsel, dosya ve/veya metin
  const sendMessage = async () => {
    // ✅ ÇİFT GÖNDERME KORUMASI: Eğer mesaj gönderiliyorsa tekrar gönderme
    if (isSendingRef.current) {
      console.log('⚠️ [Frontend] Mesaj zaten gönderiliyor, çift gönderme engellendi')
      return
    }

    // Validasyon
    if (!messageText.trim() && !selectedImage && !selectedFile) {
      console.log('⚠️ [Frontend] Mesaj içeriği boş')
      return
    }

    if (!activeConversation) {
      console.error('❌ [Frontend] Aktif konuşma yok')
      alert('Lütfen önce bir konuşma seçin')
      return
    }

    if (!chatSocketRef.current?.connected) {
      console.error('❌ [Frontend] Socket bağlantısı yok')
      alert('Bağlantı hatası. Lütfen sayfayı yenileyin.')
      return
    }

    console.log('📤 [Frontend] Mesaj gönderiliyor:', {
      conversationId: activeConversation.id,
      hasContent: !!messageText.trim(),
      hasImage: !!selectedImage,
      hasFile: !!selectedFile,
    })

    // Kilit açıldı
    isSendingRef.current = true

    let imageUrl: string | null = null
    let fileUrl: string | null = null
    let fileName: string | null = null
    let fileType: string | null = null

    // Eğer görsel seçildiyse önce yükle
    if (selectedImage) {
      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', selectedImage)

        const uploadResponse = await api.post('/media/upload?type=image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        imageUrl = uploadResponse.data.url || uploadResponse.data.imageUrl || uploadResponse.data.path
        console.log('📸 Image uploaded:', imageUrl)
      } catch (error) {
        console.error('Failed to upload image:', error)
        alert('Görsel yüklenirken bir hata oluştu')
        setIsUploading(false)
        return
      } finally {
        setIsUploading(false)
      }
    }

    // Eğer dosya seçildiyse önce yükle
    if (selectedFile) {
      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', selectedFile)

        const uploadResponse = await api.post('/media/upload?type=file', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        fileUrl = uploadResponse.data.url
        fileName = uploadResponse.data.fileName || selectedFile.name
        fileType = uploadResponse.data.fileType || selectedFile.type || 'application/octet-stream'
        console.log('📎 File uploaded:', fileUrl)
      } catch (error) {
        console.error('Failed to upload file:', error)
        alert('Dosya yüklenirken bir hata oluştu')
        setIsUploading(false)
        return
      } finally {
        setIsUploading(false)
      }
    }

    const content = messageText.trim() || null
    setMessageText('')
    setSelectedImage(null)
    setImagePreview(null)
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // Typing timeout'unu temizle
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    // 🔥 KRİTİK: URL'den conversationId al (Instagram mantığı)
    if (!conversationId) {
      console.error('No conversation selected')
      isSendingRef.current = false
      return
    }

    // Typing durumunu durdur
    chatSocketRef.current.emit('typing_stop', {
      conversationId: conversationId,
    })

    if (!user) {
      console.error('User not found')
      isSendingRef.current = false
      return
    }

    // Instagram gibi: Mesajı hemen state'e ekle (optimistic update)
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      conversationId: conversationId,
      senderId: user.id,
      content: content || null,
      imageUrl: imageUrl || null,
      fileUrl: fileUrl || null,
      fileName: fileName || undefined,
      fileType: fileType || undefined,
      isRequest: false,
      read: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      sender: {
        id: user.id,
        username: user.username || '',
        avatar: user.avatar || undefined,
      },
    }

    // 🔥 KRİTİK: Optimistic update - mesajı hemen göster (anlık görünüm için)
    setMessages((prev) => {
      // Duplicate kontrolü
      if (prev.some((m) => m.id === tempMessage.id)) {
        return prev
      }
      const updated = [...prev, tempMessage]
      updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      return updated
    })
    
    // Cache'e de ekle (temp message olarak)
    queryClient.setQueryData(['messages', conversationId], (oldData: any) => {
      if (!oldData) return { messages: [tempMessage] }
      const existingMessages = oldData.messages || []
      if (existingMessages.some((m: Message) => m.id === tempMessage.id)) {
        return oldData
      }
      const updated = [...existingMessages, tempMessage]
      updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      return { messages: updated }
    })
    
    // Scroll'u anında yap
    setTimeout(() => scrollToBottom(), 0)
    
    // Socket ile mesaj gönder
    try {
      console.log('📤 [Frontend] Socket emit send_message:', {
        conversationId: conversationId,
        content: content ? content.substring(0, 50) + '...' : null,
        imageUrl: imageUrl ? 'exists' : null,
        fileUrl: fileUrl ? 'exists' : null,
      })

      // Timeout ekle - eğer 10 saniye içinde response gelmezse hata göster
      const timeoutId = setTimeout(() => {
        if (isSendingRef.current) {
          console.error('❌ [Frontend] Mesaj gönderme timeout - response gelmedi')
          isSendingRef.current = false
          alert('Mesaj gönderilirken zaman aşımı oluştu. Lütfen tekrar deneyin.')
        }
      }, 10000)

      chatSocketRef.current.emit('send_message', {
        conversationId: activeConversation.id,
        content: content || undefined,
        imageUrl: imageUrl || undefined,
        fileUrl: fileUrl || undefined,
        fileName: fileName || undefined,
        fileType: fileType || undefined,
      }, (response: any) => {
        clearTimeout(timeoutId) // Timeout'u iptal et
        console.log('📥 [Frontend] Socket response:', response)
        isSendingRef.current = false
        
        if (response?.error) {
          console.error('❌ [Frontend] Failed to send message:', response.error)
          setMessageText(content || '')
          if (imageUrl) setSelectedImage(selectedImage)
          if (fileUrl) setSelectedFile(selectedFile)
          alert('Mesaj gönderilirken bir hata oluştu: ' + response.error)
        } else if (response?.success) {
          console.log('✅ [Frontend] Message sent successfully')
          
          // ✅ KRİTİK: Response'dan gelen mesajı cache'e ekle (kalıcı olması için)
          if (response?.message) {
            const sentMessage = response.message
            console.log('✅ [Frontend] Adding sent message to cache:', sentMessage.id)
            
            // Temp mesajı gerçek mesajla değiştir (cache'de)
            queryClient.setQueryData(['messages', activeConversation.id], (oldData: any) => {
              if (!oldData) return { messages: [sentMessage] }
              const existingMessages = oldData.messages || []
              
              // Temp mesajı gerçek mesajla değiştir
              const filtered = existingMessages.filter((m: Message) => !m.id.startsWith('temp_'))
              
              // Duplicate kontrolü
              if (filtered.some((m: Message) => m.id === sentMessage.id)) {
                return oldData
              }
              
              const updated = [...filtered, sentMessage]
              updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              return { messages: updated }
            })
            
            // State'te de temp mesajı gerçek mesajla değiştir
            setMessages((prev) => {
              const filtered = prev.filter((m) => !m.id.startsWith('temp_'))
              if (filtered.some((m) => m.id === sentMessage.id)) {
                return filtered
              }
              const updated = [...filtered, sentMessage]
              updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              return updated
            })
          }
          
          // Response'dan gelen conversation'ı listeye ekle (sadece conversation listesi için)
          if (response?.conversation) {
            console.log('✅ [Frontend] Updating conversation list from response:', response.conversation.id)
            setConversations((prev) => {
              const exists = prev.find((c) => c.id === response.conversation.id)
              if (exists) {
                return prev.map((c) => c.id === response.conversation.id ? response.conversation : c)
              }
              return [response.conversation, ...prev]
            })
          }

          // ✅ KRİTİK: invalidateQueries KALDIRILDI - cache'i temizlemesin, mesajlar kalıcı olsun
          // Mesaj zaten yukarıda cache'e eklendi
          // Conversation listesi de socket event'i ile güncellenecek
          
          setTimeout(() => scrollToBottom(), 100)
        } else {
          console.warn('⚠️ [Frontend] Unexpected response:', response)
          alert('Mesaj gönderildi ancak beklenmeyen bir yanıt alındı. Lütfen sayfayı yenileyin.')
        }
      })
    } catch (error) {
      console.error('❌ Error sending message:', error)
      setMessageText(content || '')
      if (imageUrl) setSelectedImage(selectedImage)
      if (fileUrl) setSelectedFile(selectedFile)
      alert('Mesaj gönderilirken bir hata oluştu')
      isSendingRef.current = false
    }
  }


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Mesaj düzenleme
  const handleEditMessage = async (messageId: string, oldContent: string | null) => {
    const newContent = prompt('Yeni mesaj:', oldContent || '')
    if (newContent && newContent.trim() !== oldContent?.trim()) {
      try {
        await api.put(`/chat/messages/${messageId}/edit`, {
          content: newContent.trim(),
        })
        setEditingMessageId(null)
        setShowMenuForId(null)
      } catch (error) {
        console.error('Failed to edit message:', error)
        alert('Mesaj düzenlenirken bir hata oluştu')
      }
    }
  }

  // Mesaj silme
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) {
      return
    }

    try {
      await api.delete(`/chat/messages/${messageId}`)
      setShowMenuForId(null)
    } catch (error) {
      console.error('Failed to delete message:', error)
      alert('Mesaj silinirken bir hata oluştu')
    }
  }

  // Menü dışına tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      
      // Mesaj menüsü için
      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowMenuForId(null)
      }
      
      // Conversation menüsü için
      if (conversationMenuRef.current) {
        const isClickInsideMenu = conversationMenuRef.current.contains(target)
        const isClickOnMenuButton = (target as HTMLElement)?.closest('button[title="Daha fazla"]')
        
        // Eğer menü dışına tıklandıysa VE modal açık değilse menüyü kapat
        if (!isClickInsideMenu && !isClickOnMenuButton && !showReportModal && !showBlockModal) {
          setShowConversationMenu(false)
        }
      }
    }

    // setTimeout ile geciktir (buton tıklamalarının önce çalışması için)
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showReportModal, showBlockModal])

  const getOtherParticipant = (conversation: Conversation) => {
    if (!conversation.participants || conversation.participants.length === 0) {
      console.warn('⚠️ [Frontend] Conversation has no participants:', conversation.id)
      return null
    }
    const participant = conversation.participants.find((p) => p.userId !== user?.id)
    if (!participant) {
      console.warn('⚠️ [Frontend] Other participant not found in conversation:', conversation.id, 'participants:', conversation.participants)
      return null
    }
    if (!participant.user) {
      console.warn('⚠️ [Frontend] Participant user data missing:', participant.userId, 'participant:', participant)
      return null
    }
    return { ...participant, user: participant.user }
  }

  // Block kontrolü
  const checkBlockStatus = async (otherUserId: string) => {
    if (!otherUserId) return
    setBlockCheckLoading(true)
    try {
      const response = await api.get(`/blocks/check/${otherUserId}`)
      setIsBlocked(response.data?.isBlocked || false)
    } catch (error: any) {
      console.error('Failed to check block status:', error)
      // Hata durumunda engellenmemiş olarak işaretle (kullanıcı deneyimini bozmamak için)
      setIsBlocked(false)
    } finally {
      setBlockCheckLoading(false)
    }
  }

  // Aktif konuşma değiştiğinde block durumunu kontrol et
  useEffect(() => {
    if (activeConversation) {
      const otherUser = getOtherParticipant(activeConversation)
      if (otherUser?.user?.id) {
        checkBlockStatus(otherUser.user.id)
      }
    }
  }, [activeConversation?.id])

  const getLastMessage = (conversation: Conversation) => {
    if (conversation.messages && conversation.messages.length > 0) {
      return conversation.messages[0]
    }
    return null
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true
    const otherUser = getOtherParticipant(conv)
    const searchLower = searchQuery.toLowerCase()
    return (
      otherUser?.user?.username?.toLowerCase().includes(searchLower) ||
      otherUser?.user?.fullName?.toLowerCase().includes(searchLower)
    )
  })

  // 🔥 DEBUG: Conversation listesi kontrolü
  console.log('📋 [Frontend] Conversations state:', conversations.length, conversations)
  console.log('📋 [Frontend] Filtered conversations:', filteredConversations.length, filteredConversations)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Sol Panel - Konuşma Listesi */}
      <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Başlık ve Arama */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mesajlar</h1>
            <button
              onClick={() => setShowNewMessageModal(true)}
              className="text-brand-orange hover:text-[#e26d00] font-semibold text-sm transition-colors"
            >
              + Yeni Mesaj
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange dark:text-white"
            />
          </div>
        </div>

        {/* 🔥 INSTAGRAM MANTIĞI: Tab Butonları (Sohbetler / İstekler) */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
              activeTab === 'chat'
                ? 'text-brand-orange border-b-2 border-brand-orange'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Sohbetler
            {conversations.length > 0 && (
              <span className="ml-2 text-xs text-gray-400">({conversations.length})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors relative ${
              activeTab === 'requests'
                ? 'text-brand-orange border-b-2 border-brand-orange'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            İstekler
            {messageRequests.length > 0 && (
              <span className="ml-2 text-xs text-brand-orange font-bold">({messageRequests.length})</span>
            )}
          </button>
        </div>

        {/* Konuşma Listesi / Mesaj İstekleri */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'chat' ? (
            <>
              {filteredConversations.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4">
                  <p className="text-center">
                    {searchQuery ? 'Sonuç bulunamadı' : 'Henüz mesajınız yok'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => {
              const otherUser = getOtherParticipant(conversation)
              const lastMessage = getLastMessage(conversation)
              // 🔥 KRİTİK: Instagram mantığı - URL'den kontrol et
              const isActive = conversationId === conversation.id

              // 🔥 DEBUG: Conversation ve participant bilgilerini logla
              if (!otherUser?.user) {
                console.warn('⚠️ [Frontend] Conversation has no otherUser:', {
                  conversationId: conversation.id,
                  participants: conversation.participants,
                  currentUserId: user?.id,
                })
                return null
              }

              const isOnline = onlineUsers[otherUser?.user?.id] || false

              return (
                <div
                  key={conversation.id}
                  onClick={() => {
                    // 🔥 KRİTİK: Instagram mantığı - URL'yi güncelle
                    router.push(`/messages?conversation=${conversation.id}`)
                  }}
                  className={`group p-4 cursor-pointer border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    isActive ? 'bg-brand-orange/10 dark:bg-brand-orange/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12">
                      <Avatar
                        src={otherUser?.user?.avatar}
                        alt={otherUser?.user?.username || otherUser?.user?.fullName || 'User'}
                        className="w-12 h-12"
                      />
                      {/* Çevrim içi durumu göstergesi */}
                      {isOnline ? (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-950"></div>
                      ) : null}
                      {/* Okunmamış mesaj sayısı */}
                      {conversation.unreadCount && conversation.unreadCount > 0 ? (
                        <span className="absolute -top-1 -right-1 bg-brand-orange text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                      <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1">
                            {otherUser?.user?.fullName || otherUser?.user?.username || 'Kullanıcı'}
                            <ProRoleBadge roles={(otherUser?.user as any)?.roles} plan={(otherUser?.user as any)?.plan} />
                          </h3>
                          {/* ✅ İş Görüşmesi etiketi (sadece context === "JOB_APPLICATION" ise) */}
                          {conversation.context === 'JOB_APPLICATION' && (
                            <p className="text-xs text-brand-orange dark:text-orange-400 mt-0.5">
                              🧑‍💼 İş Görüşmesi
                              {jobContext && conversation.id === activeConversation?.id && ` • ${jobContext.title}`}
                              {(!jobContext || conversation.id !== activeConversation?.id) && otherUser?.user?.id && jobApplications[otherUser.user.id] && ` • ${jobApplications[otherUser.user.id].listingTitle}`}
                            </p>
                          )}
                        </div>
                        {lastMessage ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                            {formatTimeAgo(lastMessage.createdAt)}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        {lastMessage ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1">
                            {lastMessage.imageUrl ? (
                              <span className="flex items-center gap-1">
                                <ImageIcon size={14} className="text-gray-500" />
                                <span>Fotoğraf</span>
                              </span>
                            ) : lastMessage.fileUrl ? (
                              <span className="flex items-center gap-1">
                                <Paperclip size={14} className="text-gray-500" />
                                <span>{lastMessage.fileName || 'Dosya'}</span>
                              </span>
                            ) : lastMessage.content ? (
                              lastMessage.content
                            ) : (
                              'Mesaj'
                            )}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                            Henüz mesaj yok
                          </p>
                        )}
                        {isOnline ? (
                          <span className="text-xs text-green-500 dark:text-green-400 whitespace-nowrap">
                            Aktif şimdi
                          </span>
                        ) : userLastSeen[otherUser?.user?.id || ''] ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatLastSeen(userLastSeen[otherUser.user.id])}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {/* ✅ Sohbet Silme Menüsü */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation() // Konuşma açılmasını engelle
                        setDeleteConversationId(conversation.id)
                      }}
                      className="ml-2 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
                      title="Sohbeti Sil"
                    >
                      <MoreVertical size={16} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
          </>
          ) : (
            /* 🔥 INSTAGRAM MANTIĞI: Mesaj İstekleri Listesi */
            <>
              {messageRequests.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4">
                  <p className="text-center">Henüz mesaj isteğiniz yok</p>
                </div>
              ) : (
                messageRequests.map((conversation) => {
                  const otherUser = getOtherParticipant(conversation)
                  const lastMessage = getLastMessage(conversation)

                  if (!otherUser?.user) return null

                  return (
                    <div
                      key={conversation.id}
                      className="group p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12">
                          <Avatar
                            src={otherUser?.user?.avatar}
                            alt={otherUser?.user?.username || otherUser?.user?.fullName || 'User'}
                            className="w-12 h-12"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                              {otherUser?.user?.fullName || otherUser?.user?.username || 'Kullanıcı'}
                            </h3>
                          </div>
                          {lastMessage && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {lastMessage.content || (lastMessage.imageUrl ? '📷 Fotoğraf' : lastMessage.fileUrl ? '📎 Dosya' : '')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptMessageRequest(conversation.id)}
                            className="px-4 py-2 bg-brand-orange text-white text-sm font-semibold rounded-lg hover:bg-[#e26d00] transition-colors"
                          >
                            Kabul
                          </button>
                          <button
                            onClick={() => handleDeclineMessageRequest(conversation.id)}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                          >
                            Reddet
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </>
          )}
        </div>
      </div>

      {/* Sağ Panel - Aktif Sohbet */}
      <div className="hidden md:flex flex-1 flex-col">
        {activeConversation ? (
          <>
            {/* Sohbet Başlığı */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              {(() => {
                const otherUser = getOtherParticipant(activeConversation)
                if (!otherUser?.user) return null
                
                // Online durumunu kontrol et - önce state'ten, sonra backend'den gelen veriden
                const userWithExtras = otherUser?.user as typeof otherUser.user & { isOnline?: boolean; lastSeen?: string | Date }
                const isOnline = onlineUsers[otherUser?.user?.id] ?? userWithExtras?.isOnline ?? false
                const lastSeenDate = userLastSeen[otherUser?.user?.id] || userWithExtras?.lastSeen
                
                return (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar
                        src={otherUser?.user?.avatar}
                        alt={otherUser?.user?.username || otherUser?.user?.fullName || 'User'}
                        className="w-10 h-10"
                      />
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-950"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                        {otherUser?.user?.fullName || otherUser?.user?.username || 'Kullanıcı'}
                        <ProRoleBadge roles={(otherUser?.user as any)?.roles} plan={(otherUser?.user as any)?.plan} />
                      </h2>
                      {/* ✅ İlan bağlamı göster (sohbet header'ında) */}
                      {jobContext && (
                        <div className="mt-1 rounded-lg bg-brand-orange/10 dark:bg-brand-orange/20 px-3 py-1 text-xs text-brand-orange dark:text-orange-400">
                          İlan: {jobContext.title}
                        </div>
                      )}
                      {/* Eski jobApplications (kabul edilmiş başvurular için) */}
                      {activeConversation?.context === 'JOB_APPLICATION' && (
                        <p className="text-xs text-brand-orange dark:text-orange-400 mt-1">
                          🧑‍💼 İş Görüşmesi
                          {jobContext && ` • ${jobContext.title}`}
                          {!jobContext && otherUser?.user?.id && jobApplications[otherUser.user.id] && ` • ${jobApplications[otherUser.user.id].listingTitle}`}
                        </p>
                      )}
                      {isTyping ? (
                        <p className="text-xs text-brand-orange">Yazıyor...</p>
                      ) : isOnline ? (
                        <p className="text-xs text-green-500 dark:text-green-400">Aktif şimdi</p>
                      ) : lastSeenDate ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatLastSeen(lastSeenDate)}
                        </p>
                      ) : null}
                    </div>
                    {/* Menü Butonu */}
                    <div className="relative" ref={conversationMenuRef}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const otherUser = getOtherParticipant(activeConversation)
                          if (otherUser?.user?.id) {
                            checkBlockStatus(otherUser.user.id)
                            setShowConversationMenu(!showConversationMenu)
                          }
                        }}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Daha fazla"
                      >
                        <MoreVertical size={20} className="text-gray-600 dark:text-gray-400" />
                      </button>
                      {/* Dropdown Menü */}
                      {showConversationMenu && (
                        <div 
                          ref={conversationMenuRef}
                          className="absolute right-0 top-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[100] min-w-[180px]"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              // Önce modal state'ini set et
                              setShowReportModal(true)
                              // Sonra menüyü kapat
                              setShowConversationMenu(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer"
                          >
                            <span>Şikayet Et</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              // Önce modal state'ini set et
                              setShowBlockModal(true)
                              // Sonra menüyü kapat
                              setShowConversationMenu(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer"
                          >
                            <span>{isBlocked ? 'Engeli Kaldır' : 'Engelle'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (activeConversation?.id) {
                                handleDeleteConversation(activeConversation.id)
                              }
                              setShowConversationMenu(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 size={14} />
                            <span>Sohbeti Sil</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Mesajlar Listesi */}
            {activeTab === 'chat' && (
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl px-6 py-4 bg-white dark:bg-gray-800">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Henüz mesaj yok
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => {
                const isOwn = message.senderId === user?.id
                const isLastMessage = index === messages.length - 1
                const showReadReceipt = isOwn && isLastMessage && message.read
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {!isOwn && (
                        <Avatar
                          src={message.sender.avatar}
                          alt={message.sender.username || 'User'}
                          className="w-8 h-8 flex-shrink-0"
                        />
                      )}
                      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} relative`}>
                        <div
                          className={`px-3 py-2 rounded-2xl max-w-[400px] relative group ${
                            isOwn
                              ? 'bg-brand-orange text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          {/* Silinen mesaj */}
                          {message.isDeleted ? (
                            <p className="text-sm italic text-gray-400 dark:text-gray-500">
                              Bu mesaj silindi
                            </p>
                          ) : (
                            <>
                              {/* Görsel mesaj */}
                              {message.imageUrl && (
                                <div className="mb-2 rounded-xl overflow-hidden">
                                  <img
                                    src={message.imageUrl}
                                    alt="Mesaj görseli"
                                    className="max-w-full max-h-64 object-cover w-full"
                                  />
                                </div>
                              )}
                              {/* Dosya mesaj */}
                              {message.fileUrl && (
                                <a
                                  href={message.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 mt-1 mb-2 rounded-lg px-3 py-2 border transition-colors ${
                                    isOwn
                                      ? 'bg-white/20 border-white/30 hover:bg-white/30'
                                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <div className={`p-1.5 rounded-lg ${
                                    isOwn ? 'bg-white/20' : 'bg-brand-orange/10'
                                  }`}>
                                    <FileText size={16} className={isOwn ? 'text-white' : 'text-brand-orange'} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-medium truncate ${
                                      isOwn ? 'text-white' : 'text-gray-900 dark:text-white'
                                    }`}>
                                      {message.fileName || 'Dosya'}
                                    </p>
                                    <p className={`text-[10px] ${
                                      isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                      {message.fileType ? message.fileType.split('/')[1]?.toUpperCase() || 'DOSYA' : 'DOSYA'}
                                    </p>
                                  </div>
                                  <Download size={14} className={isOwn ? 'text-white/70' : 'text-gray-400'} />
                                </a>
                              )}
                              {/* Metin mesaj */}
                              {message.content && (
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {message.content}
                                  {message.isEdited && (
                                    <span className="ml-1 text-xs opacity-70">
                                      (düzenlendi)
                                    </span>
                                  )}
                                </p>
                              )}
                            </>
                          )}

                          {/* Menü sadece kendi mesajlarında ve silinmemiş mesajlarda */}
                          {isOwn && !message.isDeleted && (
                            <div className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="relative" ref={menuRef}>
                                <button
                                  onClick={() => setShowMenuForId(showMenuForId === message.id ? null : message.id)}
                                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <MoreVertical size={16} className="text-gray-500 dark:text-gray-400" />
                                </button>

                                {/* Menü dropdown */}
                                {showMenuForId === message.id && (
                                  <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                                    <button
                                      onClick={() => handleEditMessage(message.id, message.content || null)}
                                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                    >
                                      <Edit size={14} />
                                      Düzenle
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(message.id)}
                                      className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                    >
                                      <Trash2 size={14} />
                                      Sil
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                          {showReadReceipt ? (
                            <span className={`text-[11px] font-medium ${isOwn ? 'text-gray-300 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                              Görüldü
                            </span>
                          ) : null}
                          <p className={`text-xs ${isOwn ? 'text-gray-300 dark:text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {formatTimeAgo(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
                })
              )}
              {messages.length > 0 && <div ref={messagesEndRef} />}
            </div>
            )}

            {/* Yazıyor... göstergesi */}
            {activeTab === 'chat' && isTyping && (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
                Yazıyor...
              </div>
            )}

            {/* Görsel Önizleme */}
            {imagePreview && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Önizleme"
                    className="max-w-xs max-h-40 rounded-xl object-cover"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    type="button"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Dosya Önizleme */}
            {filePreview && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <div className="relative inline-flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                  <div className="p-1.5 rounded-lg bg-brand-orange/10">
                    <FileText size={18} className="text-brand-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {filePreview.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {filePreview.type.split('/')[1]?.toUpperCase() || 'DOSYA'}
                    </p>
                  </div>
                  <button
                    onClick={removeFile}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    type="button"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Mesaj Input - Sadece chat sekmesinde */}
            {activeTab === 'chat' && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              {isBlocked ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Bu kullanıcıyı engelledin. Mesaj gönderemezsin.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendMessage()
                  }}
                  className="flex gap-2"
                >
                  {/* Görsel Yükleme Butonu */}
                  <label className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <ImageIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      ref={fileInputRef}
                      className="hidden"
                    />
                  </label>
                  {/* Dosya Yükleme Butonu */}
                  <label className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={messageText}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                      // ✅ Enter tuşu form submit'i tetikleyecek, ayrıca sendMessage çağırmaya gerek yok
                      // Form submit zaten sendMessage'ı çağırıyor, çift göndermeyi önlemek için burada çağırmıyoruz
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        // Form submit'i manuel tetikle (sendMessage onSubmit'te zaten çağrılacak)
                        const form = e.currentTarget.closest('form')
                        if (form) {
                          form.requestSubmit()
                        }
                      }
                    }}
                    placeholder="Mesaj yaz..."
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-orange dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={(!messageText.trim() && !selectedImage && !selectedFile) || isUploading}
                    className="bg-brand-orange text-white p-2 rounded-full hover:bg-brand-orange/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>
              )}
            </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="mb-3">
                <FeellinkMessageEmptyIcon />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bir sohbet seçin</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobil görünüm - Sadece aktif sohbet veya liste */}
      <div className="md:hidden flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Mobil başlık */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <button
                onClick={() => router.push('/messages')}
                className="mr-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {(() => {
                const otherUser = getOtherParticipant(activeConversation)
                if (!otherUser?.user) return null
                
                // Online durumunu kontrol et - önce state'ten, sonra backend'den gelen veriden
                const userWithExtras = otherUser?.user as typeof otherUser.user & { isOnline?: boolean; lastSeen?: string | Date }
                const isOnline = onlineUsers[otherUser?.user?.id] ?? userWithExtras?.isOnline ?? false
                const lastSeenDate = userLastSeen[otherUser?.user?.id] || userWithExtras?.lastSeen
                
                return (
                  <>
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => router.push('/messages')}
                        className="text-gray-600 dark:text-gray-400"
                      >
                        ←
                      </button>
                      <div className="relative">
                        <Avatar
                          src={otherUser?.user?.avatar}
                            alt={otherUser?.user?.username || otherUser?.user?.fullName || 'User'}
                            className="w-10 h-10"
                          />
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-950"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                          {otherUser?.user?.fullName || otherUser?.user?.username || 'Kullanıcı'}
                        </h2>
                        {/* ✅ İlan bağlamı göster (mobil header'da) */}
                        {jobContext && (
                          <div className="mt-1 rounded-lg bg-brand-orange/10 dark:bg-brand-orange/20 px-2 py-0.5 text-xs text-brand-orange dark:text-orange-400 truncate">
                            İlan: {jobContext.title}
                          </div>
                        )}
                        {/* Eski jobApplications (kabul edilmiş başvurular için) */}
                        {activeConversation?.context === 'JOB_APPLICATION' && (
                          <p className="text-xs text-brand-orange dark:text-orange-400 mt-0.5 truncate">
                            🧑‍💼 İş Görüşmesi
                            {jobContext && ` • ${jobContext.title}`}
                            {!jobContext && otherUser?.user?.id && jobApplications[otherUser.user.id] && ` • ${jobApplications[otherUser.user.id].listingTitle}`}
                          </p>
                        )}
                        {isTyping ? (
                          <p className="text-xs text-brand-orange">Yazıyor...</p>
                        ) : isOnline ? (
                          <p className="text-xs text-green-500 dark:text-green-400">Aktif şimdi</p>
                        ) : lastSeenDate ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {formatLastSeen(lastSeenDate)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {/* Mobil Menü Butonu */}
                    <div className="relative" ref={conversationMenuRef}>
                      <button
                        onClick={() => {
                          const otherUser = getOtherParticipant(activeConversation)
                          if (otherUser?.user?.id) {
                            checkBlockStatus(otherUser.user.id)
                            setShowConversationMenu(!showConversationMenu)
                          }
                        }}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Daha fazla"
                      >
                        <MoreVertical size={20} className="text-gray-600 dark:text-gray-400" />
                      </button>
                      {/* Dropdown Menü (Mobil) */}
                      {showConversationMenu && (
                        <div 
                          ref={conversationMenuRef}
                          className="absolute right-0 top-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[100] min-w-[180px]"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              // Önce modal state'ini set et
                              setShowReportModal(true)
                              // Sonra menüyü kapat
                              setShowConversationMenu(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer"
                          >
                            <span>Şikayet Et</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              // Önce modal state'ini set et
                              setShowBlockModal(true)
                              // Sonra menüyü kapat
                              setShowConversationMenu(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer"
                          >
                            <span>{isBlocked ? 'Engeli Kaldır' : 'Engelle'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (activeConversation?.id) {
                                handleDeleteConversation(activeConversation.id)
                              }
                              setShowConversationMenu(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 size={14} />
                            <span>Sohbeti Sil</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Tab Bar (Mobil) */}
            <div className="flex items-center justify-around border-b border-gray-200 dark:border-gray-800 text-sm font-medium bg-white dark:bg-[#1a1a1a]">
              <button
                className={`py-3 w-1/3 transition-colors ${
                  activeTab === 'chat'
                    ? 'text-brand-orange border-b-2 border-brand-orange'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('chat')}
              >
                Mesajlar
              </button>
              <button
                className={`py-3 w-1/3 transition-colors ${
                  activeTab === 'media'
                    ? 'text-brand-orange border-b-2 border-brand-orange'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('media')}
              >
                Medya
              </button>
              <button
                className={`py-3 w-1/3 transition-colors ${
                  activeTab === 'files'
                    ? 'text-brand-orange border-b-2 border-brand-orange'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('files')}
              >
                Dosyalar
              </button>
            </div>

            {/* Medya Sekmesi (Mobil) */}
            {activeTab === 'media' && (
              <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4">
                {loadingMedia ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : media.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400 dark:text-gray-500 text-center">
                      Henüz medya yok
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {media.map((m) => (
                      <a
                        key={m.id}
                        href={m.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group overflow-hidden rounded-xl"
                      >
                        <img
                          src={m.imageUrl}
                          alt="Medya"
                          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dosyalar Sekmesi (Mobil) */}
            {activeTab === 'files' && (
              <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4">
                {loadingFiles ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400 dark:text-gray-500 text-center">
                      Henüz dosya yok
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {files.map((f) => (
                      <a
                        key={f.id}
                        href={f.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between border border-gray-200 dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-[#1a1a1a] hover:bg-brand-blue/10 dark:hover:bg-brand-blue/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-brand-orange/10 flex-shrink-0">
                            <FileText className="text-brand-orange" size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                              {f.fileName || 'Dosya'}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {f.fileType ? f.fileType.split('/')[1]?.toUpperCase() || 'DOSYA' : 'DOSYA'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <p className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            {new Date(f.createdAt).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                          <Download size={16} className="text-gray-400 dark:text-gray-500" />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mesajlar (mobil) */}
            {activeTab === 'chat' && (
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl px-6 py-4 bg-white dark:bg-gray-800">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Henüz mesaj yok
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => {
                const isOwn = message.senderId === user?.id
                const isLastMessage = index === messages.length - 1
                const showReadReceipt = isOwn && isLastMessage && message.read
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                      <div className="flex flex-col items-end relative">
                        <div
                          className={`px-3 py-2 rounded-2xl max-w-[80%] relative group ${
                            isOwn
                              ? 'bg-brand-orange text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          {/* Silinen mesaj */}
                          {message.isDeleted ? (
                            <p className="text-sm italic text-gray-400 dark:text-gray-500">
                              Bu mesaj silindi
                            </p>
                          ) : (
                            <>
                              {/* Görsel mesaj */}
                              {message.imageUrl && (
                                <div className="mb-2 rounded-xl overflow-hidden">
                                  <img
                                    src={message.imageUrl}
                                    alt="Mesaj görseli"
                                    className="max-w-full max-h-64 object-cover w-full"
                                  />
                                </div>
                              )}
                              {/* Dosya mesaj (mobil) */}
                              {message.fileUrl && (
                                <a
                                  href={message.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 mt-1 mb-2 rounded-lg px-3 py-2 border transition-colors ${
                                    isOwn
                                      ? 'bg-white/20 border-white/30 hover:bg-white/30'
                                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <div className={`p-1.5 rounded-lg ${
                                    isOwn ? 'bg-white/20' : 'bg-brand-orange/10'
                                  }`}>
                                    <FileText size={16} className={isOwn ? 'text-white' : 'text-brand-orange'} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-medium truncate ${
                                      isOwn ? 'text-white' : 'text-gray-900 dark:text-white'
                                    }`}>
                                      {message.fileName || 'Dosya'}
                                    </p>
                                    <p className={`text-[10px] ${
                                      isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                      {message.fileType ? message.fileType.split('/')[1]?.toUpperCase() || 'DOSYA' : 'DOSYA'}
                                    </p>
                                  </div>
                                  <Download size={14} className={isOwn ? 'text-white/70' : 'text-gray-400'} />
                                </a>
                              )}
                              {/* Metin mesaj */}
                              {message.content && (
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {message.content}
                                  {message.isEdited && (
                                    <span className="ml-1 text-xs opacity-70">
                                      (düzenlendi)
                                    </span>
                                  )}
                                </p>
                              )}
                            </>
                          )}

                          {/* Menü sadece kendi mesajlarında ve silinmemiş mesajlarda (mobil) */}
                          {isOwn && !message.isDeleted && (
                            <div className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="relative" ref={menuRef}>
                                <button
                                  onClick={() => setShowMenuForId(showMenuForId === message.id ? null : message.id)}
                                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <MoreVertical size={16} className="text-gray-500 dark:text-gray-400" />
                                </button>

                                {/* Menü dropdown */}
                                {showMenuForId === message.id && (
                                  <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                                    <button
                                      onClick={() => handleEditMessage(message.id, message.content || null)}
                                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                    >
                                      <Edit size={14} />
                                      Düzenle
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(message.id)}
                                      className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                    >
                                      <Trash2 size={14} />
                                      Sil
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {showReadReceipt && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 mr-1">
                            Görüldü
                          </span>
                        )}
                      </div>
                  </div>
                )
                })
              )}
              {messages.length > 0 && <div ref={messagesEndRef} />}
            </div>
            )}

            {/* Yazıyor... göstergesi (mobil) */}
            {activeTab === 'chat' && isTyping && (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-950">
                Yazıyor...
              </div>
            )}

            {/* Görsel Önizleme (mobil) */}
            {imagePreview && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Önizleme"
                    className="max-w-xs max-h-40 rounded-xl object-cover"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    type="button"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Dosya Önizleme (mobil) */}
            {filePreview && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <div className="relative inline-flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                  <div className="p-1.5 rounded-lg bg-brand-orange/10">
                    <FileText size={18} className="text-brand-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {filePreview.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {filePreview.type.split('/')[1]?.toUpperCase() || 'DOSYA'}
                    </p>
                  </div>
                  <button
                    onClick={removeFile}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    type="button"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Mesaj Input (mobil) - Sadece chat sekmesinde */}
            {activeTab === 'chat' && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              {isBlocked ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Bu kullanıcıyı engelledin. Mesaj gönderemezsin.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendMessage()
                  }}
                  className="flex gap-2"
                >
                  {/* Görsel Yükleme Butonu */}
                  <label className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <ImageIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      ref={fileInputRef}
                      className="hidden"
                    />
                  </label>
                  {/* Dosya Yükleme Butonu */}
                  <label className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={messageText}
                    onChange={handleChange}
                    placeholder="Mesaj yaz..."
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-orange dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={(!messageText.trim() && !selectedImage && !selectedFile) || isUploading}
                    className="bg-brand-orange text-white p-2 rounded-full hover:bg-brand-orange/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>
              )}
            </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="mb-3">
                <FeellinkMessageEmptyIcon />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bir sohbet seçin</p>
            </div>
          </div>
        )}
      </div>

      {/* Yeni Mesaj Modal */}
      {showNewMessageModal && (
        <NewMessageModal
          onClose={() => setShowNewMessageModal(false)}
          onSelect={handleNewMessageSelect}
        />
      )}

      {/* ✅ Sohbet Silme Onay Modalı */}
      {deleteConversationId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70"
          onClick={() => setDeleteConversationId(null)}
        >
          <div 
            className="w-[400px] rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Sohbeti silmek istiyor musunuz?
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Bu işlem geri alınamaz. Sohbet yalnızca sizin için silinecektir.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConversationId(null)}
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                İptal
              </button>

              <button
                onClick={async () => {
                  if (deleteConversationId) {
                    await handleDeleteConversation(deleteConversationId)
                    setDeleteConversationId(null)
                  }
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Sohbeti Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Şikayet Modalı */}
      {showReportModal && activeConversation ? (
        <ReportModal
          conversation={activeConversation}
          onClose={() => {
            setShowReportModal(false)
          }}
        />
      ) : null}

      {/* Engelleme Modalı */}
      {showBlockModal && activeConversation ? (
        <BlockModal
          conversation={activeConversation}
          isBlocked={isBlocked}
          onClose={() => {
            setShowBlockModal(false)
          }}
          onBlockChange={() => {
            const otherUser = getOtherParticipant(activeConversation)
            if (otherUser?.user?.id) {
              checkBlockStatus(otherUser.user.id)
            }
          }}
        />
      ) : null}
    </div>
  )
}

// Şikayet Modalı Component
function ReportModal({ conversation, onClose }: { conversation: Conversation; onClose: () => void }) {
  const { user } = useAuthStore()
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getOtherParticipant = (conv: Conversation) => {
    const participant = conv.participants?.find((p) => p.userId !== user?.id)
    return participant ? { ...participant, user: participant.user } : null
  }

  const otherUser = getOtherParticipant(conversation)
  
  if (!otherUser?.user?.id) {
    return null
  }

  const reasons = [
    { value: 'HARASSMENT', label: 'Taciz / Zorbalık' },
    { value: 'SPAM', label: 'Spam / Dolandırıcılık' },
    { value: 'HATE_SPEECH', label: 'Nefret Söylemi' },
    { value: 'IMPERSONATION', label: 'Taklit / Sahte Hesap' },
    { value: 'INAPPROPRIATE_CONTENT', label: 'Uygunsuz İçerik' },
  ] as const

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReason || !otherUser?.user?.id) {
      toast.error('Lütfen bir şikayet sebebi seçin')
      return
    }

    setIsSubmitting(true)
    try {
      await api.post('/reports', {
        reportedUserId: otherUser.user.id,
        conversationId: conversation.id,
        reason: selectedReason,
        note: note.trim() || undefined,
      })
      toast.success('Şikayetin alındı. İncelenecek.')
      onClose()
    } catch (error: any) {
      console.error('Failed to submit report:', error)
      toast.error(error?.response?.data?.message || 'Şikayet gönderilirken bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-[420px] max-w-[90vw] rounded-2xl bg-gradient-to-b from-[#0f172a] to-[#020617] border border-white/10 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white">
            Kullanıcıyı Şikayet Et
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Bu işlem geri alınamaz. Lütfen doğru nedeni seç.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="space-y-2 mt-4">
              {reasons.map((reason) => (
                <label
                  key={reason.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedReason === reason.value
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-white/10 hover:border-white/20 bg-white/5'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="hidden"
                  />
                  <span 
                    className={`w-2 h-2 rounded-full transition-all ${
                      selectedReason === reason.value
                        ? 'bg-orange-500 opacity-100'
                        : 'bg-white/20 opacity-50'
                    }`}
                  />
                  <span className="text-sm text-white flex-1">{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 300))}
              placeholder="İstersen kısaca açıklayabilirsin (opsiyonel)"
              className="mt-4 w-full rounded-lg bg-black/30 border border-white/10 focus:border-orange-500 focus:ring-0 text-sm text-white placeholder-gray-500 p-3 resize-none transition-colors"
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {note.length}/300
            </p>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={!selectedReason || isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Gönderiliyor...' : 'Şikayeti Gönder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Engelleme Modalı Component
function BlockModal({ 
  conversation, 
  isBlocked, 
  onClose, 
  onBlockChange 
}: { 
  conversation: Conversation
  isBlocked: boolean
  onClose: () => void
  onBlockChange: () => void
}) {
  const { user } = useAuthStore()
  const [isProcessing, setIsProcessing] = useState(false)

  const getOtherParticipant = (conv: Conversation) => {
    const participant = conv.participants?.find((p) => p.userId !== user?.id)
    return participant ? { ...participant, user: participant.user } : null
  }

  const otherUser = getOtherParticipant(conversation)

  const handleBlock = async () => {
    if (!otherUser?.user?.id) return

    setIsProcessing(true)
    try {
      if (isBlocked) {
        await api.delete(`/blocks/${otherUser.user.id}`)
        toast.success('Engel kaldırıldı')
      } else {
        await api.post(`/blocks/${otherUser.user.id}`)
        toast.success('Kullanıcı engellendi')
      }
      onBlockChange()
      onClose()
    } catch (error: any) {
      console.error('Failed to block/unblock user:', error)
      toast.error(error?.response?.data?.message || 'İşlem sırasında bir hata oluştu')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-[420px] max-w-[90vw] rounded-2xl bg-gradient-to-b from-[#0f172a] to-[#020617] border border-white/10 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white">
            {isBlocked ? 'Engeli Kaldır' : 'Kullanıcıyı Engelle'}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {isBlocked
              ? 'Bu kullanıcının engelini kaldırmak istediğinize emin misiniz?'
              : 'Bu kullanıcı sana mesaj gönderemez ve seninle etkileşime geçemez.'}
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Vazgeç
          </button>
          <button
            onClick={handleBlock}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isBlocked
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isProcessing ? 'İşleniyor...' : isBlocked ? 'Engeli Kaldır' : 'Engelle'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Dynamic export - prerender'i devre dışı bırak (useSearchParams ve socket kullanımı nedeniyle)
export const dynamic = 'force-dynamic';

