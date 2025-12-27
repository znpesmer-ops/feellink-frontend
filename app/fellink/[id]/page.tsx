'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Building2, Loader2, MapPin, Sparkles, UserCircle2, CheckCircle, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'

interface JobListing {
  id: string
  title: string
  description: string
  company?: string | null
  location?: string | null
  salary?: string | null
  tags: string[]
  createdAt: string
  createdBy: {
    id: string
    username: string | null
    fullName: string | null
    avatar: string | null
  }
}

interface JobApplication {
  id: string
  coverLetter?: string | null
  portfolioUrl?: string | null
  portfolioFileUrl?: string | null
  cvUrl?: string | null
  status: 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED' | 'INTERVIEW'
  adminNote?: string | null
  createdAt: string
  applicant: {
    id: string
    username: string | null
    fullName: string | null
    email: string | null
    avatar: string | null
    roles: string[]
  }
  activities?: ApplicationActivity[]
}

interface ApplicationActivity {
  id: string
  action: string
  details?: string | null
  createdAt: string
}

// Markdown işaretlerini temizleme fonksiyonu
const cleanDescription = (text: string | null | undefined): string => {
  if (!text) return ''
  return text
    .replace(/\*\*/g, '') // ** kalın yazı işaretleri
    .replace(/\*/g, '')   // * italik yazı işaretleri
    .replace(/__/g, '')   // __ alt çizgi kalın
    .replace(/_/g, '')    // _ alt çizgi italik
    .replace(/#{1,6}\s/g, '') // # başlık işaretleri
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // [link](url) -> link
    .trim()
}

export default function JobListingDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, capabilities, accessToken } = useAuthStore()
  const jobListingId = params.id as string
  const activeTab = searchParams.get('tab') || 'details'

  const [jobListing, setJobListing] = useState<JobListing | null>(null)
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [inlineConfirm, setInlineConfirm] = useState<{
    applicationId: string
    action: 'approve' | 'reject'
  } | null>(null)

  // Rol bazlı kontrol
  const roles = capabilities?.roles ?? user?.roles ?? []
  const canCreateJob = roles.includes('corporate') || roles.includes('collector')
  const isOwner = jobListing?.createdBy?.id === user?.id

  useEffect(() => {
    if (!accessToken) {
      router.push('/login')
      return
    }

    async function fetchData() {
      try {
        setLoading(true)
        // İlan detayını al (public endpoint'ten)
        const jobsResponse = await api.get<JobListing[]>('/jobs/public')
        const job = jobsResponse.data.find((j) => j.id === jobListingId)

        if (!job) {
          setError('İlan bulunamadı')
          setLoading(false)
          return
        }

        setJobListing(job)

        // Eğer ilan sahibi ise başvuruları al
        if (job.createdBy.id === user?.id) {
          try {
            const appsResponse = await api.get<JobApplication[]>(`/jobs/${jobListingId}/applications`)
            const apps = appsResponse.data || []
            setApplications(apps)
          } catch (err) {
            // Başvuru çekme hatası kritik değil
            console.warn('Başvurular yüklenemedi:', err)
          }
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'İlan yüklenirken bir hata oluştu')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [jobListingId, accessToken, user?.id, router])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/30 dark:border dark:border-green-800/50 px-3 py-1 text-xs font-medium text-green-600 dark:text-green-300">
            <CheckCircle className="h-3 w-3" />
            Olumlu Yanıt
          </span>
        )
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/30 dark:border dark:border-red-800/50 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-300">
            <XCircle className="h-3 w-3" />
            Olumsuz Yanıt
          </span>
        )
      case 'REVIEWED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 dark:border dark:border-blue-800/50 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-300">
            <Clock className="h-3 w-3" />
            İnceleniyor
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-900/30 dark:border dark:border-orange-800/50 px-3 py-1 text-xs font-medium text-orange-600 dark:text-orange-300">
            <Clock className="h-3 w-3" />
            Beklemede
          </span>
        )
    }
  }

  const handleStatusUpdate = async (applicationId: string, newStatus: 'REVIEWED' | 'ACCEPTED' | 'REJECTED') => {
    try {
      setUpdatingStatus(applicationId)
      const response = await api.patch(`/jobs/applications/${applicationId}/status`, { status: newStatus })
      
      // Local state'i güncelle (activities dahil)
      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, status: newStatus, activities: response.data.activities || app.activities } : app))
      )
      
      toast.success('Başvuru durumu güncellendi')
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Durum güncellenemedi'
      toast.error(message)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleSendMessage = (applicantId: string) => {
    // ✅ İlan ID'sini query parametresi olarak ekle
    router.push(`/messages?user=${applicantId}&jobId=${jobListingId}`)
  }


  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
      </div>
    )
  }

  if (error || !jobListing) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="rounded-3xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/30 px-6 py-8 text-center text-sm text-red-600 dark:text-red-300">
          {error || 'İlan bulunamadı'}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12 bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="mb-10 bg-white dark:bg-gray-950">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-blue/10 dark:bg-zinc-800 dark:border dark:border-zinc-700 px-3 py-1 text-sm font-medium text-brand-orange dark:text-brand-orange mb-4">
          <Sparkles className="h-4 w-4 text-brand-orange dark:text-brand-orange" />
          Feellink İlan Detayı
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{jobListing.title}</h1>
        {jobListing.company && (
          <p className="mt-2 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <Building2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            {jobListing.company}
          </p>
        )}
        {jobListing.location && (
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            {jobListing.location}
          </p>
        )}
      </header>

      {/* Tabs - Sadece ilan sahibi için */}
      {isOwner && (
        <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950">
          <button
            onClick={() => router.push(`/fellink/${jobListingId}?tab=details`)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'details'
                ? 'border-b-2 border-brand-orange text-brand-orange'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            İlan Detayı
          </button>
          <button
            onClick={() => router.push(`/fellink/${jobListingId}?tab=applications`)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'applications'
                ? 'border-b-2 border-brand-orange text-brand-orange'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Başvurular ({applications.length})
          </button>
        </div>
      )}

      {/* Content */}
      {activeTab === 'details' || !isOwner ? (
        <div className="rounded-3xl border border-gray-200/70 dark:border-zinc-800 bg-white dark:bg-gray-950 p-8 shadow-sm dark:shadow-none dark:text-gray-100">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Açıklama</h2>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {cleanDescription(jobListing.description)}
              </p>
            </div>

            {jobListing.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Etiketler</h3>
                <div className="flex flex-wrap gap-2">
                  {jobListing.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-medium text-brand-orange dark:bg-brand-blue/20 dark:text-brand-orange"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
              <span>
                {new Date(jobListing.createdAt).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              {jobListing.salary && <span className="font-medium text-brand-orange">{jobListing.salary}</span>}
            </div>
          </div>
        </div>
      ) : (
        /* Applications Tab */
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 backdrop-blur p-6 text-gray-900 dark:text-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Başvurular</h2>
          {applications.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Bu ilana henüz başvuru yapılmadı.</p>
          ) : (
            <div className="space-y-6">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 backdrop-blur overflow-hidden"
                >
                  {/* Üst Bölüm: Aday Bilgileri */}
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          {app.applicant.avatar ? (
                            <img
                              src={app.applicant.avatar}
                              alt={app.applicant.username || 'Profil'}
                              className="h-12 w-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                              <UserCircle2 className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {app.applicant.fullName || app.applicant.username || 'İsimsiz Kullanıcı'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{app.applicant.email}</p>
                          </div>
                        </div>
                        {app.coverLetter && (
                          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">{app.coverLetter}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {app.portfolioUrl && (
                            <a
                              href={app.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-orange hover:text-orange-600 hover:underline"
                            >
                              📎 Portfolyo
                            </a>
                          )}
                          {app.portfolioFileUrl && (
                            <a
                              href={app.portfolioFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-orange hover:text-orange-600 hover:underline"
                            >
                              📄 Portfolyo Dosyası
                            </a>
                          )}
                          {app.cvUrl && (
                            <a
                              href={app.cvUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-orange hover:text-orange-600 hover:underline"
                            >
                              📄 CV
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(app.status)}
                      </div>
                    </div>
                  </div>

                  {/* Ayırıcı Çizgi */}
                  {isOwner && (
                    <div className="border-t border-gray-200 dark:border-gray-700"></div>
                  )}

                  {/* Alt Bölüm: BAŞVURU DEĞERLENDİRME (Sadece İlan Sahibi İçin) */}
                  {isOwner && (
                    <div className="p-4 bg-gray-50/50 dark:bg-gray-900/30">
                      {/* Başlık */}
                      <div className="mb-4">
                        <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                          Başvuru Değerlendirme
                        </h3>
                        
                        {/* Durum ve Tarih Bilgisi */}
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-4">
                          <div>
                            <span className="font-medium">Durum:</span>{' '}
                            <span className="capitalize">
                              {app.status === 'PENDING' ? 'Beklemede' : 
                               app.status === 'REVIEWED' ? 'İnceleniyor' :
                               app.status === 'ACCEPTED' ? 'Olumlu Yanıt' :
                               app.status === 'REJECTED' ? 'Olumsuz Yanıt' : app.status}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Başvuru Tarihi:</span>{' '}
                            {new Date(app.createdAt).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Karar Verildikten Sonra: Kilitli Durum Bandı */}
                      {(app.status === 'ACCEPTED' || app.status === 'REJECTED') ? (
                        <div className={`rounded-lg p-3 border ${
                          app.status === 'ACCEPTED'
                            ? 'bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-800/50'
                            : 'bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'
                        }`}>
                          <div className="flex items-start gap-2">
                            {app.status === 'ACCEPTED' ? (
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className={`text-xs font-medium ${
                                app.status === 'ACCEPTED'
                                  ? 'text-green-700 dark:text-green-300'
                                  : 'text-red-700 dark:text-red-300'
                              }`}>
                                {app.status === 'ACCEPTED'
                                  ? 'Bu başvuru olumlu değerlendirildi'
                                  : 'Bu başvuru olumsuz değerlendirildi'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {app.status === 'ACCEPTED'
                                  ? 'Adaya bilgilendirme maili gönderildi.'
                                  : 'Aday bilgilendirildi.'}
                              </p>
                            </div>
                          </div>
                          {app.status === 'ACCEPTED' && (
                            <button
                              onClick={() => handleSendMessage(app.applicant.id)}
                              className="mt-3 w-full px-3 py-2 text-xs font-medium bg-brand-orange text-white rounded-md hover:bg-orange-600 transition flex items-center justify-center gap-1.5"
                            >
                              💬 Mesaj Gönder
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Karar Verilmemiş: Aksiyon Alanı */
                        <>
                          {/* Mini Inline Confirmation */}
                          {inlineConfirm && inlineConfirm.applicationId === app.id ? (
                            <div className="rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/80 dark:bg-blue-900/20 p-4 mb-4">
                              <p className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-2">
                                {inlineConfirm.action === 'approve'
                                  ? 'Bu başvuruyu olumlu değerlendirmek üzeresiniz.'
                                  : 'Bu başvuruyu olumsuz değerlendirmek üzeresiniz.'}
                              </p>
                              <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                                Adaya bilgilendirme maili gönderilecektir.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    if (inlineConfirm.action === 'approve') {
                                      await handleStatusUpdate(inlineConfirm.applicationId, 'ACCEPTED')
                                    } else {
                                      await handleStatusUpdate(inlineConfirm.applicationId, 'REJECTED')
                                    }
                                    setInlineConfirm(null)
                                  }}
                                  disabled={updatingStatus === inlineConfirm.applicationId}
                                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                    inlineConfirm.action === 'approve'
                                      ? 'bg-green-600 text-white hover:bg-green-700'
                                      : 'bg-red-600 text-white hover:bg-red-700'
                                  }`}
                                >
                                  {updatingStatus === inlineConfirm.applicationId ? (
                                    <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                                  ) : (
                                    'Onayla'
                                  )}
                                </button>
                                <button
                                  onClick={() => setInlineConfirm(null)}
                                  className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                >
                                  Vazgeç
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Karar Butonları */
                            <div className="flex gap-3">
                              <button
                                onClick={() => setInlineConfirm({ applicationId: app.id, action: 'approve' })}
                                disabled={updatingStatus === app.id}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-brand-orange text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Olumlu Değerlendir
                              </button>
                              <button
                                onClick={() => setInlineConfirm({ applicationId: app.id, action: 'reject' })}
                                disabled={updatingStatus === app.id}
                                className="flex-1 px-4 py-2.5 text-sm font-medium bg-transparent border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                <XCircle className="h-4 w-4" />
                                Olumsuz Değerlendir
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}











