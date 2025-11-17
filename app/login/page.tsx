'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sun, Moon } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { getDashboardRouteFromUser } from '@/lib/role-utils'

const unicodeEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'E-posta veya kullanıcı adı gerekli'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().regex(unicodeEmailRegex, 'Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().optional(),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

export default function LoginPage() {
  const router = useRouter()
  const { setAuth, accessToken, refreshToken, user, capabilities } = useAuthStore()
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(true)
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const handlePostAuthNavigation = (
    currentUser = user,
    currentCaps = capabilities,
    needsRoleSelection?: boolean,
  ) => {
    if (!currentUser) {
      setIsChecking(false)
      return
    }

    const shouldSelectRole =
      typeof needsRoleSelection === 'boolean'
        ? needsRoleSelection
        : (currentUser.roles?.length ?? 0) === 0

    if (shouldSelectRole) {
      router.replace('/select-role')
      setIsChecking(false)
      return
    }

    const route =
      getDashboardRouteFromUser({
        roles: currentCaps?.roles ?? currentUser.roles,
        isAdmin: currentUser.isAdmin,
        capabilities: currentCaps ?? undefined,
      }) || '/feed'

    router.replace(route || '/feed')
    setIsChecking(false)
  }

  // Sistem temasını algıla ve localStorage'dan oku
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    const initialDarkMode = savedTheme 
      ? savedTheme === 'dark' 
      : prefersDark
    
    setDarkMode(initialDarkMode)
    
    if (initialDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Dark mode değiştiğinde class'ı güncelle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  // Eğer zaten giriş yapılmışsa role göre yönlendir
  useEffect(() => {
    if (accessToken && user) {
      handlePostAuthNavigation(user, capabilities ?? undefined)
    } else {
      setIsChecking(false)
    }
  }, [accessToken, user, capabilities, router])

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onLogin = async (data: LoginForm) => {
    try {
      setError('')
      const response = await api.post('/auth/login', {
        emailOrUsername: data.emailOrUsername.trim(),
        password: data.password,
      })
      const {
        user: loggedUser,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        capabilities: caps,
        sidebar,
        needsRoleSelection,
      } = response.data

      setAuth(loggedUser, newAccessToken, newRefreshToken, caps ?? null, sidebar ?? null)

      handlePostAuthNavigation(loggedUser, caps ?? undefined, needsRoleSelection)
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Giriş başarısız'
      setError(message)
    }
  }

  const onRegister = async (data: RegisterForm) => {
    try {
      setError('')
      // Birleşik register endpoint'i kullan
      const response = await api.post('/auth/register', data)
      const {
        user: registeredUser,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        capabilities: caps,
        sidebar,
        needsRoleSelection,
      } = response.data

      setAuth(registeredUser, newAccessToken, newRefreshToken, caps ?? null, sidebar ?? null)
      handlePostAuthNavigation(registeredUser, caps ?? undefined, needsRoleSelection)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kayıt başarısız oldu')
    }
  }


  // Auth kontrolü yapılırken loading göster
  if (isChecking) {
    return (
      <div
        className={`fixed inset-0 flex items-center justify-center transition-all duration-500 overflow-hidden ${
          darkMode
            ? 'bg-[#0b0b0b] text-gray-100'
            : 'bg-[#f9f9f9] text-gray-800'
        }`}
      >
        {darkMode && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,122,0,0.04),transparent_80%)] pointer-events-none" />
        )}
        <div className="relative z-10 animate-spin rounded-full h-10 w-10 border-b-2 border-[#ff7b00]"></div>
      </div>
    )
  }

  return (
    <>
      <div
        className={`fixed inset-0 flex items-center justify-center transition-all duration-500 overflow-hidden p-4 ${
          darkMode
            ? 'bg-[#0b0b0b] text-gray-100'
            : 'bg-[#f9f9f9] text-gray-800'
        }`}
      >
        {/* Background Glow sadece DARK modda */}
        {darkMode && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,122,0,0.04),transparent_80%)] pointer-events-none" />
        )}

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`absolute top-6 right-6 p-2.5 rounded-full shadow-md hover:scale-105 hover:shadow-xl transition-all duration-300 z-10 group ${
            darkMode
              ? 'bg-[#1e1e1e]'
              : 'bg-white border border-gray-200'
          }`}
          title={darkMode ? 'Light Mode' : 'Dark Mode'}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-[#ff9500] transition-all duration-300 group-hover:rotate-90" />
          ) : (
            <Moon className="w-5 h-5 text-[#ff7a00] transition-all duration-300 group-hover:rotate-[-15deg]" />
          )}
        </button>

        {/* Login/Register Kartı */}
        <div
          className={`relative z-10 w-full max-w-md rounded-2xl p-10 transition-all duration-500 ${
            darkMode
              ? 'bg-[#111]/95 backdrop-blur-xl border border-[#1f1f1f] shadow-[0_0_40px_rgba(255,122,0,0.08)]'
              : 'bg-white border border-gray-200 shadow-[0_0_25px_rgba(0,0,0,0.05)]'
          }`}
        >
          {/* Logo veya Başlık */}
          <div className="text-center mb-8">
            <h1
              className={`text-3xl font-bold tracking-tight ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              <span className="text-[#ff7a00]">Feellink</span>{' '}
              {isLoginMode ? 'Giriş' : 'Kayıt'}
            </h1>
            <p
              className={`text-sm mt-1 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Duyguların teknolojiyle buluştuğu yere hoş geldin
            </p>
          </div>

          {/* Login/Register Toggle */}
          <div
            className={`flex justify-center mb-6 border-b ${
              darkMode ? 'border-[#1f1f1f]' : 'border-gray-200'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(true)
                setError('')
                loginForm.reset()
                registerForm.reset()
              }}
              className={`w-1/2 py-2.5 text-sm font-medium transition-all ${
                isLoginMode
                  ? 'text-[#ff7a00] border-b-2 border-[#ff7a00]'
                  : darkMode
                    ? 'text-gray-400 hover:text-[#ff7a00]'
                    : 'text-gray-500 hover:text-[#ff7a00]'
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(false)
                setError('')
                loginForm.reset()
                registerForm.reset()
              }}
              className={`w-1/2 py-2.5 text-sm font-medium transition-all ${
                !isLoginMode
                  ? 'text-[#ff7a00] border-b-2 border-[#ff7a00]'
                  : darkMode
                    ? 'text-gray-400 hover:text-[#ff7a00]'
                    : 'text-gray-500 hover:text-[#ff7a00]'
              }`}
            >
              Kayıt Ol
            </button>
          </div>

          {/* Form */}
          {isLoginMode ? (
          <form
            className="space-y-5"
            onSubmit={loginForm.handleSubmit(onLogin)}
            noValidate
          >
              {error && (
                <div
                  className={`px-4 py-3 rounded-lg text-sm ${
                    darkMode
                      ? 'bg-red-900/20 border border-red-800 text-red-400'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  className={`block text-sm mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  E-posta veya Kullanıcı Adı
                </label>
                <input
                  {...loginForm.register('emailOrUsername')}
                  type="text"
                  placeholder="örnek@feellink.com"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ff7a00] focus:outline-none transition-all ${
                    darkMode
                      ? 'border-[#2b2b2b] bg-[#0d0d0d] text-gray-100 placeholder-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                  }`}
                />
                {loginForm.formState.errors.emailOrUsername && (
                  <p
                    className={`mt-1.5 text-sm ${
                      darkMode ? 'text-red-400' : 'text-red-600'
                    }`}
                  >
                    {loginForm.formState.errors.emailOrUsername.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  className={`block text-sm mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Şifre
                </label>
                <input
                  {...loginForm.register('password')}
                  type="password"
                  placeholder="********"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ff7a00] focus:outline-none transition-all ${
                    darkMode
                      ? 'border-[#2b2b2b] bg-[#0d0d0d] text-gray-100 placeholder-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                  }`}
                />
                {loginForm.formState.errors.password && (
                  <p
                    className={`mt-1.5 text-sm ${
                      darkMode ? 'text-red-400' : 'text-red-600'
                    }`}
                  >
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loginForm.formState.isSubmitting}
                className="w-full py-2 bg-[#ff7a00] hover:bg-[#ff9500] text-white font-semibold rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loginForm.formState.isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Giriş yapılıyor...</span>
                  </>
                ) : (
                  'Giriş Yap'
                )}
              </button>
            </form>
          ) : (
            <form
              className="space-y-5"
              onSubmit={registerForm.handleSubmit(onRegister)}
              noValidate
            >
              {error && (
                <div
                  className={`px-4 py-3 rounded-lg text-sm ${
                    darkMode
                      ? 'bg-red-900/20 border border-red-800 text-red-400'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  className={`block text-sm mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  E-posta
                </label>
                <input
                  {...registerForm.register('email')}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="örnek@feellink.com"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ff7a00] focus:outline-none transition-all ${
                    darkMode
                      ? 'border-[#2b2b2b] bg-[#0d0d0d] text-gray-100 placeholder-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                  }`}
                />
                {registerForm.formState.errors.email && (
                  <p
                    className={`mt-1.5 text-sm ${
                      darkMode ? 'text-red-400' : 'text-red-600'
                    }`}
                  >
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  className={`block text-sm mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Kullanıcı Adı
                </label>
                <input
                  {...registerForm.register('username')}
                  type="text"
                  placeholder="kullaniciadi"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ff7a00] focus:outline-none transition-all ${
                    darkMode
                      ? 'border-[#2b2b2b] bg-[#0d0d0d] text-gray-100 placeholder-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                  }`}
                />
                {registerForm.formState.errors.username && (
                  <p
                    className={`mt-1.5 text-sm ${
                      darkMode ? 'text-red-400' : 'text-red-600'
                    }`}
                  >
                    {registerForm.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  className={`block text-sm mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Ad Soyad (İsteğe Bağlı)
                </label>
                <input
                  {...registerForm.register('fullName')}
                  type="text"
                  placeholder="Ad Soyad"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ff7a00] focus:outline-none transition-all ${
                    darkMode
                      ? 'border-[#2b2b2b] bg-[#0d0d0d] text-gray-100 placeholder-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-sm mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Şifre
                </label>
                <input
                  {...registerForm.register('password')}
                  type="password"
                  placeholder="********"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ff7a00] focus:outline-none transition-all ${
                    darkMode
                      ? 'border-[#2b2b2b] bg-[#0d0d0d] text-gray-100 placeholder-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                  }`}
                />
                {registerForm.formState.errors.password && (
                  <p
                    className={`mt-1.5 text-sm ${
                      darkMode ? 'text-red-400' : 'text-red-600'
                    }`}
                  >
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={registerForm.formState.isSubmitting}
                className="w-full py-2 bg-[#ff7a00] hover:bg-[#ff9500] text-white font-semibold rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {registerForm.formState.isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Kayıt yapılıyor...</span>
                  </>
                ) : (
                  'Kayıt Ol'
                )}
              </button>
            </form>
          )}

          {/* Alt Kısım */}
          <p
            className={`text-center text-sm mt-6 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {isLoginMode ? (
              <>
                Hesabınız yok mu?{' '}
                <button
                  onClick={() => {
                    setIsLoginMode(false)
                    setError('')
                  }}
                  className="text-[#ff7a00] hover:underline transition-colors"
                >
                  Kayıt Ol
                </button>
              </>
            ) : (
              <>
                Zaten hesabınız var mı?{' '}
                <button
                  onClick={() => {
                    setIsLoginMode(true)
                    setError('')
                  }}
                  className="text-[#ff7a00] hover:underline transition-colors"
                >
                  Giriş Yap
                </button>
              </>
            )}
          </p>
        </div>
      </div>

    </>
  )
}
