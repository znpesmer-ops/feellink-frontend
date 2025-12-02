'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import { ArrowLeft } from 'lucide-react'

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
  const [saving, setSaving] = useState(false)

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
      } finally {
        setLoading(false)
      }
    }

    loadPrefs()
  }, [accessToken])

  const onToggle = (key: keyof NotificationPreferences) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
  }

  const onSave = async () => {
    setSaving(true)
    try {
      await api.put('/notification-preferences', prefs)
      alert('Ayarlar başarıyla kaydedildi!')
    } catch (error) {
      console.error('Failed to save preferences:', error)
      alert('Ayarlar kaydedilirken bir hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="flex justify-center items-center min-h-screen pt-24 pb-16 px-6">
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

        {/* Content Card */}
        <div className="bg-white/80 dark:bg-[#1a1a1a]/70 backdrop-blur-md border border-gray-200 dark:border-gray-700/40 rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Hangi bildirimleri almak istediğini seç. Kapattığın bildirimler veritabanına kaydedilmez ve sana gönderilmez.
          </p>

          <div className="space-y-1">
            <ToggleRow
              label="Etiketlenmeler (@mention)"
              description="Seni bir yorumda etiketlediklerinde bildirim al"
              value={prefs.mention}
              onChange={() => onToggle('mention')}
            />
            <ToggleRow
              label="Takip bildirimleri"
              description="Seni takip ettiklerinde veya takip isteği geldiğinde bildirim al"
              value={prefs.follow}
              onChange={() => onToggle('follow')}
            />
            <ToggleRow
              label="Beğeniler"
              description="Gönderilerini beğendiklerinde bildirim al"
              value={prefs.like}
              onChange={() => onToggle('like')}
            />
            <ToggleRow
              label="Yorumlar"
              description="Gönderilerine yorum yaptıklarında bildirim al"
              value={prefs.comment}
              onChange={() => onToggle('comment')}
            />
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={onSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-brand-orange text-white hover:bg-brand-orange/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
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
    <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800/50 last:border-b-0">
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block">{label}</span>
        {description && (
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">{description}</span>
        )}
      </div>
      <button
        onClick={onChange}
        className={`w-14 h-8 rounded-full relative transition-all duration-300 ${
          value ? 'bg-brand-orange' : 'bg-gray-300 dark:bg-gray-700'
        }`}
        aria-pressed={value}
        role="switch"
      >
        <span
          className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 ${
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

