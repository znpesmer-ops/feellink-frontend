import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null
let chatSocket: Socket | null = null

export const initSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket
  }

  socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
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

  chatSocket = io(`${process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'}/chat`, {
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
  const commentsSocket = io(`${process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'}/comments`, {
    auth: {
      token,
    },
    transports: ['websocket'],
  })

  return commentsSocket
}

export const initPostsSocket = (token: string): Socket => {
  // Posts socket için ayrı bir instance oluştur
  const postsSocket = io(`${process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'}/posts`, {
    auth: {
      token,
    },
    transports: ['websocket'],
  })

  return postsSocket
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



