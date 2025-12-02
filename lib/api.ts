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

// API base URL - sadece environment variable'dan al
const baseURL = process.env.NEXT_PUBLIC_API_URL

if (!baseURL) {
  console.error('NEXT_PUBLIC_API_URL tanımlı değil!')
}

// getApiBaseURL fonksiyonunu export et (socket.ts ve diğer dosyalar için)
export const getApiBaseURL = (): string => {
  return baseURL || 'http://localhost:3002'
}

if (typeof window === 'undefined') {
  console.info('[api] base URL:', baseURL)
} else {
  console.info('[api] base URL (client):', baseURL)
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000, // 15 saniye timeout
})

// Add token to requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const state = useAuthStore.getState()
  if (state.accessToken) {
    config.headers.Authorization = `Bearer ${state.accessToken}`
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
      const networkError: AxiosError = {
        ...error,
        response: {
          data: {
            message: error.code === 'ECONNABORTED' || error.message?.includes('timeout')
              ? 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.'
              : error.code === 'ERR_NETWORK' || error.message === 'Network Error'
              ? 'Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.'
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
export const getErrorMessage = (error: any): string => {
  // Network/Connection errors
  if (!error?.response) {
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.'
    }
    if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
      return 'Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.'
    }
    return 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.'
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

