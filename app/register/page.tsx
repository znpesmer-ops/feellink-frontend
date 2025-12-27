'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api, { getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { getDashboardRouteFromUser } from '@/lib/role-utils'

const unicodeEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

const registerSchema = z.object({
  username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır'),
  email: z.string().regex(unicodeEmailRegex, 'Lütfen geçerli bir e-posta adresi girin'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Şifre en az bir harf ve bir rakam içermelidir'),
  fullName: z.string().optional(),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const { setAuth, accessToken, user, capabilities, clearAuth } = useAuthStore()
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(true)
  const [mode, setMode] = useState<'user' | 'corporate'>('user')

  // Register sayfasında olduğumuz için, sayfa yüklendiğinde eski auth state'i temizle
  // Ama sadece eğer zaten giriş yapılmamışsa
  useEffect(() => {
    // Eğer zaten giriş yapılmışsa feed'e yönlendir
    if (accessToken && user && capabilities) {
      if (!capabilities.roles || capabilities.roles.length === 0) {
        router.push('/select-role')
      } else {
        const route = getDashboardRouteFromUser({
          roles: capabilities.roles,
          isAdmin: user.isAdmin,
          capabilities,
        })
        router.push(route)
      }
    } else {
      // Giriş yapılmamışsa, eski auth state'i temizle (eğer varsa)
      // Bu, login sayfasına dönüldüğünde header'da eski kullanıcı görünmemesini sağlar
      if (user || accessToken) {
        clearAuth()
      }
      setIsChecking(false)
    }
  }, [accessToken, user, capabilities, router, clearAuth])


  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError('')
      const endpoint = mode === 'corporate' ? '/auth/register-corporate' : '/auth/register'
      
      // Boş string'leri undefined'a çevir (backend @IsOptional için)
      const payload = {
        email: data.email.trim(),
        username: data.username.trim(),
        password: data.password,
        ...(data.fullName && data.fullName.trim() ? { fullName: data.fullName.trim() } : {}),
      }
      
      // Debug: Gönderilen datayı logla
      console.log('REGISTER DATA:', payload)
      console.log('Endpoint:', endpoint)
      
      const response = await api.post(endpoint, payload)
      const {
        user: registeredUser,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        capabilities: caps,
        sidebar,
      } = response.data
      setAuth(registeredUser, newAccessToken, newRefreshToken, caps ?? null, sidebar ?? null)

      if (!caps || !caps.roles || caps.roles.length === 0) {
        router.push('/select-role')
      } else {
        const route = getDashboardRouteFromUser({
          roles: caps.roles,
          isAdmin: registeredUser.isAdmin,
          capabilities: caps,
        })
        router.push(route)
      }
    } catch (err: any) {
      // Debug: Hata detaylarını logla
      console.error('REGISTER ERROR:', err)
      console.error('Error response:', err?.response?.data)
      console.error('Error status:', err?.response?.status)
      
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      
      // Validation hatalarını daha detaylı göster
      if (err?.response?.data?.message && Array.isArray(err.response.data.message)) {
        const validationErrors = err.response.data.message.map((msg: string) => msg).join(', ')
        setError(`Validation hatası: ${validationErrors}`)
      }
    }
  }

  // Auth kontrolü yapılırken loading göster
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow transition-colors">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Create your account
          </h2>
          {/* Mode Tabs */}
          <div className="flex justify-center mt-4 mb-2 border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setMode('user')}
              className={`px-6 py-2 text-sm font-medium ${
                mode === 'user'
                  ? 'text-[#ff7b00] border-b-2 border-[#ff7b00]'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Kullanıcı Kaydı
            </button>
            <button
              type="button"
              onClick={() => setMode('corporate')}
              className={`px-6 py-2 text-sm font-medium ${
                mode === 'corporate'
                  ? 'text-[#ff7b00] border-b-2 border-[#ff7b00]'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Kurumsal Kayıt
            </button>
          </div>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          {error && (
            <div className="mb-4 rounded-xl bg-red-900/60 dark:bg-red-900/40 border border-red-500/60 dark:border-red-500/40 px-4 py-3 text-sm text-red-100 dark:text-red-200">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                {...registerField('email')}
                type="email"
                inputMode="email"
                autoComplete="email"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </label>
              <input
                {...registerField('username')}
                type="text"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name (optional)
              </label>
              <input
                {...registerField('fullName')}
                type="text"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Full Name"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                {...registerField('password')}
                type="password"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#ff7b00] hover:bg-[#e36f00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff7b00] disabled:opacity-50"
            >
              {isSubmitting ? 'Creating account...' : mode === 'corporate' ? 'Kurumsal Kayıt Oluştur' : 'Kayıt Ol'}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/login"
              className="text-[#ff7b00] dark:text-[#ff7b00] hover:text-[#e36f00] dark:hover:text-[#e36f00] text-sm"
            >
              Already have an account? Sign in
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}

