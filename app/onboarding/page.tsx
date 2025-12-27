'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { TR_CITIES } from '@/constants/cities.tr'

type Gender = 'FEMALE' | 'MALE' | 'UNSPECIFIED'

interface Country {
  code: string
  name: string
  cities: string[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [countries, setCountries] = useState<Country[]>([])

  // Form state
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [country, setCountry] = useState<string | null>(null)
  const [city, setCity] = useState<string | null>(null)
  const [gender, setGender] = useState<Gender | ''>('')
  const [gdprConsent, setGdprConsent] = useState(false)
  const [analyticsConsent, setAnalyticsConsent] = useState(false)

  // Load countries data
  useEffect(() => {
    fetch('/data/countries.json')
      .then((res) => res.json())
      .then((data) => setCountries(data))
      .catch((err) => {
        console.error('Error loading countries:', err)
        toast.error('Ülke listesi yüklenemedi')
      })
  }, [])

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      // Validation - tüm alanlar zorunlu
      if (!dateOfBirth || !country || !city || !gender) {
        toast.error('Lütfen tüm alanları doldurun')
        return
      }

      // Age validation
      const birthDate = new Date(dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }

      if (age < 13) {
        toast.error('Feellink\'i kullanmak için en az 13 yaşında olmalısınız.')
        return
      }

      setStep(3)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    if (!gdprConsent) {
      toast.error('Kişisel verilerin işlenmesi için onay gereklidir')
      return
    }

    setIsSubmitting(true)
    try {
      // 🔒 Validation - tüm alanlar zorunlu
      if (!dateOfBirth || !country || !city || !gender) {
        toast.error('Lütfen tüm alanları doldurun')
        return
      }

      const response = await api.post('/users/me/complete-onboarding', {
        dateOfBirth,
        country,
        city,
        gender,
        gdprConsent,
        analyticsConsent,
      })

      if (response.data?.user) {
        // 🔒 KRİTİK: User state'ini güncelle - UI'ın eski veriyi göstermesini önle
        setUser(response.data.user)
        toast.success('Profil başarıyla tamamlandı!')
        router.push('/feed')
      } else {
        throw new Error('Kullanıcı bilgisi alınamadı')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Profil tamamlanırken bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--sub)]">Adım {step} / 3</span>
            <span className="text-sm text-[var(--sub)]">{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-[#ff7b00] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="bg-[var(--panel)] rounded-2xl shadow-lg border border-[var(--border)] p-8 text-center">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
                Hoş geldin, {user?.username} 👋
              </h1>
              <p className="text-[var(--sub)] text-lg">
                Feellink'te deneyimini kişiselleştirebilmemiz için
                <br />
                kısa bir adımı birlikte tamamlayalım.
              </p>
            </div>
            <button
              onClick={handleNext}
              className="w-full bg-[#ff7b00] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#ff7b00]/90 transition-colors flex items-center justify-center gap-2"
            >
              Başlayalım
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Step 2: Personal Information */}
        {step === 2 && (
          <div className="bg-[var(--panel)] rounded-2xl shadow-lg border border-[var(--border)] p-8">
            <h2 className="text-2xl font-bold text-[var(--text)] mb-6">Kişisel Bilgiler</h2>
            
            <div className="space-y-6">
              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Doğum Tarihi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#ff7b00]"
                  required
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Ülke <span className="text-red-500">*</span>
                </label>
                <select
                  value={country ?? ''}
                  onChange={(e) => {
                    setCountry(e.target.value || null)
                    setCity(null) // 🔒 Ülke değişince şehir sıfırlanır
                  }}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#ff7b00]"
                  required
                >
                  <option value="" disabled>Ülke seçin</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Şehir <span className="text-red-500">*</span>
                </label>
                <select
                  value={city ?? ''}
                  onChange={(e) => setCity(e.target.value || null)}
                  disabled={!country}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#ff7b00] disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                >
                  <option value="" disabled>
                    {country ? 'Şehir seçin' : 'Önce ülke seçin'}
                  </option>
                  {country === 'TR' ? (
                    // 🇹🇷 Türkiye için 81 il listesi (sabit, filtreleme yok)
                    (() => {
                      // 🔍 Console test
                      console.log('[Onboarding] TR_CITIES length:', TR_CITIES.length)
                      console.log('[Onboarding] TR_CITIES:', TR_CITIES)
                      return TR_CITIES.map((cityName) => (
                        <option key={cityName} value={cityName}>
                          {cityName}
                        </option>
                      ))
                    })()
                  ) : (
                    // Diğer ülkeler için countries.json'dan
                    country &&
                    countries
                      .find((c) => c.code === country)
                      ?.cities.map((cityName) => (
                        <option key={cityName} value={cityName}>
                          {cityName}
                        </option>
                      ))
                  )}
                </select>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Cinsiyet <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'FEMALE', label: 'Kadın' },
                    { value: 'MALE', label: 'Erkek' },
                    { value: 'UNSPECIFIED', label: 'Belirtmek istemiyorum' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-4 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--muted)] transition-colors"
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={option.value}
                        checked={gender === option.value}
                        onChange={(e) => setGender(e.target.value as Gender)}
                        className="w-4 h-4 text-[#ff7b00] focus:ring-[#ff7b00]"
                      />
                      <span className="text-[var(--text)]">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleBack}
                className="flex-1 px-6 py-3 border border-[var(--border)] rounded-lg text-[var(--text)] hover:bg-[var(--muted)] transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={20} />
                Geri
              </button>
              <button
                onClick={handleNext}
                disabled={!dateOfBirth || !country || !city || !gender}
                className="flex-1 bg-[#ff7b00] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#ff7b00]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Devam Et
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: GDPR Consent */}
        {step === 3 && (
          <div className="bg-[var(--panel)] rounded-2xl shadow-lg border border-[var(--border)] p-8">
            <h2 className="text-2xl font-bold text-[var(--text)] mb-6">Açık Rıza & Amaç Bildirimi</h2>
            
            <div className="mb-6">
              <p className="text-[var(--sub)] leading-relaxed">
                Feellink'te deneyimini kişiselleştirmek,
                yaşa ve konuma dayalı içerik sunabilmek için
                bu bilgileri işliyoruz.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {/* GDPR Consent (Required) */}
              <label className="flex items-start gap-3 p-4 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--muted)] transition-colors">
                <input
                  type="checkbox"
                  checked={gdprConsent}
                  onChange={(e) => setGdprConsent(e.target.checked)}
                  className="mt-1 w-5 h-5 text-[#ff7b00] focus:ring-[#ff7b00] rounded"
                  required
                />
                <div className="flex-1">
                  <span className="text-[var(--text)] font-medium">
                    Kişisel verilerimin bu amaçlarla işlenmesini kabul ediyorum.{' '}
                    <span className="text-red-500">*</span>
                  </span>
                  <div className="mt-2 text-sm text-[var(--sub)]">
                    <a href="/privacy" target="_blank" className="text-[#ff7b00] hover:underline">
                      KVKK & GDPR Aydınlatma Metni
                    </a>
                    {' · '}
                    <a href="/privacy" target="_blank" className="text-[#ff7b00] hover:underline">
                      Gizlilik Politikası
                    </a>
                  </div>
                </div>
              </label>

              {/* Analytics Consent (Optional) */}
              <label className="flex items-start gap-3 p-4 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--muted)] transition-colors">
                <input
                  type="checkbox"
                  checked={analyticsConsent}
                  onChange={(e) => setAnalyticsConsent(e.target.checked)}
                  className="mt-1 w-5 h-5 text-[#ff7b00] focus:ring-[#ff7b00] rounded"
                />
                <div className="flex-1">
                  <span className="text-[var(--text)]">
                    Analiz ve ürün geliştirme için anonim olarak kullanılabilir. (Opsiyonel)
                  </span>
                </div>
              </label>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleBack}
                className="flex-1 px-6 py-3 border border-[var(--border)] rounded-lg text-[var(--text)] hover:bg-[var(--muted)] transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={20} />
                Geri
              </button>
              <button
                onClick={handleSubmit}
                disabled={!gdprConsent || isSubmitting}
                className="flex-1 bg-[#ff7b00] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#ff7b00]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Tamamlanıyor...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Tamamla
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

