import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from './store'

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

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  withCredentials: true,
})

// Add token to requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const state = useAuthStore.getState()
  if (state.accessToken) {
    config.headers.Authorization = `Bearer ${state.accessToken}`
  }
  return config
})

// Handle auth errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

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
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/refresh`,
          { refreshToken }
        )

        const { accessToken, refreshToken: newRefreshToken, user } = response.data

        // Update tokens and user in store
        useAuthStore.getState().setAuth(user, accessToken, newRefreshToken)

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

    return Promise.reject(error)
  }
)

export { api }
export default api

