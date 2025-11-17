'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Building2, Loader2, MapPin, Sparkles, UserCircle2, CheckCircle, XCircle, Clock } from 'lucide-react'
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
  cvUrl?: string | null
  status: 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED'
  createdAt: string
  applicant: {
    id: string
    username: string | null
    fullName: string | null
    email: string | null
    avatar: string | null
    roles: string[]
  }
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

  // Rol bazlı kontrol
  const roles = capabilities?.roles ?? user?.roles ?? []
  const canCreateJob = roles.includes('corporate') || roles.includes('collector')
  const isOwner = jobListing?.createdBy.id === user?.id

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
            setApplications(appsResponse.data || [])
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
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600 dark:bg-green-500/10 dark:text-green-200">
            <CheckCircle className="h-3 w-3" />
            Kabul Edildi
          </span>
        )
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-200">
            <XCircle className="h-3 w-3" />
            Reddedildi
          </span>
        )
      case 'REVIEWED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">
            <Clock className="h-3 w-3" />
            İnceleniyor
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-500/10 dark:text-gray-200">
            <Clock className="h-3 w-3" />
            Beklemede
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#ff7b00]" />
      </div>
    )
  }

  if (error || !jobListing) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error || 'İlan bulunamadı'}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      {/* Header */}
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50/80 px-3 py-1 text-sm font-medium text-[#ff7b00] dark:bg-orange-500/15 dark:text-orange-200 mb-4">
          <Sparkles className="h-4 w-4" />
          Feellink İlan Detayı
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{jobListing.title}</h1>
        {jobListing.company && (
          <p className="mt-2 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <Building2 className="h-4 w-4" />
            {jobListing.company}
          </p>
        )}
        {jobListing.location && (
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="h-4 w-4" />
            {jobListing.location}
          </p>
        )}
      </header>

      {/* Tabs - Sadece ilan sahibi için */}
      {isOwner && (
        <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => router.push(`/fellink/${jobListingId}?tab=details`)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'details'
                ? 'border-b-2 border-[#ff7b00] text-[#ff7b00]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            İlan Detayı
          </button>
          <button
            onClick={() => router.push(`/fellink/${jobListingId}?tab=applications`)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'applications'
                ? 'border-b-2 border-[#ff7b00] text-[#ff7b00]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Başvurular ({applications.length})
          </button>
        </div>
      )}

      {/* Content */}
      {activeTab === 'details' || !isOwner ? (
        <div className="rounded-3xl border border-gray-200/70 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Açıklama</h2>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {jobListing.description}
              </p>
            </div>

            {jobListing.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Etiketler</h3>
                <div className="flex flex-wrap gap-2">
                  {jobListing.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-[#ff7b00] dark:bg-orange-500/10 dark:text-orange-200"
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
              {jobListing.salary && <span className="font-medium text-[#ff7b00]">{jobListing.salary}</span>}
            </div>
          </div>
        </div>
      ) : (
        /* Applications Tab */
        <div className="rounded-3xl border border-gray-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Başvurular</h2>
          {applications.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Bu ilana henüz başvuru yapılmadı.</p>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {app.applicant.avatar ? (
                        <img
                          src={app.applicant.avatar}
                          alt={app.applicant.username || 'Profil'}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <UserCircle2 className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {app.applicant.fullName || app.applicant.username || 'İsimsiz Kullanıcı'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{app.applicant.email}</p>
                      </div>
                    </div>
                    {app.coverLetter && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{app.coverLetter}</p>
                    )}
                    {app.portfolioUrl && (
                      <a
                        href={app.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-[#ff7b00] hover:underline"
                      >
                        Portfolyo Linki →
                      </a>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(app.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(app.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

