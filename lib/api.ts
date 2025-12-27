import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from './store'
import { CapabilitySummary, SidebarVisibility } from '@/types/capabilities'

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (error?: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// API base URL - dinamik olarak belirle
// Client-side'da window.location'dan, server-side'da env'den al
const getBaseURL = (): string => {
  // ENV'den al - öncelik sırası: .env.local > .env > varsayılan
  const envURL = process.env.NEXT_PUBLIC_API_URL
  
  // Server-side (SSR)
  if (typeof window === 'undefined') {
    return envURL || 'http://localhost:3002'
  }
  
  // Client-side - ENV URL'i varsa kullan
  if (envURL) {
    return envURL
  }
  
  // 🔥 Client-side'da window.location'dan backend URL'ini tespit et
  // Eğer frontend localhost:3000'de çalışıyorsa, backend localhost:3002'de olmalı
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    
    // Localhost veya 127.0.0.1 ise backend'i localhost:3002 olarak ayarla
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3002'
    }
    
    // Network IP ise backend'i aynı IP'de port 3002 olarak ayarla
    // Örnek: http://192.168.1.6:3000 -> http://192.168.1.6:3002
    return `${protocol}//${hostname}:3002`
  }
  
  // Fallback: localhost:3002 (backend şu an burada)
  return 'http://localhost:3002'
}

const baseURL = getBaseURL()

if (!baseURL) {
  console.error('NEXT_PUBLIC_API_URL tanımlı değil!')
}

// getApiBaseURL fonksiyonunu export et (socket.ts ve diğer dosyalar için)
export const getApiBaseURL = (): string => {
  return baseURL
}

if (typeof window === 'undefined') {
  console.info('[api] base URL:', baseURL)
} else {
  console.info('[api] ✅ base URL (client):', baseURL, '← Bu URL kullanılıyor!')
  // Debug: localStorage'daki backend URL'ini de göster
  const savedURL = localStorage.getItem('backend_url')
  if (savedURL && savedURL !== baseURL) {
    console.warn('[api] ⚠️ localStorage backend_url:', savedURL, '(kullanılmıyor, baseURL kullanılıyor)')
  }
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000, // 30 saniye timeout (network error'ları azaltmak için artırıldı)
  // 🔥 Network error'ları önlemek için retry mekanizması
  validateStatus: (status) => {
    // 2xx ve 3xx status kodlarını başarılı kabul et
    return status >= 200 && status < 400
  },
})

// Add token to requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Önce store'dan token al
  const state = useAuthStore.getState()
  let token = state.accessToken
  
  // Store'da yoksa localStorage'dan kontrol et (hydration sorunları için)
  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem('access_token')
  }
  
  // Token varsa header'a ekle
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    // Debug: development modunda logla
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] ✅ Token gönderiliyor:', token.substring(0, 20) + '...')
    }
  } else {
    // Debug: token yoksa uyarı ver
    if (process.env.NODE_ENV === 'development') {
      console.warn('[API] ⚠️ Token bulunamadı! Store:', !!state.accessToken, 'localStorage:', typeof window !== 'undefined' ? !!localStorage.getItem('access_token') : 'N/A')
    }
  }
  
  return config
})

// Handle empty responses and JSON parse errors
api.interceptors.response.use(
  (response) => {
    // Boş response'ları güvenli bir şekilde handle et
    // Axios bazen boş string veya null döndürebilir
    if (response.data === '' || response.data === null || response.data === undefined) {
      // DELETE, PATCH gibi istekler için varsayılan success response
      if (['delete', 'patch', 'post', 'put'].includes(response.config?.method?.toLowerCase() || '')) {
        response.data = { success: true }
      } else {
        response.data = {}
      }
    }
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Network/Connection errors - daha anlaşılır hata mesajı ver
    if (!error.response) {
      // Network hatası (bağlantı yok, timeout, vs.)
      // DETAYLI LOG - kullanıcının istediği bilgi
      console.error('[API] ❌ Network Error:', {
        message: error.message,
        code: error.code,
        status: 'NO_RESPONSE',
        url: error.config?.url,
        baseURL: error.config?.baseURL || baseURL,
        method: error.config?.method?.toUpperCase(),
        hasToken: !!error.config?.headers?.Authorization,
        tokenPreview: typeof error.config?.headers?.Authorization === 'string' 
          ? error.config.headers.Authorization.substring(0, 20) + '...' 
          : 'NO_TOKEN',
      })
      
      // 🔥 Backend bağlantısını kontrol et
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('[API] ⚠️ Backend bağlantı kontrolü:', {
          baseURL: baseURL,
          expectedBackend: 'http://localhost:3002',
          suggestion: 'Backend çalışıyor mu kontrol edin: curl http://localhost:3002/health',
        })
      }

      // Network error'ları handle et - kullanıcı dostu mesaj
      const networkError: AxiosError = {
        ...error,
        response: {
          data: {
            message: error.code === 'ECONNABORTED' || error.message?.includes('timeout')
              ? 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.'
              : error.code === 'ERR_NETWORK' || error.message === 'Network Error' || error.message?.includes('Network')
              ? 'Backend bağlantısı kurulamadı. Lütfen backend\'in çalıştığından emin olun ve tekrar deneyin.'
              : 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.',
          },
          status: 0,
          statusText: 'Network Error',
          headers: {},
          config: error.config || {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
      }
      return Promise.reject(networkError)
    }

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return api(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      const state = useAuthStore.getState()
      const refreshToken = state.refreshToken

      if (!refreshToken) {
        // No refresh token, logout
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        // api instance'ını kullan (baseURL zaten ayarlı)
        const response = await api.post(
          '/auth/refresh',
          { refreshToken }
        )

        const { accessToken, refreshToken: newRefreshToken, user, capabilities, sidebar } = response.data as {
          accessToken: string
          refreshToken: string
          user: any
          capabilities?: CapabilitySummary
          sidebar?: SidebarVisibility
        }

        // Update tokens and user in store
        useAuthStore.getState().setAuth(user, accessToken, newRefreshToken, capabilities ?? null, sidebar ?? null)

        // Update authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
        }

        processQueue(null, accessToken)

        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, logout
        processQueue(refreshError, null)
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // JSON parse hatası durumunda (boş response veya invalid JSON)
    if (error.message?.includes('JSON') || error.message?.includes('Unexpected end')) {
      // Eğer status başarılıysa (200-299), response'u success olarak kabul et
      if (error.response && error.response.status >= 200 && error.response.status < 300) {
        return Promise.resolve({
          ...error.response,
          data: { success: true },
        })
      }
    }

    return Promise.reject(error)
  }
)

// Utility function to extract user-friendly error messages
export const getErrorMessage = (error: any, options?: { isLogin?: boolean }): string => {
  // Network/Connection errors
  if (!error?.response) {
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.'
    }
    if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || error?.message?.includes('Network')) {
      return 'Backend bağlantısı kurulamadı. Lütfen backend\'in çalıştığından emin olun ve tekrar deneyin.'
    }
    return 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.'
  }

  // 🔒 GÜVENLİK: Login hataları için tek bir güvenli mesaj (user enumeration önleme)
  if (options?.isLogin && (error.response?.status === 401 || error.response?.status === 403)) {
    return 'E-posta adresi veya şifre hatalı.'
  }

  // Backend error responses
  const responseData = error.response?.data
  if (!responseData) {
    return 'Bir hata oluştu. Lütfen tekrar deneyin.'
  }

  // Handle nested message objects (NestJS format)
  const nested = typeof responseData?.message === 'object' ? responseData.message : null
  const errorMessage = nested?.message ?? 
    (typeof responseData?.message === 'string' ? responseData.message : null) ??
    responseData?.error ??
    'Bir hata oluştu. Lütfen tekrar deneyin.'

  // Filter out unwanted error messages
  const unwantedMessages = [
    'internet server error',
    'Internet Server Error',
    'INTERNET SERVER ERROR',
    'Internal Server Error',
    'internal server error',
  ]

  if (unwantedMessages.some(msg => errorMessage.toLowerCase().includes(msg.toLowerCase()))) {
    return 'Bir hata oluştu. Lütfen tekrar deneyin.'
  }

  return errorMessage
}

export { api }
export default api

