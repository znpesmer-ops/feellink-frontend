'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

type ApplicationMethod = 'internal' | 'link' | 'email'

export default function NewJobPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveAsDraft, setSaveAsDraft] = useState(false)
  const [applicationMethod, setApplicationMethod] = useState<ApplicationMethod>('internal')
  const [error, setError] = useState<string | null>(null)
  const [shortSummary, setShortSummary] = useState('')
  const maxShortSummaryChars = 100

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    // Mevcut backend DTO'ya uygun format
    const title = formData.get('title')?.toString().trim()
    const companyName = formData.get('companyName')?.toString().trim() || user?.fullName || ''
    const locationCity = formData.get('locationCity')?.toString().trim() || ''
    const locationCountry = formData.get('locationCountry')?.toString().trim() || 'Türkiye'
    const location = [locationCity, locationCountry].filter(Boolean).join(', ') || undefined

    // Maaş formatı
    const salaryMin = formData.get('salaryMin')?.toString()
    const salaryMax = formData.get('salaryMax')?.toString()
    const salaryCurrency = formData.get('salaryCurrency')?.toString() || 'TRY'
    const salaryVisible = formData.get('salaryVisible') === 'on'
    let salary: string | undefined = undefined
    if (salaryMin || salaryMax) {
      if (salaryVisible) {
        salary = `${salaryMin || '?'} - ${salaryMax || '?'} ${salaryCurrency}`
      } else {
        salary = `${salaryMin || '?'} - ${salaryMax || '?'} ${salaryCurrency} (Gizli)`
      }
    }

    // Detaylı açıklama oluştur
    const shortSummary = formData.get('shortSummary')?.toString().trim() || ''
    const description = formData.get('description')?.toString().trim() || ''
    const workMode = formData.get('workMode')?.toString() || ''
    const jobType = formData.get('jobType')?.toString() || ''
    const seniority = formData.get('seniority')?.toString() || ''
    const deadline = formData.get('deadline')?.toString() || ''

    // Formatlı description oluştur
    let fullDescription = description

    if (shortSummary) {
      fullDescription = `**${shortSummary}**\n\n${fullDescription}`
    }

    // İş Detayları artık description'a eklenmiyor - bilgiler zaten etiketler olarak gösteriliyor
    // if (workMode || jobType || seniority) {
    //   fullDescription += '\n\n**İş Detayları:**\n'
    //   ...
    // }

    if (deadline) {
      const deadlineDate = new Date(deadline).toLocaleDateString('tr-TR')
      fullDescription += `\n\n**Son Başvuru Tarihi:** ${deadlineDate}`
    }

    // Başvuru yöntemi bilgisi
    if (applicationMethod === 'link') {
      const applicationUrl = formData.get('applicationUrl')?.toString().trim()
      if (applicationUrl) {
        fullDescription += `\n\n**Başvuru:** ${applicationUrl}`
      }
    } else if (applicationMethod === 'email') {
      const applicationEmail = formData.get('applicationEmail')?.toString().trim()
      if (applicationEmail) {
        fullDescription += `\n\n**Başvuru E-posta:** ${applicationEmail}`
      }
    }

    // Tags oluştur (iş birliği türü, deneyim düzeyi, çalışma şekli)
    const tags: string[] = []
    if (workMode) tags.push(workMode === 'onsite' ? 'Fiziksel (Atölye / Müze / Galeri)' : workMode === 'hybrid' ? 'Hibrit' : 'Uzaktan')
    if (jobType) tags.push(jobType === 'full-time' ? 'Tam Zamanlı' : jobType === 'part-time' ? 'Yarı Zamanlı' : jobType === 'internship' ? 'Gönüllü' : 'Proje Bazlı')
    if (seniority) tags.push(seniority === 'intern' ? 'Öğrenci / Yeni Mezun' : seniority === 'junior' ? 'Gelişmekte Olan Sanatçı' : seniority === 'mid' ? 'Deneyimli' : seniority === 'senior' ? 'Açık (Tüm seviyeler)' : 'Lead')

    // Basit zorunlu alan kontrolü
    if (!title || !description) {
      setError('Başlık ve detaylı açıklama alanları zorunludur.')
      setIsSubmitting(false)
      return
    }

    // Başvuru yöntemi koşullu validasyon
    if (applicationMethod === 'link') {
      const applicationUrl = formData.get('applicationUrl')?.toString().trim()
      if (!applicationUrl) {
        setError('Başvuru yöntemi olarak link seçtiniz, lütfen başvuru linkini girin.')
        setIsSubmitting(false)
        return
      }
    }

    if (applicationMethod === 'email') {
      const applicationEmail = formData.get('applicationEmail')?.toString().trim()
      if (!applicationEmail) {
        setError('Başvuru yöntemi olarak e-posta seçtiniz, lütfen e-posta adresi girin.')
        setIsSubmitting(false)
        return
      }
    }

    try {
      await api.post('/jobs/create', {
        title,
        description: fullDescription,
        company: companyName || undefined,
        location: location || undefined,
        salary: salary || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })

      toast.success(saveAsDraft ? 'İlan taslak olarak kaydedildi.' : 'İlan başarıyla yayınlandı!')
      router.push('/fellink/public')
    } catch (err: any) {
      console.error(err)
      const errorMessage = err?.response?.data?.message ?? 'İlan kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
            Feellink İş İlanları
          </p>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Yeni ilan oluştur
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Kurumun veya koleksiyonun için detaylı ve anlaşılır bir ilan yayınla.
          </p>
        </div>
      </div>

      {/* Başvuru Geri Bildirimi Bilgilendirmesi */}
      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-500/10 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
              Başvuru Geri Bildirimi
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Feellink'te ilan yayınlayan kurum ve sanatçılar, başvurulara en geç 30 gün içinde geri dönüş yapmayı taahhüt eder.
              Bu yaklaşım, topluluk içinde şeffaf ve saygılı bir etkileşim ortamı sağlar.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* İlan Temel Bilgileri */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Temel bilgiler
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                İlan Başlığı *
              </label>
              <input
                name="title"
                type="text"
                required
                placeholder="Örn: Sergi Asistanı, Çağdaş Sanat Projesi için Sanatçı Aranıyor"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                İlan başlığı, aranan rolü veya iş birliği biçimini net şekilde ifade etmelidir.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kurum / Koleksiyon Adı
              </label>
              <input
                name="companyName"
                type="text"
                defaultValue={user?.fullName || ''}
                placeholder="Örn: Lale Müzesi, Bağımsız Sanat İnisiyatifi"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Şehir
              </label>
              <input
                name="locationCity"
                type="text"
                placeholder="İstanbul"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ülke
              </label>
              <input
                name="locationCountry"
                type="text"
                placeholder="Türkiye"
                defaultValue="Türkiye"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Çalışma Şekli
              </label>
              <select
                name="workMode"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
                defaultValue="onsite"
              >
                <option value="onsite">Fiziksel (Atölye / Müze / Galeri)</option>
                <option value="hybrid">Hibrit</option>
                <option value="remote">Uzaktan</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                İş Birliği Türü
              </label>
              <select
                name="jobType"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
                defaultValue="full-time"
              >
                <option value="full-time">Tam Zamanlı</option>
                <option value="part-time">Yarı Zamanlı</option>
                <option value="freelance">Proje Bazlı</option>
                <option value="internship">Gönüllü</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deneyim Düzeyi
              </label>
              <select
                name="seniority"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
                defaultValue="junior"
              >
                <option value="intern">Öğrenci / Yeni Mezun</option>
                <option value="junior">Gelişmekte Olan Sanatçı</option>
                <option value="mid">Deneyimli</option>
                <option value="senior">Açık (Tüm seviyeler)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Açıklama ve İçerik */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            İlan içeriği
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kısa Özet (Opsiyonel)
            </label>
            <div className="flex flex-col gap-1">
              <textarea
                name="shortSummary"
                rows={2}
                maxLength={maxShortSummaryChars}
                value={shortSummary}
                onChange={(e) => setShortSummary(e.target.value.slice(0, maxShortSummaryChars))}
                placeholder="Örn: Bu ilan, sergi sürecinde görev alacak ve sanat üretim süreçlerine destek verecek kişiler içindir."
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-none text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Listeleme kartlarında ve ön izlemelerde kullanılacak kısa açıklama.
                </p>
                <span
                  className={`text-xs font-medium ${
                    maxShortSummaryChars - shortSummary.length < 10
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {maxShortSummaryChars - shortSummary.length} karakter kaldı
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Detaylı Açıklama *
            </label>
            <textarea
              name="description"
              rows={8}
              required
              placeholder="Kurumu, projeyi ve bu iş birliğinden beklentilerinizi detaylı olarak anlatın. Sergi, üretim süreci, program kapsamı veya iş birliği biçimine dair bilgileri ekleyebilirsiniz."
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-y text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
            />
          </div>
        </section>

        {/* Maaş & Başvuru Yöntemi */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Maaş & başvuru yöntemi
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min. Maaş
              </label>
              <input
                name="salaryMin"
                type="number"
                min={0}
                placeholder="Örn: 25000"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maks. Maaş
              </label>
              <input
                name="salaryMax"
                type="number"
                min={0}
                placeholder="Örn: 35000"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Para Birimi
              </label>
              <select
                name="salaryCurrency"
                defaultValue="TRY"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
              >
                <option value="TRY">TRY</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="salaryVisible"
                name="salaryVisible"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-brand-orange focus:ring-brand-orange bg-white dark:bg-gray-800"
              />
              <label
                htmlFor="salaryVisible"
                className="text-sm text-gray-700 dark:text-gray-300 select-none"
              >
                Maaş aralığını ilanda göster
              </label>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Bu alan isteğe bağlıdır. Sanat ve kültür alanında proje bazlı veya gönüllü ilanlar yayınlayabilirsiniz.
          </p>

          <div className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-4 mt-2 space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Başvuru Yöntemi
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="applicationMethod"
                  checked={applicationMethod === 'internal'}
                  onChange={() => setApplicationMethod('internal')}
                  className="h-4 w-4 text-brand-orange border-gray-300 dark:border-gray-600 focus:ring-brand-orange bg-white dark:bg-gray-800"
                />
                <span className="text-gray-700 dark:text-gray-300">Başvurular Feellink üzerinden alınacaktır</span>
              </label>

              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="applicationMethod"
                  checked={applicationMethod === 'link'}
                  onChange={() => setApplicationMethod('link')}
                  className="h-4 w-4 text-brand-orange border-gray-300 dark:border-gray-600 focus:ring-brand-orange bg-white dark:bg-gray-800"
                />
                <span className="text-gray-700 dark:text-gray-300">Dış link ile başvuru</span>
              </label>

              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="applicationMethod"
                  checked={applicationMethod === 'email'}
                  onChange={() => setApplicationMethod('email')}
                  className="h-4 w-4 text-brand-orange border-gray-300 dark:border-gray-600 focus:ring-brand-orange bg-white dark:bg-gray-800"
                />
                <span className="text-gray-700 dark:text-gray-300">E-posta ile başvuru</span>
              </label>
            </div>

            {applicationMethod === 'link' && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Başvuru Linki *
                </label>
                <input
                  name="applicationUrl"
                  type="url"
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
                />
              </div>
            )}

            {applicationMethod === 'email' && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Başvuru E-posta Adresi *
                </label>
                <input
                  name="applicationEmail"
                  type="email"
                  placeholder="kariyer@ornekfirma.com"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
                />
              </div>
            )}
          </div>
        </section>

        {/* Yayınlama Ayarları */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Yayınlama ayarları
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Son Başvuru Tarihi
              </label>
              <input
                name="deadline"
                type="date"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maks. Başvuru Sayısı (Opsiyonel)
              </label>
              <input
                name="maxApplications"
                type="number"
                min={1}
                placeholder="Örn: 50"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/70 focus:border-brand-orange/70"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                id="autoCloseOnDeadline"
                name="autoCloseOnDeadline"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-brand-orange focus:ring-brand-orange bg-white dark:bg-gray-800"
              />
              <label
                htmlFor="autoCloseOnDeadline"
                className="text-sm text-gray-700 dark:text-gray-300 select-none"
              >
                Tarih geldiğinde ilanı otomatik kapat
              </label>
            </div>
          </div>
        </section>

        {/* Hata Mesajı */}
        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Alt Butonlar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex flex-col gap-1 text-xs text-gray-400 dark:text-gray-500">
            <span>• Taslak olarak kaydedersen ilan sadece senin için görünür.</span>
            <span>• İlan yayınlandıktan sonra düzenlenebilir.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                setSaveAsDraft(true)
                const form = document.querySelector('form') as HTMLFormElement
                form?.requestSubmit()
              }}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 transition"
            >
              Taslak Olarak Kaydet
            </button>
            <button
              type="submit"
              onClick={() => setSaveAsDraft(false)}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-brand-orange px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-orange/90 disabled:opacity-60 transition"
            >
              {isSubmitting ? 'Kaydediliyor…' : 'İlanı Yayınla'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

