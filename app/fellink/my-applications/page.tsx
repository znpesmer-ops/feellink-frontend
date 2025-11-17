'use client'

import { useEffect, useState } from 'react'
import { Loader2, Building2, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'

interface JobApplication {
  id: string
  coverLetter?: string | null
  portfolioUrl?: string | null
  cvUrl?: string | null
  status: 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED'
  createdAt: string
  jobListing: {
    id: string
    title: string
    company?: string | null
    createdBy: {
      id: string
      username: string | null
      fullName: string | null
      avatar: string | null
    }
  }
}

export default function MyApplicationsPage() {
  const router = useRouter()
  const { accessToken, user } = useAuthStore()
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) {
      router.push('/login')
      return
    }

    async function fetchApplications() {
      try {
        setLoading(true)
        const response = await api.get<JobApplication[]>('/jobs/me/applications')
        setApplications(response.data || [])
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Başvurular yüklenirken bir hata oluştu')
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [accessToken, router])

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

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Başvurduğum İlanlar</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Tüm başvurularınızı buradan görüntüleyebilirsiniz.
        </p>
      </header>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300/70 bg-white/90 px-6 py-16 text-center text-gray-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
          <p className="text-lg font-medium">Henüz hiçbir ilana başvurmadınız.</p>
          <Link
            href="/fellink/public"
            className="mt-4 inline-block rounded-xl bg-[#ff7b00] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e96f00]"
          >
            İlanları Görüntüle
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <div
              key={application.id}
              className="rounded-3xl border border-gray-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Building2 className="h-5 w-5 text-[#ff7b00]" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {application.jobListing.title}
                      </h3>
                      {application.jobListing.company && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{application.jobListing.company}</p>
                      )}
                    </div>
                  </div>

                  {application.coverLetter && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                      {application.coverLetter}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(application.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    {application.portfolioUrl && (
                      <a
                        href={application.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#ff7b00] hover:underline"
                      >
                        Portfolyo
                      </a>
                    )}
                  </div>
                </div>

                <div>{getStatusBadge(application.status)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

