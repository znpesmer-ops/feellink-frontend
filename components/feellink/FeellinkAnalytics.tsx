'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, Loader2, MapPin, BarChart3, CheckCircle, XCircle, Clock, FileText } from 'lucide-react'
import api from '@/lib/api'

type ListingAnalytics = {
  listingId: string
  title: string
  company?: string | null
  location?: string | null
  totalApplications: number
  pending: number
  accepted: number
  rejected: number
  reviewed: number
  createdAt: string
}

type AnalyticsResponse = {
  totalApplications: number
  totalPending: number
  totalAccepted: number
  totalRejected: number
  totalListings: number
  listings: ListingAnalytics[]
}

export default function FeellinkAnalytics() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchAnalytics() {
      try {
        setLoading(true)
        const response = await api.get<AnalyticsResponse>('/jobs/me/analytics')
        if (mounted) {
          setData(response.data)
        }
      } catch (err: any) {
        if (mounted) {
          const message =
            err?.response?.data?.message ?? err?.message ?? 'Analizler yüklenirken bir sorun oluştu.'
          setError(Array.isArray(message) ? message.join(' ') : message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchAnalytics()

    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#ff7b00]" />
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

  if (!data || data.listings.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300/70 bg-white/90 px-6 py-16 text-center text-gray-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
        <p className="text-lg font-medium">Henüz başvuru almış bir ilanınız bulunmuyor.</p>
        <p className="mt-2 text-sm">İlan oluşturduktan sonra burada başvuru analizlerini görebilirsiniz.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toplam İstatistikler */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-[#ff7b00]" />
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Toplam Başvuru</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.totalApplications}</p>
        </div>

        <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Bekleyen</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.totalPending}</p>
        </div>

        <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Kabul Edilen</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.totalAccepted}</p>
        </div>

        <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Reddedilen</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.totalRejected}</p>
        </div>
      </div>

      {/* İlan Bazlı Detaylar */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">İlan Bazlı Analiz</h3>
        {data.listings.map((listing) => (
          <div
            key={listing.listingId}
            className="group flex flex-col gap-4 rounded-3xl border border-gray-200/70 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 transition group-hover:text-[#ff7b00] dark:text-gray-100">
                  {listing.title}
                </h4>
                {listing.company && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Building2 className="h-4 w-4" />
                    {listing.company}
                  </p>
                )}
                {listing.location && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    {listing.location}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(listing.createdAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <Link
                href={`/fellink/${listing.listingId}?tab=applications`}
                className="inline-flex items-center gap-1 rounded-xl bg-[#ff7b00] px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-[#e96f00] focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/40"
              >
                Detayları Gör
              </Link>
            </div>

            {/* Başvuru Durumları */}
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-gray-700 dark:bg-white/5 dark:text-gray-300">
                <FileText className="h-3.5 w-3.5" />
                <span className="font-medium">Toplam: {listing.totalApplications}</span>
              </div>
              {listing.pending > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-yellow-50 px-3 py-1.5 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-200">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">Bekleyen: {listing.pending}</span>
                </div>
              )}
              {listing.accepted > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-green-700 dark:bg-green-500/10 dark:text-green-200">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span className="font-medium">Kabul: {listing.accepted}</span>
                </div>
              )}
              {listing.rejected > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-red-700 dark:bg-red-500/10 dark:text-red-200">
                  <XCircle className="h-3.5 w-3.5" />
                  <span className="font-medium">Reddedilen: {listing.rejected}</span>
                </div>
              )}
              {listing.reviewed > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="font-medium">İnceleniyor: {listing.reviewed}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}



























