'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sun, Moon, X } from 'lucide-react'
import Image from 'next/image'
import api, { getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { getDashboardRouteFromUser } from '@/lib/role-utils'

const unicodeEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'E-posta veya kullanıcı adı gerekli'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const registerSchema = z.object({
  username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır'),
  email: z.string().regex(unicodeEmailRegex, 'Lütfen geçerli bir e-posta adresi girin.'),
  password: z.string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Şifre en az bir harf ve bir rakam içermelidir'),
  fullName: z.string().optional(),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

export default function LoginPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { setAuth, accessToken, refreshToken, user, capabilities } = useAuthStore()
  const [errorState, setErrorStateRaw] = useState('')
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false) // 🔥 Manuel loading state (sonsuz loading'i önle)
  const [termsAccepted, setTermsAccepted] = useState(false) // ✅ Kullanıcı sözleşmesi onayı
  const [showTerms, setShowTerms] = useState(false) // ✅ Sözleşme alanını göster/gizle
  const [isSuspendedError, setIsSuspendedError] = useState(false) // 🔒 Askıya alınan hesap hatası mı?
  const [suspendedErrorMessage, setSuspendedErrorMessage] = useState('') // 🔒 Askıya alınan hesap hatası mesajını sakla
  
  // 🔒 useRef ile güncel değerleri sakla (closure sorununu önlemek için)
  const isSuspendedErrorRef = useRef(false)
  const suspendedErrorMessageRef = useRef('')
  
  // Ref'leri güncelle
  useEffect(() => {
    isSuspendedErrorRef.current = isSuspendedError
    suspendedErrorMessageRef.current = suspendedErrorMessage
  }, [isSuspendedError, suspendedErrorMessage])
  
  // 🔒 Askıya alınan hesap hatası için korumalı setErrorState - doğrudan engelleme
  const setErrorState = (message: string) => {
    // Eğer askıya alınan hesap hatası varsa ve mesaj temizlenmek isteniyorsa, engelle
    // useRef kullan (closure sorununu önlemek için)
    if (message === '' && isSuspendedErrorRef.current && suspendedErrorMessageRef.current) {
      console.log('[Login] 🔒 Askıya alınan hesap hatası korunuyor - setErrorState engellendi')
      return // Askıya alınan hesap hatasını koru - hiçbir şey yapma
    }
    setErrorStateRaw(message)
  }
  
  // 🔒 Askıya alınan hesap hatası için korumalı setError - doğrudan engelleme
  const setError = (message: string) => {
    // Eğer askıya alınan hesap hatası varsa ve mesaj temizlenmek isteniyorsa, engelle
    // useRef kullan (closure sorununu önlemek için)
    if (message === '' && isSuspendedErrorRef.current && suspendedErrorMessageRef.current) {
      console.log('[Login] 🔒 Askıya alınan hesap hatası korunuyor - setError engellendi')
      return // Askıya alınan hesap hatasını koru - hiçbir şey yapma
    }
    setErrorStateRaw(message)
  }
  
  // error state'ini expose et
  const error = errorState
  

  const handlePostAuthNavigation = (
    currentUser = user,
    currentCaps = capabilities,
    needsRoleSelection?: boolean,
  ) => {
    // 🔒 Askıya alınan hesap hatası varsa, redirect yapma (mesajın kaybolmaması için)
    if (isSuspendedErrorRef.current) {
      console.log('[Login] 🔒 Askıya alınan hesap hatası var - handlePostAuthNavigation engellendi')
      setIsChecking(false)
      return
    }
    
    // 🔥 KRİTİK: Her durumda loading'i kapat
    setIsChecking(false)
    
    if (!currentUser) {
      return
    }

    // 🔥 KRİTİK: Profil sayfasındayken hiçbir redirect yapma
    if (pathname.startsWith('/profile')) {
      return
    }

    // SADECE root (/) veya /login sayfalarında redirect yap
    // Diğer sayfalarda (ör. /profile/me) refresh yapıldığında bu çalışmamalı
    const isRootOrLogin = pathname === '/' || pathname === '/login'
    
    if (!isRootOrLogin) {
      return
    }

    const shouldSelectRole =
      typeof needsRoleSelection === 'boolean'
        ? needsRoleSelection
        : (currentUser.roles?.length ?? 0) === 0

    if (shouldSelectRole) {
      router.replace('/select-role')
      return
    }

    const route =
      getDashboardRouteFromUser({
        roles: currentCaps?.roles ?? currentUser.roles,
        isAdmin: currentUser.isAdmin,
        capabilities: currentCaps ?? undefined,
      }) || '/feed'

    router.replace(route || '/feed')
  }

  // Sistem temasını algıla ve localStorage'dan oku
  useEffect(() => {
    // 🔥 KRİTİK: Client-side kontrolü
    if (typeof window === 'undefined') return
    
    try {
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
    } catch (err) {
      console.warn('Theme initialization error:', err)
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

  // Eğer zaten giriş yapılmışsa feed'e yönlendir
  useEffect(() => {
    // Login işlemi devam ediyorsa kontrol yapma
    if (isLoggingIn) {
      return
    }
    
    // Login sayfasında değilsek kontrol yapma
    if (pathname !== '/login') {
      return
    }
    
    // Token kontrolü
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const hasToken = accessToken || tokenFromStorage
    
    // Token yoksa çık
    if (!hasToken) {
      return
    }
    
    // Token varsa ve user varsa feed'e yönlendir
    if (hasToken && user) {
      const needsRoleSelection = !user.roles || user.roles.length === 0
      const redirectRoute = needsRoleSelection ? '/select-role' : '/feed'
      window.location.href = redirectRoute
    } else if (hasToken && !user) {
      // Token var ama user yok - feed'e yönlendir
      window.location.href = '/feed'
    }
  }, [accessToken, user, pathname, isLoggingIn])

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onLogin = async (data: LoginForm) => {
    // 🔒 Reset
    setError('')
    setIsLoggingIn(true)
    setIsSuspendedError(false)
    setSuspendedErrorMessage('')
    
    try {
      const response = await api.post('/auth/login', {
        emailOrUsername: data.emailOrUsername.trim(),
        password: data.password,
      })
      
      // ✅ BAŞARILI LOGIN
      const {
        user: loggedUser,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        capabilities: caps,
        sidebar,
        needsRoleSelection,
      } = response.data

      if (!newAccessToken || !loggedUser) {
        setError('Giriş başarısız. Lütfen tekrar deneyin.')
        setIsLoggingIn(false)
        return
      }

      // 🔥 1. Token'ı localStorage'a kaydet (öncelikli)
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', newAccessToken)
      }

      // 🔥 2. Axios header'ı manuel set et (interceptor'dan önce)
      api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`

      // 🔥 3. Store'u güncelle
      setAuth(loggedUser, newAccessToken, newRefreshToken, caps ?? null, sidebar ?? null)

      // 🔥 4. Redirect - router.push kullan (sayfa yenileme yok)
      const redirectRoute = needsRoleSelection ? '/select-role' : '/feed'
      
      // Kısa bir delay ile redirect (store'un güncellenmesi için)
      setTimeout(() => {
        router.push(redirectRoute)
      }, 100)
      
    } catch (err: any) {
      // 🔐 401 = NORMAL LOGIN HATASI (şifre yanlış)
      if (err?.response?.status === 401) {
        setError('E-posta adresi veya şifre hatalı.')
        setIsLoggingIn(false)
        return
      }
      
      // 🔒 403 = Hesap askıya alınmış
      if (err?.response?.status === 403 && err?.response?.data?.code === 'ACCOUNT_SUSPENDED') {
        const suspensionData = err.response.data
        const untilDate = suspensionData.until ? new Date(suspensionData.until) : null
        const daysRemaining = untilDate ? Math.ceil((untilDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
        
        let message = `Hesabınız askıya alınmıştır. Giriş yapamazsınız.\n\nNeden: ${suspensionData.reason || 'Belirtilmemiş'}`
        if (daysRemaining !== null && daysRemaining > 0) {
          message += `\n\nAskı süresi: ${daysRemaining === 1 ? '1 gün' : `${daysRemaining} gün`} sonra dolacak.`
        } else if (!untilDate) {
          message += '\n\nAskı süresi: Süresiz'
        }
        
        setError(message)
        setIsSuspendedError(true)
        setSuspendedErrorMessage(message)
        setIsLoggingIn(false)
        return
      }
      
      // Network/Connection hatası
      if (!err?.response) {
        if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error' || err?.message?.includes('Network')) {
          setError('Sunucuya bağlanılamadı. Lütfen backend\'in çalıştığından emin olun ve tekrar deneyin.')
          setIsLoggingIn(false)
          return
        }
        if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
          setError('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.')
          setIsLoggingIn(false)
          return
        }
        setError('Bağlantı hatası oluştu. Lütfen tekrar deneyin.')
        setIsLoggingIn(false)
        return
      }
      
      // Diğer hatalar
      const errorMessage = getErrorMessage(err, { isLogin: true })
      setError(errorMessage)
      setIsLoggingIn(false)
    }
  }

  const onRegister = async (data: RegisterForm) => {
    try {
      setError('')
      
      // Backend DTO ile TAM UYUMLU request body
      // Backend DTO: email, username, password, fullName (optional), termsAccepted (required boolean)
      const requestBody: any = {
        email: data.email.trim(),
        username: data.username.trim().toLowerCase(),
        password: data.password,
        termsAccepted: true, // Backend'de zorunlu boolean - kesinlikle true olmalı
      }
      
      // fullName sadece varsa ve boş değilse ekle (undefined gönderme)
      const fullNameTrimmed = data.fullName?.trim()
      if (fullNameTrimmed && fullNameTrimmed.length > 0) {
        requestBody.fullName = fullNameTrimmed
      }
      
      console.log('[REGISTER] Request body:', JSON.stringify({ ...requestBody, password: '***' }, null, 2))
      console.log('[REGISTER] Request body types:', {
        email: typeof requestBody.email + ' = ' + requestBody.email,
        username: typeof requestBody.username + ' = ' + requestBody.username,
        password: typeof requestBody.password + ' (length: ' + requestBody.password.length + ')',
        fullName: requestBody.fullName ? typeof requestBody.fullName + ' = ' + requestBody.fullName : 'undefined',
        termsAccepted: typeof requestBody.termsAccepted + ' = ' + requestBody.termsAccepted,
      })
      
      const response = await api.post('/auth/register', requestBody)
      const {
        user: registeredUser,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        capabilities: caps,
        sidebar,
        needsRoleSelection,
      } = response.data

      // Token'ı localStorage'a kaydet
      if (typeof window !== 'undefined' && newAccessToken) {
        localStorage.setItem('access_token', newAccessToken)
      }

      setAuth(registeredUser, newAccessToken, newRefreshToken, caps ?? null, sidebar ?? null)
      
      // Hemen redirect yap
      if (needsRoleSelection) {
        router.replace('/select-role')
      } else {
        const route = getDashboardRouteFromUser({
          roles: caps?.roles ?? registeredUser.roles,
          isAdmin: registeredUser.isAdmin,
          capabilities: caps ?? undefined,
        }) || '/feed'
        router.replace(route)
      }
    } catch (err: any) {
      // Detaylı error logging
      // Detaylı error logging - tüm olasılıkları kontrol et
      console.error('Register error:', err)
      console.error('Register error.response:', err?.response)
      console.error('Register error.response?.data:', err?.response?.data)
      console.error('Register error.response?.data type:', typeof err?.response?.data)
      console.error('Register error.response?.data is empty?', err?.response?.data && Object.keys(err?.response?.data).length === 0)
      console.error('Register error.response?.data keys:', err?.response?.data ? Object.keys(err?.response?.data) : 'no data')
      console.error('Register error.response?.data JSON:', err?.response?.data ? JSON.stringify(err?.response?.data, null, 2) : 'no data')
      console.error('Register error full response:', {
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        data: err?.response?.data,
        dataString: err?.response?.data ? JSON.stringify(err?.response?.data) : 'no data',
        headers: err?.response?.headers,
        config: {
          url: err?.config?.url,
          method: err?.config?.method,
          data: err?.config?.data ? JSON.parse(err?.config?.data) : 'no data',
        }
      })
      
      // 400 Bad Request - validation hatası
      if (err?.response?.status === 400) {
        const responseData = err?.response?.data || {}
        
        console.log('[REGISTER] 400 Error - Full responseData:', JSON.stringify(responseData, null, 2))
        
        // Backend AllExceptionsFilter formatı: { message, errors, statusCode, ... }
        let errorMessage = 'Kayıt bilgileri geçersiz. Lütfen tüm alanları kontrol edin.'
        
        if (responseData?.message) {
          // message string veya array olabilir
          if (Array.isArray(responseData.message)) {
            errorMessage = responseData.message[0] || errorMessage
          } else if (typeof responseData.message === 'string') {
            errorMessage = responseData.message
          }
        } else if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
          // Validation errors array
          errorMessage = responseData.errors[0]
        } else if (Object.keys(responseData).length === 0) {
          // Boş response - muhtemelen validation hatası ama mesaj gelmedi
          errorMessage = 'Kayıt bilgileri geçersiz. Lütfen email formatını, kullanıcı adını (min 3 karakter) ve şifreyi (min 8 karakter, harf+rakam) kontrol edin.'
        }
        
        setError(errorMessage)
        return
      }
      
      // Diğer hatalar
      setError(getErrorMessage(err))
    }
  }


  // 🔥 Güvenlik: isLoggingIn 10 saniyeden fazla sürerse otomatik kapat
  useEffect(() => {
    if (isLoggingIn) {
      const timeout = setTimeout(() => {
        console.warn('[LOGIN] ⚠️ Login işlemi 10 saniyeden fazla sürdü, loading state kapatılıyor')
        setIsLoggingIn(false)
      }, 10000) // 10 saniye timeout
      
      return () => clearTimeout(timeout)
    }
  }, [isLoggingIn])

  // Auth kontrolü yapılırken loading göster
  // isChecking kaldırıldı - gereksiz loading state

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
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.png"
              alt="Feellink Logo"
              width={130}
              height={50}
              className="object-contain"
            />
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
                // 🔒 Askıya alınan hesap hatası varsa temizleme
                if (!isSuspendedError) {
                  setError('')
                }
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
                // 🔒 Askıya alınan hesap hatası varsa temizleme
                if (!isSuspendedError) {
                  setError('')
                }
                setTermsAccepted(false) // ✅ Checkbox'ı sıfırla
                setShowTerms(false) // ✅ Sözleşme alanını kapat
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
              {/* 🔒 GÜVENLİK: Tek bir güvenli hata mesajı (form üstünde) */}
              {error && (
                <div
                  className={`px-4 py-3 rounded-lg text-sm relative ${
                    darkMode
                      ? 'bg-red-900/20 border border-red-800 text-red-400'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                  role="alert"
                >
                  {/* 🔒 Askıya alınan hesap hatası için kapatma butonu */}
                  {isSuspendedError && (
                    <button
                      onClick={() => {
                        setError('')
                        setIsSuspendedError(false)
                        setSuspendedErrorMessage('') // 🔒 Mesajı da temizle
                      }}
                      className={`absolute top-2 right-2 p-1 rounded hover:opacity-70 transition-opacity ${
                        darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-700 hover:bg-red-100'
                      }`}
                      aria-label="Hata mesajını kapat"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <div className={isSuspendedError ? 'pr-6' : ''}>
                    {error.split('\n').map((line, idx) => (
                      <div key={idx} className={idx > 0 ? 'mt-1' : ''}>
                        {line}
                      </div>
                    ))}
                  </div>
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
                <div className="flex justify-end mt-2">
                  <a
                    href="/forgot-password"
                    className={`text-xs transition-colors ${
                      darkMode
                        ? 'text-amber-400 hover:text-amber-300'
                        : 'text-[#ff7a00] hover:text-[#ff9500]'
                    }`}
                  >
                    Şifremi Unuttum?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2 bg-[#ff7a00] hover:bg-[#ff9500] text-white font-semibold rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
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

              {/* ✅ Kullanıcı Sözleşmesi Checkbox ve Inline Sözleşme */}
              <div className="space-y-3">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="termsAccepted"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className={`mt-1 h-4 w-4 text-[#ff7a00] focus:ring-[#ff7a00] border-gray-300 dark:border-gray-600 rounded ${
                      darkMode ? 'bg-[#0d0d0d] border-[#2b2b2b]' : 'bg-white'
                    }`}
                  />
                  <label
                    htmlFor="termsAccepted"
                    className={`ml-2 text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setShowTerms(!showTerms)}
                      className="text-[#ff7a00] hover:text-[#ff9500] underline"
                    >
                      Kullanıcı Sözleşmesini
                    </button>
                    {' '}okudum ve kabul ediyorum.
                  </label>
                </div>

                {/* ✅ Inline Sözleşme Alanı */}
                {showTerms && (
                  <div
                    className={`rounded-lg border p-4 ${
                      darkMode
                        ? 'bg-[#0d0d0d] border-[#2b2b2b]'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    style={{ maxHeight: '280px', overflowY: 'auto' }}
                  >
                    <div className="space-y-4 text-sm">
                      <div>
                        <h3 className={`font-semibold mb-2 ${
                          darkMode ? 'text-gray-200' : 'text-gray-900'
                        }`}>
                          FEELLINK KULLANICI SÖZLEŞMESİ
                        </h3>
                        <p className={`text-xs ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Son güncelleme tarihi: 28 Aralık 2025
                        </p>
                      </div>

                      <div>
                        <h4 className={`font-medium mb-1 ${
                          darkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>
                          Taraflar ve Kapsam
                        </h4>
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Bu Kullanıcı Sözleşmesi ("Sözleşme"), Feellink platformunu kullanan gerçek kişiler ("Kullanıcı") ile Feellink arasında, platformun kullanım şartlarını belirlemek amacıyla düzenlenmiştir. Feellink'e kayıt olan her kullanıcı, bu sözleşmeyi okuduğunu, anladığını ve kabul ettiğini beyan eder.
                        </p>
                      </div>

                      <div>
                        <h4 className={`font-medium mb-1 ${
                          darkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>
                          Hizmet Tanımı
                        </h4>
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Feellink; sanat eserlerinin paylaşılabildiği, koleksiyonların oluşturulabildiği, ilan ve etkinliklerin yayınlanabildiği, kullanıcılar arasında etkileşim kurulmasını sağlayan dijital bir sanat ve kültür platformudur.
                        </p>
                      </div>

                      <div>
                        <h4 className={`font-medium mb-1 ${
                          darkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>
                          Kullanıcı Yükümlülükleri
                        </h4>
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Kullanıcılar: Platformu hukuka ve dürüstlük kurallarına uygun şekilde kullanmayı, kendilerine ait olmayan içerikleri izinsiz paylaşmamayı, diğer kullanıcıların haklarını ihlal etmemeyi, platformun işleyişini bozacak davranışlardan kaçınmayı kabul eder.
                        </p>
                      </div>

                      <div>
                        <h4 className={`font-medium mb-1 ${
                          darkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>
                          Hesap Güvenliği
                        </h4>
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Feellink, kullanıcı hesaplarının güvenliği için gerekli teknik ve idari önlemleri alır. Kullanıcılar ise hesap bilgilerini gizli tutmakla yükümlüdür. Kullanıcının kendi ihmali sonucu üçüncü kişilerin hesaba erişim sağlamasından doğabilecek zararlardan Feellink sorumlu tutulamaz.
                        </p>
                      </div>

                      <div>
                        <h4 className={`font-medium mb-1 ${
                          darkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>
                          İçerikler ve Paylaşımlar
                        </h4>
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Kullanıcılar tarafından paylaşılan içeriklerin hukuki sorumluluğu ilgili kullanıcıya aittir. Feellink, hukuka aykırı veya platform kurallarına uygun olmayan içerikleri kaldırma veya erişimini sınırlandırma hakkını saklı tutar.
                        </p>
                      </div>

                      <div>
                        <h4 className={`font-medium mb-1 ${
                          darkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>
                          Hizmette Değişiklikler
                        </h4>
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Feellink, platformun işleyişini geliştirmek amacıyla teknik ve içeriksel değişiklikler yapabilir. Bu değişiklikler kullanıcı deneyimini iyileştirmeye yöneliktir.
                        </p>
                      </div>

                      <div>
                        <h4 className={`font-medium mb-1 ${
                          darkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>
                          Yürürlük
                        </h4>
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Bu sözleşme, kullanıcının kayıt sırasında onay vermesiyle yürürlüğe girer.
                        </p>
                      </div>

                      <div className={`mt-4 p-3 rounded ${
                        darkMode ? 'bg-orange-900/20 border border-orange-800' : 'bg-orange-50 border border-orange-200'
                      }`}>
                        <p className={`text-xs font-medium ${
                          darkMode ? 'text-orange-200' : 'text-orange-900'
                        }`}>
                          Onay Metni:
                        </p>
                        <p className={`text-xs mt-1 ${
                          darkMode ? 'text-orange-300' : 'text-orange-800'
                        }`}>
                          "Feellink Kullanıcı Sözleşmesini okudum, anladım ve kabul ediyorum."
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={registerForm.formState.isSubmitting || !termsAccepted}
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
                    // 🔒 Askıya alınan hesap hatası varsa temizleme
                    if (!isSuspendedError) {
                      setError('')
                    }
                    setTermsAccepted(false) // ✅ Checkbox'ı sıfırla
                    setShowTerms(false) // ✅ Sözleşme alanını kapat
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
                    // 🔒 Askıya alınan hesap hatası varsa temizleme
                    if (!isSuspendedError) {
                      setError('')
                    }
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
