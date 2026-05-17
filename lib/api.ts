import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from './store'

/** Büyük multipart + /events mutasyonları: proxy'de POST JSON bazen kopuyor; doğrudan backend */
export type ApiRequestConfig = InternalAxiosRequestConfig & { directBackend?: boolean }

const FEELLINK_SYNTHETIC_NETWORK = '__feellinkSyntheticNetwork' as const

function apiDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_API_DEBUG === '1'
  )
}

/** /events altında POST/PUT/PATCH/DELETE → create/update/delete/join/comment vb. */
function isEventsApiMutation(config: Pick<ApiRequestConfig, 'url' | 'method'>): boolean {
  const path = (config.url || '').split('?')[0] || ''
  if (!/^\/events(\/|$)/.test(path)) return false
  const m = (config.method || 'get').toLowerCase()
  return ['post', 'put', 'patch', 'delete'].includes(m)
}

import { CapabilitySummary, SidebarVisibility } from '@/types/capabilities'

let isRefreshing = false
let isLoggingOut = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (error?: any) => void
}> = []

export function performForcedLogout() {
  if (isLoggingOut) return
  isLoggingOut = true
  useAuthStore.getState().clearAuth()
  if (typeof window !== 'undefined') {
    // Eğer kullanıcı zaten /login sayfasındaysa (restore ekranı dahil), sayfayı yeniden yüklemek state'i sıfırlıyor.
    // Bu yüzden sadece login'de değilken redirect yap.
    if (!window.location.pathname.startsWith('/login')) {
      window.location.replace('/login')
    }
  }
  // Reset so next 401 can trigger again if user logs in again
  setTimeout(() => { isLoggingOut = false }, 1000)
}

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

/** Client-side only: read tokens from persisted auth-storage when store not yet rehydrated (e.g. after nav). */
function getPersistedAuthState(): { accessToken?: string | null; refreshToken?: string | null } {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return {}
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string | null; refreshToken?: string | null } }
    return parsed?.state ?? {}
  } catch {
    return {}
  }
}

function getRefreshTokenFromPersistedStorage(): string | null {
  const token = getPersistedAuthState().refreshToken
  return token && typeof token === 'string' ? token : null
}

function getAccessTokenFromPersistedStorage(): string | null {
  const token = getPersistedAuthState().accessToken
  return token && typeof token === 'string' ? token : null
}

function ensureProtocol(url: string): string {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `https://${url}`
}

/**
 * Medya URL'leri, Socket.IO ve doğrudan backend kökü gereken yerler için.
 * Asla /api-proxy kullanma — görseller ve socket mutlak backend'e gider.
 */
export function getAbsoluteBackendBaseUrl(): string {
  if (typeof window === 'undefined') {
    const ssrURL =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.BACKEND_REWRITE_TARGET ||
      'http://localhost:3002'
    return ensureProtocol(ssrURL)
  }

  const envURL = process.env.NEXT_PUBLIC_API_URL
  const currentHost = window.location.hostname
  const isHTTPS = window.location.protocol === 'https:'

  if (currentHost === 'feellink.io' || currentHost.includes('feellink.io')) {
    return 'https://feellink-backend.vercel.app'
  }

  if (currentHost.includes('vercel.app')) {
    return 'https://feellink-backend.vercel.app'
  }

  if (envURL && envURL.includes('192.168.')) {
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      return 'http://localhost:3002'
    }
    return envURL.startsWith('http') ? envURL : `http://${envURL}`
  }

  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return envURL ? ensureProtocol(envURL) : 'http://localhost:3002'
  }

  const isLanHost =
    /^192\.168\./.test(currentHost) ||
    /^10\./.test(currentHost) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(currentHost)
  const envMissing = !envURL || !String(envURL).trim()
  if (!isLanHost && envMissing && (isHTTPS || process.env.NODE_ENV === 'production')) {
    return 'https://feellink-backend.vercel.app'
  }

  const defaultURL = envURL || 'http://localhost:3002'
  return ensureProtocol(defaultURL)
}

/** feellink.io / Vercel ön yüzünde tarayıcı istekleri same-origin proxy üzerinden gider */
function shouldUseBrowserApiProxy(): boolean {
  return false // Proxy devre dışı — doğrudan backend'e git (feellink-backend.vercel.app)
}

/** Axios istekleri için base URL (production web'de /api-proxy) */
function getAxiosBaseURL(): string {
  if (typeof window === 'undefined') {
    return getAbsoluteBackendBaseUrl()
  }
  if (shouldUseBrowserApiProxy()) {
    return `${window.location.origin}/api-proxy`
  }
  return getAbsoluteBackendBaseUrl()
}

// Socket / eski import'lar: doğrudan backend kökü
export const getApiBaseURL = (): string => getAbsoluteBackendBaseUrl()

const baseURL = getAxiosBaseURL()

if (typeof window === 'undefined') {
  console.info('[api] axios base URL (SSR):', baseURL)
} else {
  console.info('[api] axios base URL (client):', baseURL, '| absolute backend:', getAbsoluteBackendBaseUrl())
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 60000, // 60 saniye (Vercel serverless cold start için)
  maxContentLength: 100 * 1024 * 1024, // 100MB
  maxBodyLength: 100 * 1024 * 1024, // 100MB
})

// Her istekte güncel axios base URL (SSR + client; prod web'de /api-proxy)
// FormData (medya upload) same-origin /api-proxy üzerinden gider — cross-origin backend upload bazı ağlarda ERR_NETWORK veriyordu.
// Büyük dosya için CreateEventModal istemci tarafı sıkıştırma yapar (413 önleme).
// /events mutasyonları doğrudan backend (JSON POST proxy'de sorun çıkabiliyordu).
// Store rehydrate olmadan (navigasyon sonrası) token için localStorage, yoksa persist yedeği kullan; istek token'sız giderse 401 → forced logout
api.interceptors.request.use((config: ApiRequestConfig) => {
  const isFormData =
    typeof FormData !== 'undefined' && config.data != null && config.data instanceof FormData
  const bypassProxyForBody =
    config.directBackend === true ||
    (typeof window !== 'undefined' &&
      shouldUseBrowserApiProxy() &&
      isEventsApiMutation(config))

  config.baseURL = bypassProxyForBody ? getAbsoluteBackendBaseUrl() : getAxiosBaseURL()

  if (isFormData) {
    const minMs = 65000 // 65s: 5s buffer over Vercel backend's 60s maxDuration
    config.timeout =
      config.timeout != null && config.timeout > minMs ? config.timeout : minMs
  }

  const state = useAuthStore.getState()
  const token =
    state.accessToken ??
    (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null) ??
    (typeof window !== 'undefined' ? getAccessTokenFromPersistedStorage() : null)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Girişsiz post önizleme: süresi dolmuş token 401 vermesin diye Authorization gönderme
  const method = (config.method || 'get').toLowerCase()
  const rawUrl = String(config.url || '')
  const pathOnly = rawUrl.split('?')[0] || ''
  const mergedPath =
    pathOnly.startsWith('http') ? new URL(pathOnly, 'http://_').pathname : pathOnly
  // Hem "/posts/public-share/..." hem "posts/public-share/..." (axios göreli url)
  if (method === 'get' && /(^|\/)posts\/public-share\//.test(mergedPath)) {
    delete (config.headers as Record<string, unknown>).Authorization
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
      const baseURL = (originalRequest?.baseURL ?? getAxiosBaseURL() ?? '') as string
      const isFd =
        typeof FormData !== 'undefined' &&
        originalRequest?.data != null &&
        originalRequest.data instanceof FormData
      if (apiDebugEnabled()) {
        console.warn('[api] !error.response (network / CORS / kesilen istek):', {
          code: error.code,
          message: error.message,
          method: originalRequest?.method,
          url: originalRequest?.url,
          baseURL,
          formData: isFd,
        })
      }

      const networkError: AxiosError = {
        ...error,
        response: {
          data: {
            [FEELLINK_SYNTHETIC_NETWORK]: true,
            message: error.code === 'ECONNABORTED' || error.message?.includes('timeout')
              ? 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.'
              : error.code === 'ERR_NETWORK' || error.message === 'Network Error'
              ? 'Şu an sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edip kısa süre sonra tekrar deneyin.'
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

    // 403 → sadece /auth/me için forced logout (profil/users endpoint'leri 403/ACCOUNT_SUSPENDED dönse bile logout yapma; askı kaldırılan hesaplar profil açabilsin)
    if (error.response?.status === 403) {
      const url = (originalRequest?.url ?? '') as string
      if (url.includes('/auth/me')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[api] Forced logout triggered: 403', { url })
        }
        performForcedLogout()
      }
      return Promise.reject(error)
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
      const refreshToken = state.refreshToken ?? getRefreshTokenFromPersistedStorage()

      const requestUrl = (originalRequest?.url ?? '') as string
      const isAuthEndpoint = requestUrl.includes('/auth/me') || requestUrl.includes('/auth/refresh')

      if (!refreshToken) {
        if (isAuthEndpoint) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[api] Forced logout triggered: 401 no refreshToken', { url: requestUrl })
          }
          performForcedLogout()
        }
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
      } catch (refreshError: unknown) {
        processQueue(refreshError, null)
        if (isAuthEndpoint) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[api] Forced logout triggered: 401 refresh failed', { url: requestUrl })
          }
          performForcedLogout()
        }
        const ax = refreshError as AxiosError
        if (ax?.response) {
          return Promise.reject(refreshError)
        }
        if (apiDebugEnabled()) {
          console.warn('[api] Token refresh failed without HTTP response:', {
            code: ax?.code,
            message: ax?.message,
          })
        }
        const sessionMsg =
          'Oturum doğrulaması başarısız oldu. Lütfen yeniden giriş yapın.'
        const sessionErr = new AxiosError(sessionMsg, 'ERR_REFRESH_FAILED', originalRequest)
        sessionErr.response = {
          status: 401,
          statusText: 'Unauthorized',
          data: { message: sessionMsg },
          headers: {},
          config: originalRequest as any,
        }
        sessionErr.isAxiosError = true
        return Promise.reject(sessionErr)
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

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'auth'
  | 'forbidden'
  | 'validation'
  | 'payload_too_large'
  | 'server'
  | 'unknown'

/** Toast / UI için hata sınıfı (generic ağ mesajı yalnızca `network` | `timeout`) */
export function getApiErrorKind(error: unknown): ApiErrorKind {
  const e = error as AxiosError
  if (!e?.response) {
    if (e?.code === 'ECONNABORTED' || e?.message?.includes('timeout')) return 'timeout'
    if (e?.code === 'ERR_NETWORK' || e?.message === 'Network Error') return 'network'
    return 'network'
  }
  const s = e.response.status
  const data = e.response.data as Record<string, unknown> | undefined
  if (s === 0 && data?.[FEELLINK_SYNTHETIC_NETWORK]) {
    const msg = typeof data.message === 'string' ? data.message : ''
    if (msg.includes('zaman aşımı') || msg.includes('timeout')) return 'timeout'
    return 'network'
  }
  if (s === 401) return 'auth'
  if (s === 403) return 'forbidden'
  if (s === 413) return 'payload_too_large'
  if (s === 400) return 'validation'
  if (s >= 500) return 'server'
  return 'unknown'
}

function extractNestMessage(responseData: any): string | null {
  if (!responseData) return null
  const msg = responseData?.message
  if (Array.isArray(msg)) {
    const joined = msg
      .map((m: unknown) => {
        if (typeof m === 'string') return m
        if (m && typeof m === 'object' && m !== null && 'constraints' in m) {
          const c = (m as { constraints?: Record<string, string> }).constraints
          return c ? Object.values(c).join(', ') : ''
        }
        return ''
      })
      .filter(Boolean)
      .join('. ')
    return joined || null
  }
  if (typeof msg === 'string' && msg.trim()) return msg.trim()
  if (msg && typeof msg === 'object' && typeof (msg as any).message === 'string') {
    return (msg as any).message
  }
  return null
}

// Utility function to extract user-friendly error messages
export const getErrorMessage = (error: any): string => {
  // Ham Axios: henüz interceptor sentetik response eklemediyse
  if (!error?.response) {
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return 'İstek zaman aşımına uğradı. Dosya çok büyük olabilir, lütfen tekrar deneyin.'
    }
    if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
      return 'Şu an sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edip kısa süre sonra tekrar deneyin.'
    }
    return 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.'
  }

  const status = error.response?.status
  const responseData = error.response?.data

  if (status === 0 && responseData?.[FEELLINK_SYNTHETIC_NETWORK]) {
    const m = typeof responseData.message === 'string' ? responseData.message.trim() : ''
    if (m.length >= 3) return m
    return 'Şu an sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edip kısa süre sonra tekrar deneyin.'
  }

  if (status === 413) {
    return 'Dosya veya veri boyutu çok büyük. Daha küçük bir görsel seçin veya sıkıştırılmış bir dosya kullanın.'
  }

  if (status === 401) {
    const fromBody = extractNestMessage(responseData)
    if (fromBody && fromBody.length >= 3) return fromBody
    return 'Oturum doğrulaması başarısız oldu. Lütfen yeniden giriş yapın.'
  }

  if (status === 403) {
    const fromBody = extractNestMessage(responseData)
    if (fromBody && fromBody.length >= 3) return fromBody
    return 'Bu işlem için yetkiniz yok veya hesap türünüz uygun değil.'
  }

  if (status === 400) {
    const fromBody = extractNestMessage(responseData)
    if (fromBody && fromBody.length >= 3) return fromBody
    return 'Gönderilen bilgiler geçersiz. Lütfen alanları kontrol edip tekrar deneyin.'
  }

  if (status != null && status >= 500) {
    return 'Sunucuda geçici bir sorun oluştu. Lütfen kısa süre sonra tekrar deneyin.'
  }

  if (!responseData) {
    return 'Bir hata oluştu. Lütfen tekrar deneyin.'
  }

  const msg = responseData?.message
  const errorMessage = extractNestMessage(responseData)

  // Nest bazen message/error'ı nesne döndürür; .toLowerCase() patlamasın (aksi halde UI genel hataya düşer)
  let rawFinal: unknown = errorMessage ?? responseData?.error ?? 'Bir hata oluştu. Lütfen tekrar deneyin.'
  if (typeof rawFinal !== 'string') {
    if (rawFinal && typeof rawFinal === 'object' && typeof (rawFinal as { message?: unknown }).message === 'string') {
      rawFinal = (rawFinal as { message: string }).message
    } else if (rawFinal != null && typeof rawFinal !== 'object') {
      rawFinal = String(rawFinal)
    } else if (Array.isArray(msg) && msg.length) {
      rawFinal = msg.map((m: unknown) => (typeof m === 'string' ? m : JSON.stringify(m))).join('. ')
    } else {
      rawFinal = 'Bir hata oluştu. Lütfen tekrar deneyin.'
    }
  }
  let finalMessage = String(rawFinal ?? '').trim() || 'Bir hata oluştu. Lütfen tekrar deneyin.'

  // API katmanının ürettiği veya env içeren mesajları sadeleştir
  if (
    /NEXT_PUBLIC_|API_URL|Backend adresini/i.test(finalMessage) ||
    finalMessage.includes('Sunucuya ulaşılamadı')
  ) {
    finalMessage =
      'İşlem sırasında bir bağlantı sorunu oluştu. Lütfen internet bağlantınızı kontrol edip kısa süre sonra tekrar deneyin.'
  }

  // Teknik / iç sistem mesajları kullanıcıya gösterme (güvenlik ve UX)
  const technicalTerms = [
    'internet server error',
    'internal server error',
    'DATABASE_URL',
    'MongoDB',
    'Vercel',
    'URL-encode',
    'connection string',
    'SCRAM',
    'authentication failed',
    'bad auth',
    'ConnectorError',
    'Prisma',
    'env',
    'Environment variable',
  ]
  const lower = finalMessage.toLowerCase()
  const isTechnical = technicalTerms.some(term => lower.includes(term.toLowerCase()))
  if (isTechnical) {
    return 'Kayıt işlemi şu anda tamamlanamıyor. Lütfen daha sonra tekrar deneyin.'
  }

  // Eski genel filtre
  const unwantedMessages = [
    'internet server error',
    'Internet Server Error',
    'INTERNET SERVER ERROR',
    'Internal Server Error',
    'internal server error',
  ]
  if (unwantedMessages.some(m => lower.includes(m.toLowerCase()))) {
    return 'Bir hata oluştu. Lütfen tekrar deneyin.'
  }

  return finalMessage
}

export { api }
export default api

