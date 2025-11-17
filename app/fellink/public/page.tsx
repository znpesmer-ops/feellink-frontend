'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, Loader2, MapPin, Sparkles, UserCircle2, BarChart3 } from 'lucide-react'

import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { ApplyModal } from '@/components/jobs/ApplyModal'
import FeellinkAnalytics from '@/components/feellink/FeellinkAnalytics'

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

export default function PublicFellinkListingsPage() {
  const { user, capabilities, accessToken } = useAuthStore()
  const [jobs, setJobs] = useState<PublicJobListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applyModalOpen, setApplyModalOpen] = useState<string | null>(null)
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'listings' | 'analytics'>('listings')

  // Rol bazlı kontrol: sadece corporate ve collector ilan oluşturabilir
  const roles = capabilities?.roles ?? user?.roles ?? []
  const canCreateJob = roles.includes('corporate') || roles.includes('collector')
  const canApply = !canCreateJob && !!accessToken // İlan açamayanlar başvurabilir

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
      if (!accessToken || !canApply) return
      
      try {
        const applied = await api.get('/jobs/me/applications')
        if (mounted && applied.data) {
          const jobIds = applied.data.map((app: any) => app.jobListingId)
          setAppliedJobs(new Set(jobIds))
        }
      } catch (err) {
        // Silent fail - not critical
      }
    }

    fetchJobs()
    checkApplications()

    return () => {
      mounted = false
    }
  }, [accessToken, canApply])

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 text-gray-900 dark:text-gray-100">
      <header className="mb-10 flex flex-col gap-3 rounded-3xl border border-transparent bg-white/80 px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between dark:border-white/5 dark:bg-white/5 dark:text-gray-100">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50/80 px-3 py-1 text-sm font-medium text-[#ff7b00] dark:bg-orange-500/15 dark:text-orange-200">
            <Sparkles className="h-4 w-4" />
            Feellink İş İlanları
          </div>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {canCreateJob && activeTab === 'analytics' ? 'Başvurular & Analiz' : 'Topluluk ilanlarını keşfet'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {canCreateJob && activeTab === 'analytics'
              ? 'İlanlarınıza gelen başvuruların detaylı analizini buradan görüntüleyebilirsiniz.'
              : 'Feellink ekosistemindeki kurum ve koleksiyonerlerin paylaştığı güncel iş & proje fırsatları burada.'}
          </p>
        </div>

        {canCreateJob && activeTab === 'listings' && (
          <Link
            href="/fellink"
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff7b00] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-[#e96f00] focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/40"
          >
            + İlan Oluştur
          </Link>
        )}
      </header>

      {/* Sekmeler - Sadece ilan oluşturma yetkisi olanlar için */}
      {canCreateJob && (
        <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'listings'
                ? 'border-b-2 border-[#ff7b00] text-[#ff7b00]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            İlanlar
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 text-sm font-medium transition flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'border-b-2 border-[#ff7b00] text-[#ff7b00]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Başvurular & Analiz
          </button>
        </div>
      )}

      {/* İçerik */}
      {canCreateJob && activeTab === 'analytics' ? (
        <FeellinkAnalytics />
      ) : (
        <>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff7b00]" />
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

              return (
                <article
                  key={job.id}
                  className="group flex h-full flex-col justify-between rounded-3xl border border-gray-200/70 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 transition group-hover:text-[#ff7b00] dark:text-gray-100">
                          {job.title}
                        </h2>
                        {job.company && (
                          <p className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <Building2 className="h-4 w-4" />
                            {job.company}
                          </p>
                        )}
                        {job.location && (
                          <p className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </p>
                        )}
                      </div>
                      {job.createdBy && (
                        <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-white/10 dark:text-gray-300">
                          {job.createdBy.avatar ? (
                            <img
                              src={job.createdBy.avatar}
                              alt={job.createdBy.username ?? 'Profil'}
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <UserCircle2 className="h-5 w-5" />
                          )}
                          <span>{job.createdBy.fullName || job.createdBy.username || 'Feellink üyesi'}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-sm leading-relaxed text-gray-600 line-clamp-4 dark:text-gray-300">
                      {job.description}
                    </p>

                    {job.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-[#ff7b00] dark:bg-orange-500/10 dark:text-orange-200"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      <span>{new Date(job.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      {job.salary && <span className="ml-2 font-medium text-[#ff7b00]">{job.salary}</span>}
                    </div>
                    
                    {canApply && !isOwner && (
                      <div>
                        {hasApplied ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600 dark:bg-green-500/10 dark:text-green-200">
                            ✓ Başvurdun
                          </span>
                        ) : (
                          <button
                            onClick={() => setApplyModalOpen(job.id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#ff7b00] px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-[#e96f00] focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/40"
                          >
                            İlana Başvur
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
        </>
      )}
        </>
      )}
    </div>
  )
}



