'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Sparkles, UserCircle2, Eye, Trash2, MoreVertical, Users, Edit } from 'lucide-react'

import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { ApplyModal } from '@/components/jobs/ApplyModal'
import { DeleteConfirmModal } from '@/components/jobs/DeleteConfirmModal'
import { JobDetailModal } from '@/components/jobs/JobDetailModal'
import toast from 'react-hot-toast'

interface PublicJobListing {
  id: string
  title: string
  description: string
  company?: string | null
  location?: string | null
  salary?: string | null
  tags: string[]
  createdAt: string
  createdBy?: {
    id: string
    username: string | null
    fullName: string | null
    avatar: string | null
  } | null
}

interface MyJobListing {
  id: string
  title: string
  description: string
  company?: string | null
  location?: string | null
  salary?: string | null
  tags: string[]
  createdAt: string
  _count?: {
    applications?: number
  }
  createdBy?: {
    id: string
    username: string | null
    fullName: string | null
    avatar: string | null
  } | null
}

interface JobApplication {
  id: string
  coverLetter?: string | null
  portfolioUrl?: string | null
  cvUrl?: string | null
  status: 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED' | 'INTERVIEW' | 'WAITING'
  createdAt: string
  expiresAt?: string | null // 30 günlük yanıt süresi
  jobListing: {
    id: string
    title: string
    company?: string | null
    location?: string | null
    createdBy: {
      id: string
      username: string | null
      fullName: string | null
      avatar: string | null
    }
  }
}

function MyApplicationsTab({ 
  applications, 
  loading,
  onExploreClick 
}: { 
  applications: JobApplication[]
  loading: boolean
  onExploreClick: () => void
}) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return {
          badge: (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
              Olumlu Yanıt
            </span>
          ),
          description: 'Başvurunuz olumlu yanıtlandı. İlan sahibi ile iletişime geçildi.',
        }
      case 'REJECTED':
        return {
          badge: (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
              Olumsuz Yanıt
            </span>
          ),
          description: 'Bu ilan için sürece devam edilmeyecektir.',
        }
      case 'REVIEWED':
        return {
          badge: (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              İnceleniyor
            </span>
          ),
          description: 'Başvurunuz ilan sahibi tarafından incelenmektedir.',
        }
      case 'PENDING':
      case 'WAITING':
      default:
        return {
          badge: (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
              Beklemede
            </span>
          ),
          description: 'Başvurunuz ilan sahibi tarafından henüz incelenmedi.',
        }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Süre göstergesi hesaplama fonksiyonu
  const getResponseTimeIndicator = (application: JobApplication) => {
    // Yanıtlanmış durumlar için gösterme
    if (application.status !== 'PENDING' && application.status !== 'WAITING') {
      return {
        badge: (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
            🟢 Yanıtlandı
          </span>
        ),
        daysLeft: null,
      }
    }

    if (!application.expiresAt) {
      return null
    }

    const now = new Date()
    const expires = new Date(application.expiresAt)
    const diffTime = expires.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      // Süre doldu
      return {
        badge: (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-900/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400">
            ⚫ Süre doldu
          </span>
        ),
        daysLeft: 0,
      }
    } else if (diffDays <= 3) {
      // Son 3 gün
      return {
        badge: (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
            🔴 Son {diffDays} gün
          </span>
        ),
        daysLeft: diffDays,
      }
    } else {
      // Normal süre
      return {
        badge: (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
            🟠 Yanıt için {diffDays} gün kaldı
          </span>
        ),
        daysLeft: diffDays,
      }
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
      </div>
    )
  }

  if (!applications || applications.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
        <p className="text-lg font-medium mb-2">Henüz başvurduğun bir ilan yok.</p>
        <button
          onClick={onExploreClick}
          className="text-brand-orange hover:underline inline-flex items-center gap-1 mt-1"
        >
          İlanları keşfet
        </button>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {applications.map((application) => (
        <div
          key={application.id}
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f1115] p-4 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
        >
          {/* Üst Bilgi */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {application.jobListing.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {application.jobListing.company || 'Şirket bilgisi yok'}
                {application.jobListing.location && ` · ${application.jobListing.location}`}
              </p>
            </div>
            <div className="ml-3 text-right flex flex-col gap-1.5 items-end">
              {getStatusBadge(application.status).badge}
              {/* Süre göstergesi */}
              {getResponseTimeIndicator(application)?.badge}
            </div>
          </div>

          {/* Durum Açıklaması */}
          <div className="mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getStatusBadge(application.status).description}
            </p>
          </div>

          {/* Açıklama */}
          {application.coverLetter && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-1">
              {application.coverLetter}
            </p>
          )}

          {/* Tarih */}
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-4">
            Başvuru Tarihi: {formatDate(application.createdAt)}
          </div>

          {/* Buton */}
          <Link
            href={`/fellink/${application.jobListing.id}`}
            className="mt-4 inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange/90 text-white px-4 py-2 rounded-lg text-sm transition shadow-sm"
          >
            <Eye className="h-4 w-4" />
            İlanı Görüntüle
          </Link>
        </div>
      ))}
    </div>
  )
}

function MyJobsTab({
  jobs,
  loading,
  error,
  onJobClick,
  onDeleteClick,
  openMenuId,
  setOpenMenuId,
  user,
  router,
}: {
  jobs: MyJobListing[]
  loading: boolean
  error: string | null
  onJobClick: (job: MyJobListing) => void
  onDeleteClick: (jobId: string) => void
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  user: any
  router: any
}) {
  const cleanText = (text: string) => {
    if (!text) return ''
    return text
      .replace(/\*\*/g, '')
      .replace(/[_#>-]/g, '')
      .trim()
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
        {error}
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300/70 bg-white/90 px-6 py-16 text-center text-gray-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
        <p className="text-lg font-medium">Henüz hiç ilan açmadınız.</p>
        <Link
          href="/jobs/new"
          className="mt-4 inline-block rounded-xl bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-orange/90"
        >
          İlk İlanınızı Oluşturun
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {jobs.map((job) => {
        const cleanedDescription = cleanText(job.description)
        const shortDescription = cleanedDescription.length > 100 
          ? cleanedDescription.substring(0, 100) + '...'
          : cleanedDescription

        const companyLocation = [job.company, job.location].filter(Boolean).join(' · ')

        const dateText = new Date(job.createdAt).toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })

        const applicationCount = job._count?.applications || 0

        return (
          <article
            key={job.id}
            onClick={() => onJobClick(job)}
            className="group relative flex h-full flex-col rounded-xl border border-gray-200 bg-white min-h-[260px] px-5 py-4 shadow-sm transition-all hover:shadow-md hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-gray-600 cursor-pointer"
          >
            <div className="space-y-3 flex-1">
              {/* Başlık */}
              <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight mb-2">
                {job.title}
              </h2>

              {/* Şirket ve Konum */}
              {companyLocation && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
                  {companyLocation}
                </p>
              )}

              {/* Kısa Açıklama */}
              {shortDescription && (
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-1">
                  {shortDescription}
                </p>
              )}

              {/* Etiketler */}
              {job.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {job.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50"
                    >
                      {tag}
                    </span>
                  ))}
                  {job.tags.length > 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50">
                      +{job.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Alt kısım - Başvuru sayısı & Tarih */}
            <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {applicationCount} Başvuru
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {dateText}
                </p>
              </div>

              {/* Başvuruları Gör Butonu */}
              {applicationCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/fellink/${job.id}?tab=applications`)
                  }}
                  className="mt-3 w-full rounded-lg border border-orange-500 px-4 py-1.5 text-sm font-medium text-orange-500 hover:bg-orange-500 hover:text-white transition"
                >
                  Başvuruları Gör
                </button>
              )}
            </div>

            {/* Sağ alt köşe - Üç nokta menü */}
            <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <button
                  onClick={() => setOpenMenuId(openMenuId === job.id ? null : job.id)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Menü"
                >
                  <MoreVertical className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </button>

                {/* Açılır menü */}
                {openMenuId === job.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setOpenMenuId(null)}
                    />
                    <div className="absolute right-0 bottom-full mb-2 w-40 origin-bottom-right bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 z-20">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            router.push(`/jobs/new?edit=${job.id}`)
                            setOpenMenuId(null)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            Düzenle
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            onDeleteClick(job.id)
                            setOpenMenuId(null)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4" />
                            İlanı Sil
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

// Dynamic export - prerender'i devre dışı bırak (useSearchParams kullanımı nedeniyle)
export const dynamic = 'force-dynamic';

export default function FellinkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, capabilities, accessToken } = useAuthStore()
  const [jobs, setJobs] = useState<PublicJobListing[]>([])
  const [myJobs, setMyJobs] = useState<MyJobListing[]>([])
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [myJobsLoading, setMyJobsLoading] = useState(false)
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applyModalOpen, setApplyModalOpen] = useState<string | null>(null)
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set())
  
  // Tab state - URL'den veya default 'explore'
  const tabFromUrl = searchParams?.get('tab')
  const [activeTab, setActiveTab] = useState<'explore' | 'applications' | 'my-jobs'>(
    tabFromUrl === 'applications' ? 'applications' : tabFromUrl === 'my-jobs' ? 'my-jobs' : 'explore'
  )

  // URL'den tab değişikliğini dinle
  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab === 'applications' || tab === 'my-jobs') {
      setActiveTab(tab)
    } else {
      setActiveTab('explore')
    }
  }, [searchParams])
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<PublicJobListing | MyJobListing | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Markdown işaretlerini temizleme fonksiyonu
  const cleanText = (text: string) => {
    if (!text) return ''
    return text
      .replace(/\*\*/g, '')
      .replace(/[_#>-]/g, '')
      .replace(/\n/g, ' ')
      .trim()
  }

  // İlan detay modalını aç
  const handleJobClick = (job: PublicJobListing | MyJobListing) => {
    setSelectedJob(job)
    setDetailModalOpen(true)
  }

  // Rol bazlı kontrol: sadece corporate, collector ve admin ilan oluşturabilir
  const roles = capabilities?.roles ?? user?.roles ?? []
  const canCreateJob = roles.includes('corporate') || roles.includes('collector') || user?.isAdmin || user?.superAdmin
  const canApply = !!accessToken

  // İlan silme fonksiyonu
  const handleDeleteJob = async () => {
    if (!selectedJobId) return

    try {
      await api.delete(`/jobs/${selectedJobId}`)
      setJobs((prev) => prev.filter((job) => job.id !== selectedJobId))
      setMyJobs((prev) => prev.filter((job) => job.id !== selectedJobId))
      setApplications((prev) => prev.filter((app) => app.jobListing.id !== selectedJobId))
      setDeleteModalOpen(false)
      setOpenMenuId(null)
      setSelectedJobId(null)
      toast.success('İlan başarıyla silindi')
    } catch (err: any) {
      console.error('İlan silinirken hata:', err)
      const message = err?.response?.data?.message ?? err?.message ?? 'İlan silinemedi'
      toast.error(message)
    }
  }

  // Silme modal'ını aç
  const openDeleteModal = (jobId: string) => {
    setSelectedJobId(jobId)
    setDeleteModalOpen(true)
    setOpenMenuId(null)
  }

  // Tab değiştirme
  const handleTabChange = (tab: 'explore' | 'applications' | 'my-jobs') => {
    setActiveTab(tab)
    if (tab === 'explore') {
      router.push('/fellink', { scroll: false })
    } else {
      router.push(`/fellink?tab=${tab}`, { scroll: false })
    }
  }

  // İlanları yükle (Keşfet tab'ı için)
  useEffect(() => {
    let mounted = true

    async function fetchJobs() {
      try {
        setLoading(true)
        const response = await api.get<PublicJobListing[]>('/jobs/public')
        if (mounted) {
          setJobs(response.data || [])
        }
      } catch (err: any) {
        if (mounted) {
          const message =
            err?.response?.data?.message ??
            err?.message ??
            'İlanlar yüklenirken bir sorun oluştu.'
          setError(Array.isArray(message) ? message.join(' ') : message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    async function checkApplications() {
      if (!accessToken) return
      
      try {
        const applied = await api.get('/jobs/me/applications')
        if (mounted && applied.data) {
          const jobIds = applied.data.map((app: any) => app.jobListing?.id || app.jobListingId)
          setAppliedJobs(new Set(jobIds))
        }
      } catch (err) {
        if (mounted) {
          setAppliedJobs(new Set())
        }
      }
    }

    fetchJobs()
    checkApplications()

    return () => {
      mounted = false
    }
  }, [accessToken])

  // Başvuruları yükle
  useEffect(() => {
    if (activeTab !== 'applications' || !accessToken) return

    let mounted = true

    async function fetchApplications() {
      try {
        setApplicationsLoading(true)
        const response = await api.get<JobApplication[]>('/jobs/me/applications')
        if (mounted) {
          setApplications(response.data || [])
        }
      } catch (err: any) {
        if (mounted) {
          console.error('Başvurular yüklenirken hata:', err)
          setApplications([])
        }
      } finally {
        if (mounted) {
          setApplicationsLoading(false)
        }
      }
    }

    fetchApplications()

    return () => {
      mounted = false
    }
  }, [activeTab, accessToken])

  // İşlerim tab'ı için ilanları yükle
  useEffect(() => {
    if (activeTab !== 'my-jobs' || !accessToken) return

    let mounted = true

    async function fetchMyJobs() {
      try {
        setMyJobsLoading(true)
        const response = await api.get<MyJobListing[]>('/jobs/me')
        if (mounted) {
          setMyJobs(response.data || [])
        }
      } catch (err: any) {
        if (mounted) {
          console.error('İşlerim yüklenirken hata:', err)
          setMyJobs([])
        }
      } finally {
        if (mounted) {
          setMyJobsLoading(false)
        }
      }
    }

    fetchMyJobs()

    return () => {
      mounted = false
    }
  }, [activeTab, accessToken])

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 text-gray-900 dark:text-gray-100">
      <header className="mb-10 flex flex-col gap-3 rounded-3xl border border-transparent bg-white/80 px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between dark:border-white/5 dark:bg-white/5 dark:text-gray-100">
            <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-blue/10 px-3 py-1 text-sm font-medium text-brand-orange dark:bg-brand-blue/20">
            <Sparkles className="h-4 w-4" />
            Feellink İş İlanları
          </div>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Topluluk ilanlarını keşfet
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Feellink ekosistemindeki kurum ve koleksiyonerlerin paylaştığı güncel iş & proje fırsatları burada.
          </p>
        </div>
      </header>

      {/* Sekmeler */}
      <div className="mb-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800/40">
        <div className="flex gap-6">
          <button
            onClick={() => handleTabChange('explore')}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === 'explore'
                ? 'text-brand-orange border-b-2 border-brand-orange'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Keşfet
          </button>
          {accessToken && (
            <>
              <button
                onClick={() => handleTabChange('applications')}
                className={`pb-3 text-sm font-medium transition ${
                  activeTab === 'applications'
                    ? 'text-brand-orange border-b-2 border-brand-orange'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Başvurularım
              </button>
              <button
                onClick={() => handleTabChange('my-jobs')}
                className={`pb-3 text-sm font-medium transition ${
                  activeTab === 'my-jobs'
                    ? 'text-brand-orange border-b-2 border-brand-orange'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                İş İlanlarım
              </button>
            </>
          )}
        </div>

        {/* Sağ: İlan Oluştur Butonu */}
        {canCreateJob && (
          <Link
            href="/jobs/new"
            className="text-sm px-3 py-1 bg-brand-orange text-white rounded-md hover:bg-brand-orange/80 shadow-sm transition -mt-1"
          >
            + İlan Oluştur
          </Link>
        )}
      </div>

      {/* İçerik */}
      {activeTab === 'applications' ? (
        <MyApplicationsTab
          applications={applications}
          loading={applicationsLoading}
          onExploreClick={() => handleTabChange('explore')}
        />
      ) : activeTab === 'my-jobs' ? (
        <MyJobsTab
          jobs={myJobs}
          loading={myJobsLoading}
          error={null}
          onJobClick={handleJobClick}
          onDeleteClick={openDeleteModal}
          openMenuId={openMenuId}
          setOpenMenuId={setOpenMenuId}
          user={user}
          router={router}
        />
      ) : (
        <>
          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300/70 bg-white/90 px-6 py-16 text-center text-gray-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
              <p className="text-lg font-medium">Şu anda yayınlanan ilan bulunmuyor.</p>
              <p className="mt-2 text-sm">Kurumsal veya koleksiyoner hesap ile giriş yaparak ilk ilanı oluşturabilirsiniz.</p>
          </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {jobs.map((job) => {
                  const hasApplied = appliedJobs.has(job.id)
                  const isOwner = job.createdBy?.id === user?.id

                  const cleanedDescription = cleanText(job.description)
                  const shortDescription = cleanedDescription.length > 100 
                    ? cleanedDescription.substring(0, 100) + '...'
                    : cleanedDescription

                  const visibleTags = job.tags.slice(0, 3)
                  const remainingTags = job.tags.length - 3

                  const companyLocation = [job.company, job.location].filter(Boolean).join(' · ')

                  const salaryText = job.salary || ''

                  const dateText = new Date(job.createdAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })

                  return (
                    <article
                      key={job.id}
                      onClick={() => handleJobClick(job)}
                      className="group relative flex h-full flex-col rounded-xl border border-gray-200 bg-white min-h-[260px] px-5 py-4 shadow-sm transition-all hover:shadow-md hover:border-blue-200 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-500/30 cursor-pointer"
                    >
                      {/* Sağ üst köşe - Avatar */}
                      {job.createdBy && (
                        <div className="absolute top-5 right-5">
                          {job.createdBy.avatar ? (
                            <img
                              src={job.createdBy.avatar}
                              alt={job.createdBy.username ?? 'Profil'}
                              className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <UserCircle2 className="h-5 w-5 text-gray-400" />
          </div>
                          )}
            </div>
          )}

                      {/* ÜST İÇERİK ALANI */}
                      <div className="space-y-3 pr-10 flex-1">
                        {/* Başlık - Soft koyu mavi */}
                        <h2 className="text-base font-semibold text-[#1E3A8A] dark:text-blue-400 leading-tight mb-2">
                          {job.title}
                        </h2>

                        {/* Kurum + Lokasyon */}
                        {companyLocation && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {companyLocation}
                          </p>
                        )}

                        {/* Açıklama - Max 2 satır */}
                        {shortDescription && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
                            {shortDescription}
                          </p>
                        )}

                        {job.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {visibleTags.map((tag, idx) => {
                              // Etiketlere farklı renkler ver (mavi, gri, turuncu)
                              const colorClasses = [
                                'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
                                'bg-gray-50 text-gray-700 border-gray-100 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700/50',
                                'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
                              ]
                              const colorIndex = idx % 3
                              
                              return (
                                <span
                                  key={tag}
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colorClasses[colorIndex]}`}
                                >
                                  {tag}
                                </span>
                              )
                            })}
                            {remainingTags > 0 && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                +{remainingTags}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ALT ALAN - mt-auto ile aşağı sabitlenmiş */}
                      <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between text-xs">
                          {/* Sol: Tarih */}
                          <span className="text-gray-400 dark:text-gray-500">
                            {dateText}
                          </span>
                          
                          {/* Sağ: Maaş (varsa) veya Başvuru Butonu */}
                          <div className="flex items-center gap-3">
                            {salaryText && (
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {salaryText}
                              </span>
                            )}
                            
                            {/* Başvuru Butonu */}
                            {canApply && !isOwner && (
                              <div onClick={(e) => e.stopPropagation()}>
                                {hasApplied ? (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-green-500 bg-green-50 dark:bg-green-500/10 px-4 py-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                                    ✓ Başvurdun
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => setApplyModalOpen(job.id)}
                                    className="rounded-md border-2 border-orange-500 px-4 py-1.5 text-sm font-medium text-orange-500 hover:bg-orange-500 hover:text-white transition-colors"
                                  >
                                    İlana Başvur
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {(isOwner || user?.isAdmin || user?.superAdmin) && (
                        <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
            <button
                              onClick={() => setOpenMenuId(openMenuId === job.id ? null : job.id)}
                              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title="Menü"
                            >
                              <MoreVertical className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </button>

                            {openMenuId === job.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <div className="absolute right-0 bottom-full mb-2 w-40 origin-bottom-right bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 z-20">
                                  <div className="py-1">
            <button
                                      onClick={() => openDeleteModal(job.id)}
                                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Trash2 className="h-4 w-4" />
                                        İlanı Sil
                                      </div>
            </button>
          </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}
      </div>

              {applyModalOpen && (
                <ApplyModal
                  jobListingId={applyModalOpen}
                  open={!!applyModalOpen}
                  onClose={() => {
                    setApplyModalOpen(null)
                  }}
                  onSuccess={() => {
                    setAppliedJobs((prev) => new Set([...prev, applyModalOpen]))
                    setApplyModalOpen(null)
                  }}
                />
              )}

              <DeleteConfirmModal
                open={deleteModalOpen}
                onClose={() => {
                  setDeleteModalOpen(false)
                  setSelectedJobId(null)
                }}
                onConfirm={handleDeleteJob}
              />

              <JobDetailModal
                open={detailModalOpen}
                onClose={() => {
                  setDetailModalOpen(false)
                  setSelectedJob(null)
                }}
                job={selectedJob}
              />
            </>
          )}
        </>
      )}

      {/* İşlerim tab'ı için modaller */}
      {activeTab === 'my-jobs' && (
        <>
          <JobDetailModal
            open={detailModalOpen}
            onClose={() => {
              setDetailModalOpen(false)
              setSelectedJob(null)
            }}
            job={selectedJob}
          />

          <DeleteConfirmModal
            open={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false)
              setSelectedJobId(null)
            }}
            onConfirm={handleDeleteJob}
          />
        </>
      )}
    </div>
  )
}
