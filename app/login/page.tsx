'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { setAuth, accessToken, user } = useAuthStore()
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(true)
  const [mode, setMode] = useState<'user' | 'corporate'>('user')

  // Eğer zaten giriş yapılmışsa feed'e yönlendir
  useEffect(() => {
    if (accessToken && user) {
      router.push('/feed')
    } else {
      setIsChecking(false)
    }
  }, [accessToken, user, router])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('')
      const endpoint = mode === 'corporate' ? '/auth/login-corporate' : '/auth/login'
      const response = await api.post(endpoint, data)
      setAuth(
        response.data.user,
        response.data.accessToken,
        response.data.refreshToken
      )
      // All users go to feed for now (collections page will be created later)
      router.push('/feed')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed')
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
            Sign in to your account
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
              Kullanıcı Girişi
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
              Kurumsal Giriş
            </button>
          </div>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                {...register('username')}
                type="text"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username or Email"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
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
              {isSubmitting ? 'Signing in...' : mode === 'corporate' ? 'Kurumsal Giriş Yap' : 'Giriş Yap'}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/register"
              className="text-[#ff7b00] dark:text-[#ff7b00] hover:text-[#e36f00] dark:hover:text-[#e36f00] text-sm"
            >
              Don't have an account? Sign up
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}

