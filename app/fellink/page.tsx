'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, Sparkles } from 'lucide-react'

import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'

interface JobFormState {
  title: string
  description: string
  company: string
  location: string
  salary: string
  tagsInput: string
}

const initialState: JobFormState = {
  title: '',
  description: '',
  company: '',
  location: '',
  salary: '',
  tagsInput: '',
}

export default function FellinkJobCreatorPage() {
  const router = useRouter()
  const { user, capabilities, accessToken } = useAuthStore()
  const [hydrated, setHydrated] = useState(false)
  const [form, setForm] = useState<JobFormState>(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setHydrated(true)
  }, [])

  // Rol bazlı kontrol: sadece corporate ve collector ilan oluşturabilir
  const roles = useMemo(() => {
    return capabilities?.roles ?? user?.roles ?? []
  }, [capabilities, user])

  const canCreateJob = useMemo(
    () => roles.includes('corporate') || roles.includes('collector'),
    [roles],
  )

  useEffect(() => {
    if (!hydrated) {
      return
    }

    if (!accessToken) {
      router.push('/login')
      return
    }

    // Rol kontrolü: corporate veya collector değilse yönlendir
    if (!canCreateJob) {
      router.replace('/fellink/public')
    }
  }, [hydrated, accessToken, canCreateJob, router])

  const handleChange = (field: keyof JobFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const resetForm = () => {
    setForm(initialState)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    setError(null)
    setSuccess(null)

    const tags = form.tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    try {
      setSubmitting(true)
      await api.post('/jobs/create', {
        title: form.title.trim(),
        description: form.description.trim(),
        company: form.company.trim() || undefined,
        location: form.location.trim() || undefined,
        salary: form.salary.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })

      setSuccess('İlan başarıyla oluşturuldu.')
      resetForm()
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        err?.message ??
        'İlan oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.'
      setError(Array.isArray(message) ? message.join(' ') : message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!hydrated || !user || !capabilities) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#ff7b00]" />
      </div>
    )
  }

  if (!canCreateJob) {
    return null
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-10 flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-[#ff7b00] dark:bg-orange-500/10 dark:text-orange-200">
          <Sparkles className="h-4 w-4" />
          Feellink İlan Oluştur
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Yeni iş ilanı yayınla</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Kurumsal ya da koleksiyoner profiliniz için yeni yetenekler arayın. İlanınız kamuya açık olarak listelenir.
        </p>
      </header>

      <div className="rounded-3xl border border-gray-200/60 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-gray-950">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                İlan Başlığı *
              </label>
              <input
                value={form.title}
                onChange={handleChange('title')}
                required
                placeholder="Örn. Galeri Operasyon Yöneticisi"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#ff7b00] focus:ring-2 focus:ring-[#ff7b00]/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Şirket / Galeri</label>
              <input
                value={form.company}
                onChange={handleChange('company')}
                placeholder="Örn. Feellink Art House"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#ff7b00] focus:ring-2 focus:ring-[#ff7b00]/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Lokasyon</label>
              <input
                value={form.location}
                onChange={handleChange('location')}
                placeholder="Örn. İstanbul / Hibrit"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#ff7b00] focus:ring-2 focus:ring-[#ff7b00]/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Maaş / Ücret</label>
              <input
                value={form.salary}
                onChange={handleChange('salary')}
                placeholder="Opsiyonel"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#ff7b00] focus:ring-2 focus:ring-[#ff7b00]/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Etiketler</label>
              <input
                value={form.tagsInput}
                onChange={handleChange('tagsInput')}
                placeholder="Örn. galerist, organizasyon, tam zamanlı"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#ff7b00] focus:ring-2 focus:ring-[#ff7b00]/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-400">Etiketleri virgül ile ayırabilirsiniz.</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              İlan Açıklaması *
            </label>
            <textarea
              value={form.description}
              onChange={handleChange('description')}
              required
              rows={6}
              placeholder="Görev tanımı, aranan nitelikler, başvuru süreçleri..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#ff7b00] focus:ring-2 focus:ring-[#ff7b00]/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
              <span>✅ {success}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push('/fellink/public')}
              className="text-sm font-medium text-gray-500 underline-offset-4 transition hover:text-[#ff7b00] hover:underline dark:text-gray-400"
            >
              Yayında olan ilanları gör
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff7b00] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#e96f00] focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/50 disabled:cursor-not-allowed disabled:opacity-80"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              İlanı Yayınla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}






