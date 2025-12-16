'use client'

import { useEffect, useState } from 'react'
import { Loader2, Building2, Calendar, Users, Eye, Trash2, MoreVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { JobDetailModal } from '@/components/jobs/JobDetailModal'
import { DeleteConfirmModal } from '@/components/jobs/DeleteConfirmModal'
import toast from 'react-hot-toast'

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

export default function MyJobsPage() {
  const router = useRouter()
  const { accessToken, user } = useAuthStore()
  const [jobs, setJobs] = useState<MyJobListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<MyJobListing | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) {
      router.push('/login')
      return
    }

    async function fetchMyJobs() {
      try {
        setLoading(true)
        const response = await api.get<MyJobListing[]>('/jobs/me')
        setJobs(response.data || [])
      } catch (err: any) {
        const message =
          err?.response?.data?.message ?? err?.message ?? 'İlanlar yüklenirken bir sorun oluştu.'
        setError(Array.isArray(message) ? message.join(' ') : message)
      } finally {
        setLoading(false)
      }
    }

    fetchMyJobs()
  }, [accessToken, router])

  const handleJobClick = (job: MyJobListing) => {
    setSelectedJob(job)
    setDetailModalOpen(true)
  }

  const handleDeleteJob = async () => {
    if (!selectedJobId) return

    try {
      await api.delete(`/jobs/${selectedJobId}`)
      setJobs((prev) => prev.filter((job) => job.id !== selectedJobId))
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

  const openDeleteModal = (jobId: string) => {
    setSelectedJobId(jobId)
    setDeleteModalOpen(true)
    setOpenMenuId(null)
  }

  const cleanText = (text: string) => {
    if (!text) return ''
    return text
      .replace(/\*\*/g, '')
      .replace(/[_#>-]/g, '')
      .trim()
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <header className="mb-10 flex flex-col gap-3 rounded-3xl border border-transparent bg-white/80 px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between dark:border-white/5 dark:bg-white/5">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">İşlerim</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Açtığınız ilanları ve başvuruları buradan yönetebilirsiniz.
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-orange/90 md:mt-0"
        >
          + Yeni İlan Oluştur
        </Link>
      </header>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300/70 bg-white/90 px-6 py-16 text-center text-gray-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
          <p className="text-lg font-medium">Henüz hiç ilan açmadınız.</p>
          <Link
            href="/jobs/new"
            className="mt-4 inline-block rounded-xl bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-orange/90"
          >
            İlk İlanınızı Oluşturun
          </Link>
        </div>
      ) : (
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
                onClick={() => handleJobClick(job)}
                className="group relative flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-gray-600 cursor-pointer"
              >
                <div className="space-y-3">
                  {/* Başlık */}
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
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
                    <div className="flex flex-wrap gap-1.5">
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
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
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
                        router.push(`/fellink/my-jobs/${job.id}/applications`)
                      }}
                      className="mt-3 w-full rounded-lg border border-orange-500 px-4 py-1.5 text-sm font-medium text-orange-500 hover:bg-orange-500 hover:text-white transition"
                    >
                      Başvuruları Gör
                    </button>
                  )}
                </div>

                {/* Sağ alt köşe - Üç nokta menü */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
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
              </article>
            )
          })}
        </div>
      )}

      {/* İlan Detay Modal'ı */}
      <JobDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedJob(null)
        }}
        job={selectedJob}
      />

      {/* Silme Onay Modal'ı */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setSelectedJobId(null)
        }}
        onConfirm={handleDeleteJob}
      />
    </div>
  )
}


