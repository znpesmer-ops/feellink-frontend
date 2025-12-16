'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { initChatSocket } from '@/lib/socket'
import { useAuthStore } from '@/lib/store'
import { ProRoleBadge } from '@/components/ProRoleBadge'
import { Send, Search, Image as ImageIcon, X, Edit, Trash2, MoreVertical, Paperclip, Download, FileText } from 'lucide-react'
import { NewMessageModal } from '@/components/new-message-modal'

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
  const [conversations, setConversations] = useState<Conversation[]>([])
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
  const [activeTab, setActiveTab] = useState<'chat' | 'media' | 'files'>('chat')
  const [media, setMedia] = useState<Array<{ id: string; imageUrl: string; createdAt: string; senderId: string }>>([])
  const [jobApplications, setJobApplications] = useState<Record<string, { listingTitle: string; company?: string }>>({})
  const [files, setFiles] = useState<Array<{ id: string; fileUrl: string; fileName: string | null; fileType: string | null; createdAt: string; senderId: string }>>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatSocketRef = useRef<any>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const activeConversationRef = useRef<Conversation | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Socket bağlantısı - sadece bir kez kurulmalı
  useEffect(() => {
    if (!accessToken || !user) return

    const socket = initChatSocket(accessToken)
    chatSocketRef.current = socket

    socket.on('connect', () => {
      console.log('✅ Chat socket connected:', socket.id)
      // Aktif kullanıcıları al
      socket.emit('get_active_users')
    })

    socket.on('disconnect', () => {
      console.log('❌ Chat socket disconnected')
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    // Receive message handler - aktif konuşma için
    const handleReceiveMessage = (message: Message) => {
      console.log('📨 Received message:', message)
      
      // Aktif konuşmaya ait mesajsa ekle
      if (message.conversationId === activeConversationRef.current?.id) {
        setMessages((prev) => {
          // Duplicate kontrolü - aynı ID'ye sahip mesaj varsa ekleme
          const exists = prev.find((m) => m.id === message.id)
          if (exists) return prev
          
          // Normal mesaj ekleme
          return [...prev, message]
        })
        setTimeout(() => scrollToBottom(), 0)

        // Karşı taraftan gelen yeni mesajı otomatik okundu işaretle
        if (message.senderId !== user.id && !message.read && chatSocketRef.current?.connected) {
          // Socket ile okundu işaretle (anlık bildirim için)
          chatSocketRef.current.emit('mark_message_read', {
            messageId: message.id,
            conversationId: message.conversationId,
          })
          
          // REST API ile de işaretle (kalıcılık için)
          api.put(`/chat/conversations/${message.conversationId}/read`).catch(console.error)
        }
      }
      
      // Konuşma listesini güncelle
      loadConversations()
    }

    // New message notification - başka bir konuşmadan
    const handleNewMessage = (data: { conversationId: string; message: Message }) => {
      console.log('📬 New message notification:', data)
      
      // Eğer aktif konuşma değilse, konuşma listesini güncelle
      if (data.conversationId !== activeConversationRef.current?.id) {
        loadConversations()
      }
    }

    // Typing indicator - eski sistem (uyumluluk için)
    const handleUserTyping = (data: { userId: string; conversationId: string; isTyping: boolean }) => {
      if (data.conversationId === activeConversationRef.current?.id && data.userId !== user.id) {
        setIsTyping(data.isTyping)
      }
    }

    // Typing start - yeni sistem
    const handleTypingStart = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConversationRef.current?.id && data.userId !== user.id) {
        setIsTyping(true)
      }
    }

    // Typing stop - yeni sistem
    const handleTypingStop = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConversationRef.current?.id && data.userId !== user.id) {
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
      if (data.conversationId === activeConversationRef.current?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId !== user.id ? { ...m, read: true } : m))
        )
      }
    }

    // Message read update - tek mesaj okundu
    const handleMessageReadUpdate = (data: { messageId: string; conversationId: string; readBy: string }) => {
      if (data.conversationId === activeConversationRef.current?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, read: true } : m))
        )
      }
    }

    // Message edited - mesaj düzenlendi
    const handleMessageEdited = (message: Message) => {
      if (message.conversationId === activeConversationRef.current?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? message : m))
        )
      }
    }

    // Message deleted - mesaj silindi
    const handleMessageDeleted = (data: { id: string; conversationId: string }) => {
      if (data.conversationId === activeConversationRef.current?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.id ? { ...m, isDeleted: true, content: null, imageUrl: null } : m))
        )
      }
    }

    socket.on('receive_message', handleReceiveMessage)
    socket.on('new_message', handleNewMessage)
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
    if (!activeConversation) {
      setMedia([])
      setFiles([])
      return
    }

    if (activeTab === 'media') {
      setLoadingMedia(true)
      api
        .get(`/chat/conversations/${activeConversation.id}/media`)
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
        .get(`/chat/conversations/${activeConversation.id}/files`)
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
  }, [activeTab, activeConversation])

  // Yeni mesaj geldiğinde medya/dosya listelerini güncelle
  useEffect(() => {
    if (!chatSocketRef.current || !activeConversation) return

    const socket = chatSocketRef.current

    const handleNewMessage = (message: Message) => {
      if (message.conversationId !== activeConversation?.id) return

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

      // Mesaj silindiğinde listelerden çıkar
      if (message.isDeleted) {
        setMedia((prev) => prev.filter((m) => m.id !== message.id))
        setFiles((prev) => prev.filter((f) => f.id !== message.id))
      }
    }

    socket.on('receive_message', handleNewMessage)

    return () => {
      socket.off('receive_message', handleNewMessage)
    }
  }, [activeConversation])

  // Konuşmaları yükle
  const loadConversations = async () => {
    try {
      const response = await api.get('/chat/conversations')
      const conversations = response.data
      setConversations(conversations)
      
      // İlk yüklemede kullanıcıların çevrim içi durumlarını set et
      conversations.forEach((conv: Conversation) => {
        const otherUser = getOtherParticipant(conv)
        if (otherUser?.user?.id) {
          // Backend'den gelen isOnline bilgisini kullan
          if ('isOnline' in otherUser.user && otherUser.user.isOnline !== undefined) {
            const isOnline = Boolean(otherUser.user.isOnline)
            setOnlineUsers((prev) => ({
              ...prev,
              [otherUser.user.id]: isOnline,
            }))
            console.log(`📊 Set initial online status for ${otherUser.user.id}:`, isOnline)
          }
          // lastSeen bilgisini de set et
          if ('lastSeen' in otherUser.user && otherUser.user.lastSeen) {
            const lastSeenValue = otherUser.user.lastSeen
            const lastSeenString = typeof lastSeenValue === 'string' ? lastSeenValue : (lastSeenValue instanceof Date ? lastSeenValue.toISOString() : String(lastSeenValue))
            setUserLastSeen((prev) => ({
              ...prev,
              [otherUser.user.id]: lastSeenString,
            }))
          }
        }
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

  useEffect(() => {
    if (accessToken) {
      loadConversations()
    }
  }, [accessToken])

  // URL'den gelen conversation ID ile otomatik açma
  useEffect(() => {
    const conversationId = searchParams?.get('conversation')
    if (conversationId && conversations.length > 0 && !activeConversation) {
      const conversation = conversations.find((c) => c.id === conversationId)
      if (conversation) {
        openConversation(conversation)
      }
    }
  }, [searchParams, conversations])

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
      loadMessages(activeConversation.id)
      
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
  }, [activeConversation])

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages`)
      const loadedMessages = response.data.messages || []
      setMessages(loadedMessages)
      scrollToBottom()

      // Mesajlar yüklendiğinde okundu işaretle
      if (loadedMessages.length > 0 && chatSocketRef.current?.connected) {
        // Kendi göndermediğimiz mesajları bul
        const unreadMessages = loadedMessages.filter(
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
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const openConversation = async (conversation: Conversation) => {
    setActiveConversation(conversation)
    activeConversationRef.current = conversation
    setMessages([])
  }

  const handleNewMessageSelect = async (conversationId: string) => {
    // Konuşmayı direkt yükle ve aç
    try {
      const response = await api.get(`/chat/conversations/${conversationId}`)
      const conversation = response.data
      openConversation(conversation)
      
      // Konuşmaları yeniden yükle (listeyi güncellemek için)
      loadConversations()
    } catch (error) {
      console.error('Failed to load conversation:', error)
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
    if ((!messageText.trim() && !selectedImage && !selectedFile) || !activeConversation || !chatSocketRef.current?.connected) return

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

    // Typing durumunu durdur
    chatSocketRef.current.emit('typing_stop', {
      conversationId: activeConversation.id,
    })

    // Socket ile mesaj gönder - receive_message ile ekleme yapılacak
    chatSocketRef.current.emit('send_message', {
      conversationId: activeConversation.id,
      content: content || undefined,
      imageUrl: imageUrl || undefined,
      fileUrl: fileUrl || undefined,
      fileName: fileName || undefined,
      fileType: fileType || undefined,
    }, (response: any) => {
      if (response?.error) {
        console.error('Failed to send message:', response.error)
        alert('Mesaj gönderilirken bir hata oluştu')
      }
    })
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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenuForId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getOtherParticipant = (conversation: Conversation) => {
    const participant = conversation.participants?.find((p) => p.userId !== user?.id)
    return participant ? { ...participant, user: participant.user } : null
  }

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

        {/* Konuşma Listesi */}
        <div className="flex-1 overflow-y-auto">
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
              const isActive = activeConversation?.id === conversation.id

              if (!otherUser?.user) return null

              const isOnline = onlineUsers[otherUser?.user?.id] || false

              return (
                <div
                  key={conversation.id}
                  onClick={() => openConversation(conversation)}
                  className={`p-4 cursor-pointer border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    isActive ? 'bg-brand-orange/10 dark:bg-brand-orange/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12">
                      <img
                        src={otherUser?.user?.avatar || '/default-avatar.png'}
                        alt={otherUser?.user?.username || 'User'}
                        className="w-12 h-12 rounded-full object-cover"
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
                          {jobApplications[otherUser?.user?.id || ''] && (
                            <p className="text-xs text-brand-orange dark:text-orange-400 mt-0.5">
                              İlan üzerinden • {jobApplications[otherUser.user.id].listingTitle}
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
                  </div>
                </div>
              )
            })
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
                      <img
                        src={otherUser?.user?.avatar || '/default-avatar.png'}
                        alt={otherUser?.user?.username || 'User'}
                        className="w-10 h-10 rounded-full object-cover"
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
                      {jobApplications[otherUser?.user?.id || ''] && (
                        <p className="text-xs text-brand-orange dark:text-orange-400 mt-0.5">
                          İlan üzerinden • {jobApplications[otherUser.user.id].listingTitle}
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
                  </div>
                )
              })()}
            </div>

            {/* Mesajlar Listesi */}
            {activeTab === 'chat' && (
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 space-y-3">
              {messages.map((message, index) => {
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
                        <img
                          src={message.sender.avatar || '/default-avatar.png'}
                          alt={message.sender.username}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
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
              })}
              <div ref={messagesEndRef} />
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
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
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
            </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">💬</p>
              <p>Bir sohbet seçin</p>
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
                onClick={() => setActiveConversation(null)}
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
                        onClick={() => setActiveConversation(null)}
                        className="text-gray-600 dark:text-gray-400"
                      >
                        ←
                      </button>
                      <div className="relative">
                        <img
                          src={otherUser?.user?.avatar || '/default-avatar.png'}
                          alt={otherUser?.user?.username || 'User'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-950"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                          {otherUser?.user?.fullName || otherUser?.user?.username || 'Kullanıcı'}
                        </h2>
                        {jobApplications[otherUser?.user?.id || ''] && (
                          <p className="text-xs text-brand-orange dark:text-orange-400 mt-0.5 truncate">
                            İlan üzerinden • {jobApplications[otherUser.user.id].listingTitle}
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
              {messages.map((message, index) => {
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
              })}
              <div ref={messagesEndRef} />
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
            </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>Bir sohbet seçin</p>
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
    </div>
  )
}

// Dynamic export - prerender'i devre dışı bırak (useSearchParams ve socket kullanımı nedeniyle)
export const dynamic = 'force-dynamic';

