import { io, Socket } from 'socket.io-client'
import { getApiBaseURL } from './api'

let socket: Socket | null = null
let chatSocket: Socket | null = null

export const initSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket
  }

  const baseURL = getApiBaseURL()
  socket = io(baseURL, {
    auth: {
      token,
    },
    transports: ['websocket'],
  })

  return socket
}

export const initChatSocket = (token: string): Socket => {
  if (chatSocket?.connected) {
    return chatSocket
  }

  const baseURL = getApiBaseURL()
  chatSocket = io(`${baseURL}/chat`, {
    auth: {
      token,
    },
    transports: ['websocket'],
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
    transports: ['websocket'],
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
    transports: ['websocket'],
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
    transports: ['websocket'],
  })

  return articlesSocket
}

export const initAdminSocket = (token: string): Socket => {
  const baseURL = getApiBaseURL()
  const adminSocket = io(`${baseURL}/admin`, {
    auth: {
      token,
    },
    transports: ['websocket'],
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



