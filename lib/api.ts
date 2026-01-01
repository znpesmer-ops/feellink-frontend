import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
// 🔥 Lazy import - circular dependency'yi önlemek için
// import { useAuthStore } from './store'
import { CapabilitySummary, SidebarVisibility } from '@/types/capabilities'
import { safeAvatar } from './avatar-constants'

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

// 🔥 Lazy evaluation - sadece gerektiğinde baseURL'i hesapla
let cachedBaseURL: string | null = null

const getCachedBaseURL = (): string => {
  if (cachedBaseURL === null) {
    cachedBaseURL = getBaseURL()
    if (!cachedBaseURL) {
      // 🔥 Server-side'da console.error kullanma
      if (typeof window !== 'undefined') {
        console.error('NEXT_PUBLIC_API_URL tanımlı değil!')
      }
      cachedBaseURL = 'http://localhost:3002' // Fallback
    }
    
    // Debug logging (sadece client-side)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.info('[api] ✅ base URL (client):', cachedBaseURL, '← Bu URL kullanılıyor!')
      try {
        const savedURL = localStorage.getItem('backend_url')
        if (savedURL && savedURL !== cachedBaseURL) {
          console.warn('[api] ⚠️ localStorage backend_url:', savedURL, '(kullanılmıyor, baseURL kullanılıyor)')
        }
      } catch (err) {
        // localStorage erişilemezse sessizce devam et
      }
    }
  }
  return cachedBaseURL
}

// getApiBaseURL fonksiyonunu export et (socket.ts ve diğer dosyalar için)
export const getApiBaseURL = (): string => {
  return getCachedBaseURL()
}

// 🔥 Lazy axios instance - sadece gerektiğinde oluştur
let apiInstance: ReturnType<typeof axios.create> | null = null

const getApiInstance = () => {
  if (!apiInstance) {
    apiInstance = axios.create({
      baseURL: getCachedBaseURL(),
      withCredentials: true,
      timeout: 60000, // 60 saniye timeout (MongoDB bağlantı sorunları için)
      // 🔥 Network error'ları önlemek için retry mekanizması
      validateStatus: (status) => {
        // 2xx ve 3xx status kodlarını başarılı kabul et
        return status >= 200 && status < 400
      },
    })
  }
  return apiInstance
}

// ✅ Avatar URL'lerini normalize et
function normalizeAvatarInData(data: any): any {
  if (!data || typeof data !== 'object') return data
  
  if (Array.isArray(data)) {
    return data.map(item => normalizeAvatarInData(item))
  }
  
  const normalized: any = {}
  for (const [key, value] of Object.entries(data)) {
    // Avatar ile ilgili key'leri normalize et
    if (key.toLowerCase().includes('avatar') || key.toLowerCase().includes('profileimage')) {
      normalized[key] = safeAvatar(value as string)
    } else if (typeof value === 'object' && value !== null) {
      // Nested object'leri recursive normalize et
      normalized[key] = normalizeAvatarInData(value)
    } else {
      normalized[key] = value
    }
  }
  
  return normalized
}

// 🔥 Interceptor'ları lazy olarak ekle
let interceptorsInitialized = false

const initializeInterceptors = () => {
  if (interceptorsInitialized) return
  interceptorsInitialized = true
  
  const instance = getApiInstance()
  
  // Add token to requests
  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    // 🔥 Lazy import - circular dependency'yi önlemek için
    const { useAuthStore } = await import('./store')
    // Önce store'dan token al
    const state = useAuthStore.getState()
    let token = state.accessToken
    
    // Store'da yoksa localStorage'dan kontrol et (hydration sorunları için)
    if (!token && typeof window !== 'undefined') {
      try {
        token = localStorage.getItem('access_token')
      } catch (err) {
        // localStorage erişilemezse sessizce devam et
      }
    }
    
    // Token varsa header'a ekle
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      // Debug: development modunda logla
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] ✅ Token gönderiliyor:', token.substring(0, 20) + '...')
      }
    } else {
      // 🔥 GEÇİCİ: Login sırasında token doğal olarak yoktur, uyarı verme
      // Token yoksa sadece devam et (auth guard değil, sadece log)
      // Login sırasında bu normal bir durum
    }
    
    return config
  })
  
  // Handle empty responses and JSON parse errors
  instance.interceptors.response.use(
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
    } else if (response.data && typeof response.data === 'object') {
      // ✅ Backend'den gelen tüm avatar URL'lerini normalize et
      response.data = normalizeAvatarInData(response.data)
    }
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // 🔥 4. Network/Connection errors - DB kopunca localhost çökmesin
    if (!error.response) {
      // Network hatası (bağlantı yok, timeout, vs.)
      // Sadece development'ta detaylı log
      if (process.env.NODE_ENV === 'development') {
        console.error('[API] ❌ Network Error:', {
          message: error.message,
          code: error.code,
          status: 'NO_RESPONSE',
          url: error.config?.url,
          baseURL: error.config?.baseURL || getCachedBaseURL(),
        })
      }
      
      // 🔥 DB kopunca localhost çökmesin - kullanıcı dostu mesaj
      const networkError: AxiosError = {
        ...error,
        response: {
          data: {
            message: 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.',
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

    // 🔒 Hesap askıya alma kontrolü (403 ACCOUNT_SUSPENDED)
    if (error.response?.status === 403 && error.response?.data?.code === 'ACCOUNT_SUSPENDED') {
      const suspensionData = error.response.data
      // Global event dispatch (modal component dinleyecek)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('account-suspended', {
            detail: {
              reason: suspensionData.reason || 'Belirtilmemiş',
              until: suspensionData.until || null,
            },
          })
        )
      }
      // Hata mesajını özel olarak işle
      return Promise.reject({
        ...error,
        isSuspended: true,
        suspensionData,
      })
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
            return getApiInstance()(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      // 🔥 Lazy import - circular dependency'yi önlemek için
      const { useAuthStore } = await import('./store')
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
        const response = await getApiInstance().post(
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
        // useAuthStore zaten yukarıda import edildi
        useAuthStore.getState().setAuth(user, accessToken, newRefreshToken, capabilities ?? null, sidebar ?? null)

        // Update authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
        }

        processQueue(null, accessToken)

        return getApiInstance()(originalRequest)
      } catch (refreshError) {
        // Refresh failed, logout
        processQueue(refreshError, null)
        // useAuthStore zaten yukarıda import edildi
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
  })
}

// Export api - lazy evaluation ile Proxy kullan
// 🔥 Client-side only - server-side'da kullanılmamalı
// Server-side'da dummy object, client-side'da gerçek API
let apiProxy: ReturnType<typeof axios.create> | null = null

const getApiProxy = () => {
  // 🔥 Server-side'da dummy object döndür (sadece import hatası önlemek için)
  if (typeof window === 'undefined') {
    return {
      get: () => Promise.reject(new Error('API cannot be used on server-side')),
      post: () => Promise.reject(new Error('API cannot be used on server-side')),
      put: () => Promise.reject(new Error('API cannot be used on server-side')),
      patch: () => Promise.reject(new Error('API cannot be used on server-side')),
      delete: () => Promise.reject(new Error('API cannot be used on server-side')),
      defaults: { baseURL: '' },
    } as any
  }
  
  if (!apiProxy) {
    // Client-side'da gerçek Proxy
    apiProxy = new Proxy({} as ReturnType<typeof axios.create>, {
      get(target, prop) {
        // İlk kullanımda interceptor'ları initialize et
        initializeInterceptors()
        const instance = getApiInstance()
        const value = instance[prop as keyof typeof instance]
        
        // Function ise bind et
        if (typeof value === 'function') {
          return value.bind(instance)
        }
        
        return value
      }
    }) as any
  }
  
  return apiProxy
}

// Export api - lazy evaluation ile Proxy (sadece client-side'da çalışır)
const api = typeof window !== 'undefined' 
  ? new Proxy({} as ReturnType<typeof axios.create>, {
      get(target, prop) {
        return getApiProxy()[prop as keyof ReturnType<typeof axios.create>]
      }
    })
  : ({
      get: () => Promise.reject(new Error('API cannot be used on server-side')),
      post: () => Promise.reject(new Error('API cannot be used on server-side')),
      put: () => Promise.reject(new Error('API cannot be used on server-side')),
      patch: () => Promise.reject(new Error('API cannot be used on server-side')),
      delete: () => Promise.reject(new Error('API cannot be used on server-side')),
      defaults: { baseURL: '' },
    } as any)

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
  // ⚠️ AMA: Askıya alınmış hesap hatası (403 + ACCOUNT_SUSPENDED) özel olarak handle edilmeli
  if (options?.isLogin) {
    // Askıya alınmış hesap hatası - özel mesaj göster (frontend'de zaten handle ediliyor)
    if (error.response?.status === 403 && error.response?.data?.code === 'ACCOUNT_SUSPENDED') {
      // Bu durumda frontend'de özel mesaj gösterilecek, buraya gelmemeli
      // Ama yine de fallback mesaj ver
      return error.response?.data?.message || 'Hesabınız askıya alınmıştır.'
    }
    
    // ✅ Veritabanı bağlantı hatası - özel mesaj göster
    const responseMessage = error.response?.data?.message || '';
    if (responseMessage.includes('Veritabanı bağlantı hatası') || 
        responseMessage.includes('Veritabanı') || 
        responseMessage.includes('bağlantı hatası')) {
      return 'Veritabanı bağlantı hatası. Lütfen tekrar deneyin.';
    }
    
    // Diğer 401/403 hataları için güvenli mesaj
    if (error.response?.status === 401 || error.response?.status === 403) {
      return 'E-posta adresi veya şifre hatalı.'
    }
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

