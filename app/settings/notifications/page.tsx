'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

interface NotificationPreferences {
  mention: boolean
  follow: boolean
  like: boolean
  comment: boolean
}

function NotificationSettingsContent() {
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    mention: true,
    follow: true,
    like: true,
    comment: true,
  })
  const [isSaving, setIsSaving] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const loadPrefs = async () => {
      try {
        const response = await api.get('/notification-preferences')
        setPrefs({
          mention: response.data.mention ?? true,
          follow: response.data.follow ?? true,
          like: response.data.like ?? true,
          comment: response.data.comment ?? true,
        })
      } catch (error) {
        console.error('Failed to load notification preferences:', error)
        toast.error('Ayarlar yüklenemedi. Lütfen tekrar deneyin.')
      } finally {
        setLoading(false)
      }
    }

    loadPrefs()
  }, [accessToken])

  const debounceSave = useMemo(() => {
    return (next: NotificationPreferences, prev: NotificationPreferences) => {
      // Önceki timeout'u temizle
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Yeni timeout ayarla
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          setIsSaving(true)
          await api.patch('/notification-preferences', next)
          // Başarılı kaydetme için toast gösterme (kullanıcıyı rahatsız etmemek için)
        } catch (error) {
          console.error('Failed to save preferences:', error)
          // Hata durumunda eski state'e geri dön
          setPrefs(prev)
          toast.error('Ayarlar kaydedilemedi. Lütfen tekrar deneyin.')
        } finally {
          setIsSaving(false)
        }
      }, 400)
    }
  }, [])

  const updateSetting = (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return
    
    const prev = { ...prefs }
    const next = { ...prefs, [key]: value }
    
    // Optimistic update
    setPrefs(next)
    
    // Debounce ile kaydet
    debounceSave(next, prev)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  if (loading) {
    return (
      <main className="flex justify-center items-center min-h-screen pt-24 pb-16 px-6 bg-white dark:bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange"></div>
      </main>
    )
  }

  return (
    <main className="flex justify-center pt-24 pb-16 px-6 min-h-screen bg-white dark:bg-[#0a0a0a]">
      <div className="w-full max-w-[720px]">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-[#111] dark:text-white">Bildirim Ayarları</h1>
        </div>

        {/* Modern Card */}
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
          {/* Header Section */}
          <div className="px-6 py-5 border-b border-black/10 dark:border-white/10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bildirim Ayarları</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-white/60">
              Hangi bildirimleri almak istediğini seç. Değişiklikler otomatik kaydedilir.
            </p>
          </div>

          {/* Toggle Rows */}
          <div className="divide-y divide-black/10 dark:divide-white/10">
            <ToggleRow
              label="Etiketlenmeler"
              description="Seni bir yorumda etiketlediklerinde bildirim al"
              value={prefs.mention}
              onChange={() => updateSetting('mention', !prefs.mention)}
            />
            <ToggleRow
              label="Takip bildirimleri"
              description="Seni takip ettiklerinde veya takip isteği geldiğinde bildirim al"
              value={prefs.follow}
              onChange={() => updateSetting('follow', !prefs.follow)}
            />
            <ToggleRow
              label="Beğeniler"
              description="Gönderilerini beğendiklerinde bildirim al"
              value={prefs.like}
              onChange={() => updateSetting('like', !prefs.like)}
            />
            <ToggleRow
              label="Yorumlar"
              description="Gönderilerine yorum yaptıklarında bildirim al"
              value={prefs.comment}
              onChange={() => updateSetting('comment', !prefs.comment)}
            />
          </div>

          {/* Saving Indicator */}
          <div className="px-6 py-4 flex justify-end">
            {isSaving && (
              <span className="text-xs px-3 py-1 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-300 border border-orange-500/30 dark:border-orange-500/20">
                Kaydediliyor…
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

interface ToggleRowProps {
  label: string
  description?: string
  value: boolean
  onChange: () => void
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
      <div className="flex-1 pr-4">
        <span className="text-sm font-medium text-gray-900 dark:text-white block">{label}</span>
        {description && (
          <span className="text-xs text-gray-500 dark:text-white/60 mt-1 block">{description}</span>
        )}
      </div>
      <button
        onClick={onChange}
        className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
          value 
            ? 'bg-brand-orange hover:bg-brand-orange/90' 
            : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
        }`}
        aria-pressed={value}
        role="switch"
      >
        <span
          className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-lg transition-transform duration-300 ${
            value ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default function NotificationSettingsPage() {
  return (
    <AuthGuard>
      <NotificationSettingsContent />
    </AuthGuard>
  )
}
