import { io, Socket } from 'socket.io-client'
import { getApiBaseURL } from './api'

let socket: Socket | null = null
let chatSocket: Socket | null = null

export const initSocket = (token: string): Socket => {
  // Eğer socket zaten bağlıysa ve token aynıysa, mevcut socket'i döndür
  const currentAuth = socket?.auth as { token?: string } | undefined
  if (socket?.connected && currentAuth?.token === token) {
    return socket
  }

  // Eğer socket varsa ama bağlı değilse veya token farklıysa, disconnect et
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }

  const baseURL = getApiBaseURL()
  
  // Token kontrolü
  if (!token) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Socket] No token provided for socket connection')
    }
    // Token yoksa bile socket oluştur ama bağlanmayı dene
  }

  socket = io(baseURL, {
    auth: {
      token,
    },
    // Fallback: önce websocket dene, başarısız olursa polling kullan
    transports: ['polling', 'websocket'], // Polling'i önce dene (daha güvenilir)
    // Auto-connect: false yapıp manuel bağlan
    autoConnect: true,
    // Reconnection ayarları
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10, // Artırıldı
    // Timeout
    timeout: 30000, // Artırıldı
    // Force new connection
    forceNew: false,
    // Upgrade transport
    upgrade: true,
  })

  // Handle connection errors - sessizce handle et
  socket.on('connect_error', (error: Error & { type?: string; description?: string }) => {
    // Sadece development modunda logla
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Socket] Connection error:', {
        message: error.message,
        type: error.type || 'unknown',
        description: error.description || 'No description',
        baseURL,
        hasToken: !!token,
      })
    }
    // Production'da sessizce devam et - hata mesajını console'a yazma
    // WebSocket hatası kullanıcıya gösterilmemeli
    // Error'u yakala ve sessizce handle et
    try {
      // Sessizce devam et
    } catch (e) {
      // Hiçbir şey yapma
    }
  })

  // Connection success
  socket.on('connect', () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Socket] Connected successfully')
    }
  })

  // Disconnect
  socket.on('disconnect', (reason) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Socket] Disconnected:', reason)
    }
  })

  // Reconnection attempt
  socket.on('reconnect_attempt', (attemptNumber) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Socket] Reconnection attempt ${attemptNumber}`)
    }
  })

  // Reconnection failed
  socket.on('reconnect_failed', () => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Socket] Reconnection failed')
    }
  })

  return socket
}

export const initChatSocket = (token: string): Socket => {
  // Eğer socket zaten bağlıysa ve token aynıysa, mevcut socket'i döndür
  const currentAuth = chatSocket?.auth as { token?: string } | undefined
  if (chatSocket?.connected && currentAuth?.token === token) {
    return chatSocket
  }

  // Eğer socket varsa ama bağlı değilse veya token farklıysa, disconnect et
  if (chatSocket) {
    chatSocket.removeAllListeners()
    chatSocket.disconnect()
    chatSocket = null
  }

  const baseURL = getApiBaseURL()
  
  chatSocket = io(`${baseURL}/chat`, {
    auth: {
      token,
    },
    // Fallback: önce polling dene, başarısız olursa websocket kullan
    transports: ['polling', 'websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    timeout: 30000,
    forceNew: false,
    upgrade: true,
  })

  // Handle connection errors silently
  chatSocket.on('connect_error', (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Chat Socket] Connection error:', error.message)
    }
  })

  return chatSocket
}

export const getSocket = (): Socket | null => {
  return socket
}

export const getChatSocket = (): Socket | null => {
  return chatSocket
}

export const initCommentsSocket = (token: string): Socket => {
  // Comments socket için ayrı bir instance oluştur
  const baseURL = getApiBaseURL()
  const commentsSocket = io(`${baseURL}/comments`, {
    auth: {
      token,
    },
    // Fallback: önce polling dene, başarısız olursa websocket kullan
    transports: ['polling', 'websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    timeout: 30000,
    forceNew: false,
    upgrade: true,
  })

  // Handle connection errors silently
  commentsSocket.on('connect_error', (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Comments Socket] Connection error:', error.message)
    }
  })

  return commentsSocket
}

export const initPostsSocket = (token: string): Socket => {
  // Posts socket için ayrı bir instance oluştur
  const baseURL = getApiBaseURL()
  const postsSocket = io(`${baseURL}/posts`, {
    auth: {
      token,
    },
    // Fallback: önce polling dene, başarısız olursa websocket kullan
    transports: ['polling', 'websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    timeout: 30000,
    forceNew: false,
    upgrade: true,
  })

  // Handle connection errors silently
  postsSocket.on('connect_error', (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Posts Socket] Connection error:', error.message)
    }
  })

  return postsSocket
}

export const initArticlesSocket = (token: string): Socket => {
  // Articles socket için ayrı bir instance oluştur
  const baseURL = getApiBaseURL()
  const articlesSocket = io(`${baseURL}/articles`, {
    auth: {
      token,
    },
    // Fallback: önce polling dene, başarısız olursa websocket kullan
    transports: ['polling', 'websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    timeout: 30000,
    forceNew: false,
    upgrade: true,
  })

  // Handle connection errors silently
  articlesSocket.on('connect_error', (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Articles Socket] Connection error:', error.message)
    }
  })

  return articlesSocket
}

export const initAdminSocket = (token: string): Socket => {
  const baseURL = getApiBaseURL()
  const adminSocket = io(`${baseURL}/admin`, {
    auth: {
      token,
    },
    // Fallback: önce polling dene, başarısız olursa websocket kullan
    transports: ['polling', 'websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    timeout: 30000,
    forceNew: false,
    upgrade: true,
  })

  // Handle connection errors silently
  adminSocket.on('connect_error', (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Admin Socket] Connection error:', error.message)
    }
  })

  return adminSocket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  if (chatSocket) {
    chatSocket.disconnect()
    chatSocket = null
  }
}



