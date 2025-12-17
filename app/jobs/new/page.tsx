'use client'

import { FormEvent, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

type ApplicationMethod = 'internal' | 'link' | 'email'

export default function NewJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveAsDraft, setSaveAsDraft] = useState(false)
  const [applicationMethod, setApplicationMethod] = useState<ApplicationMethod>('internal')
  const [error, setError] = useState<string | null>(null)
  const [shortSummary, setShortSummary] = useState('')
  const maxShortSummaryChars = 100
  
  // ✅ Edit mode kontrolü
  const jobId = searchParams.get('edit')
  const isEditMode = Boolean(jobId)
  const [isLoadingJob, setIsLoadingJob] = useState(false)

  // ✅ Edit modunda ilan verilerini yükle
  useEffect(() => {
    if (isEditMode && jobId) {
      setIsLoadingJob(true)
      api.get(`/jobs/${jobId}`)
        .then((response) => {
          const job = response.data
          // Form alanlarını doldur
          if (job.title) {
            const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement
            if (titleInput) titleInput.value = job.title
          }
          if (job.company) {
            const companyInput = document.querySelector('input[name="companyName"]') as HTMLInputElement
            if (companyInput) companyInput.value = job.company
          }
          // Description'dan shortSummary ve description'ı ayır
          const description = job.description || ''
          const shortSummaryMatch = description.match(/\*\*(.+?)\*\*\n\n/)
          if (shortSummaryMatch) {
            setShortSummary(shortSummaryMatch[1])
            const fullDesc = description.replace(/\*\*(.+?)\*\*\n\n/, '')
            const descTextarea = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement
            if (descTextarea) descTextarea.value = fullDesc
          } else {
            const descTextarea = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement
            if (descTextarea) descTextarea.value = description
          }
          // Location'ı parse et
          if (job.location) {
            const parts = job.location.split(', ')
            if (parts.length >= 2) {
              const cityInput = document.querySelector('input[name="locationCity"]') as HTMLInputElement
              const countryInput = document.querySelector('input[name="locationCountry"]') as HTMLInputElement
              if (cityInput) cityInput.value = parts[0]
              if (countryInput) countryInput.value = parts.slice(1).join(', ')
            }
          }
          // Salary'yi parse et
          if (job.salary) {
            const salaryMatch = job.salary.match(/(\d+)\s*-\s*(\d+)\s*(\w+)/)
            if (salaryMatch) {
              const minInput = document.querySelector('input[name="salaryMin"]') as HTMLInputElement
              const maxInput = document.querySelector('input[name="salaryMax"]') as HTMLInputElement
              const currencySelect = document.querySelector('select[name="salaryCurrency"]') as HTMLSelectElement
              if (minInput) minInput.value = salaryMatch[1]
              if (maxInput) maxInput.value = salaryMatch[2]
              if (currencySelect) currencySelect.value = salaryMatch[3]
            }
          }
        })
        .catch((err) => {
          console.error('İlan yüklenirken hata:', err)
          toast.error('İlan yüklenirken bir hata oluştu')
          router.push('/jobs/new')
        })
        .finally(() => {
          setIsLoadingJob(false)
        })
    }
  }, [isEditMode, jobId, router])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isLoadingJob) return // Edit modunda veri yüklenirken submit'i engelle
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

    // ✅ Başvuru yöntemi artık sadece Feellink üzerinden (internal) - UI'dan kaldırıldı

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

    // ✅ Yayınlama ayarları validasyonu (sadece yayınlama için, taslak için değil)
    // Edit modunda da zorunlu çünkü ilan zaten yayında
    if (!saveAsDraft) {
      const maxApplications = formData.get('maxApplications')?.toString().trim()
      const autoCloseOnDeadline = formData.get('autoCloseOnDeadline') === 'on'
      
      if (!deadline && !maxApplications && !autoCloseOnDeadline) {
        setError('İlanı yayınlamak için "Yayınlama Ayarları" bölümünden en az bir alanı doldurmalısınız (Son Başvuru Tarihi, Maks. Başvuru Sayısı veya Otomatik Kapatma).')
        setIsSubmitting(false)
        return
      }
    }

    // ✅ Başvuru yöntemi validasyonu kaldırıldı - artık sadece Feellink üzerinden (internal)

    try {
      if (isEditMode && jobId) {
        // ✅ Edit modunda PATCH kullan
        const maxApplications = formData.get('maxApplications')?.toString().trim()
        const autoCloseOnDeadline = formData.get('autoCloseOnDeadline') === 'on'
        
        await api.patch(`/jobs/${jobId}`, {
          title,
          description: fullDescription,
          company: companyName || undefined,
          location: location || undefined,
          salary: salary || undefined,
          tags: tags.length > 0 ? tags : undefined,
          deadline: deadline || undefined,
          maxApplications: maxApplications || undefined,
          autoCloseOnDeadline: autoCloseOnDeadline || false,
        })
        toast.success('İlan başarıyla güncellendi!')
      } else {
        // ✅ Yeni ilan oluşturma
        const maxApplications = formData.get('maxApplications')?.toString().trim()
        const autoCloseOnDeadline = formData.get('autoCloseOnDeadline') === 'on'
        
        await api.post('/jobs/create', {
          title,
          description: fullDescription,
          company: companyName || undefined,
          location: location || undefined,
          salary: salary || undefined,
          tags: tags.length > 0 ? tags : undefined,
          saveAsDraft: saveAsDraft || false,
          deadline: deadline || undefined,
          maxApplications: maxApplications || undefined,
          autoCloseOnDeadline: autoCloseOnDeadline || false,
        })
        toast.success(saveAsDraft ? 'İlan taslak olarak kaydedildi.' : 'İlan başarıyla yayınlandı!')
      }
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
            {isEditMode ? 'İlanı düzenle' : 'Yeni ilan oluştur'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isEditMode 
              ? 'İlan bilgilerini güncelleyebilirsiniz. Bu değişiklikler mevcut başvuruları etkilemez.'
              : 'Kurumun veya koleksiyonun için detaylı ve anlaşılır bir ilan yayınla.'}
          </p>
        </div>
      </div>

      {/* ✅ Edit mode badge */}
      {isEditMode && (
        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50/50 dark:border-orange-500/30 dark:bg-orange-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <span className="text-orange-600 dark:text-orange-400 text-lg">🟠</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-200">
                Bu ilan yayında – değişiklikler kaydedildiğinde güncellenecektir
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoadingJob && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
        </div>
      )}

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

      {!isLoadingJob && (
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

        {/* Maaş */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Maaş
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
          
          {/* ✅ Başvuru Yöntemi bölümü bilinçli olarak kaldırıldı - tüm başvurular Feellink üzerinden alınacak */}
        </section>

        {/* Yayınlama Ayarları */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            Yayınlama ayarları
            {!isEditMode && (
              <span className="text-xs font-normal text-orange-500 dark:text-orange-400">
                (Yayınlamak için zorunlu)
              </span>
            )}
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
                Maks. Başvuru Sayısı
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
            {!isEditMode && (
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
            )}
            <button
              type="submit"
              onClick={() => setSaveAsDraft(false)}
              disabled={isSubmitting || isLoadingJob}
              className="inline-flex items-center justify-center rounded-lg bg-brand-orange px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-orange/90 disabled:opacity-60 transition"
            >
              {isSubmitting ? (isEditMode ? 'Güncelleniyor…' : 'Kaydediliyor…') : (isEditMode ? 'Değişiklikleri Kaydet' : 'İlanı Yayınla')}
            </button>
          </div>
        </div>
      </form>
      )}
    </div>
  )
}

