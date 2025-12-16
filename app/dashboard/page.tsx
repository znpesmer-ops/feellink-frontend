'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Loader2, Sparkles } from 'lucide-react'

type DashboardSnapshot = {
  role: string
  plan: 'standard' | 'pro'
  title: string
  features: string[]
}

type DashboardResponse = {
  id: string
  username: string
  email: string
  fullName?: string | null
  roles: string[]
  plan: string
  dashboard: DashboardSnapshot
}

const ROLE_LABELS: Record<string, string> = {
  artist: 'Sanatçı',
  collector: 'Koleksiyoner',
  corporate: 'Kurumsal',
  art_lover: 'Sanat Sever',
}

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Standart',
  standard: 'Standart',
  PRO: 'Profesyonel',
  pro: 'Profesyonel',
}

export default function DashboardPage() {
  const [payload, setPayload] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchDashboard = async () => {
      try {
        const response = await api.get('/users/me')
        if (!cancelled) {
          setPayload(response.data as DashboardResponse)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Kişiselleştirilmiş panel yüklenirken bir problem oluştu.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchDashboard()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-3 text-feellink-dark/70">
        <Loader2 className="h-6 w-6 animate-spin text-feellink-blue" />
        <span>Panelin hazırlanıyor...</span>
      </div>
    )
  }

  if (error || !payload) {
    return (
      <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <h2 className="text-lg font-semibold">Panel Yüklenemedi</h2>
        <p className="mt-2 text-sm">{error ?? 'Lütfen daha sonra tekrar deneyin.'}</p>
      </div>
    )
  }

  const role = payload.roles?.[0] ?? payload.dashboard.role
  const roleLabel = ROLE_LABELS[role] ?? role
  // Plan label kaldırıldı - artık kullanılmıyor

  return (
    <div className="mx-auto mt-10 flex w-full max-w-3xl flex-col gap-8 px-4 pb-16">
      <header className="rounded-3xl border border-feellink-blue/10 bg-white p-8 shadow-md shadow-feellink-blue/10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-feellink-dark">
              <Sparkles className="h-5 w-5 text-feellink-orange" />
              {payload.dashboard.title}
            </h1>
            <p className="mt-3 text-sm text-feellink-dark/70">
              Rolün <strong className="text-feellink-dark">{roleLabel}</strong>
            </p>
          </div>
          <div className="rounded-2xl border border-feellink-blue/30 bg-feellink-light px-4 py-2 text-xs font-semibold uppercase text-feellink-blue">
            Feellink Kişisel Deneyim
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-feellink-light bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-feellink-dark">Senin İçin Açılan Özellikler</h2>
        <ul className="mt-4 space-y-3 text-sm text-feellink-dark/80">
          {payload.dashboard.features.map((feature, index) => (
            <li key={index} className="flex items-center gap-3">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-feellink-blue/10 text-sm font-semibold text-feellink-blue">
                ✔
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-feellink-light bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-feellink-dark/60">Rolünü Yönet</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button 
            onClick={() => window.location.href = '/select-role'}
            className="rounded-xl border border-feellink-blue px-4 py-2 text-sm font-medium text-feellink-blue transition hover:bg-feellink-blue hover:text-white"
          >
            Rolünü Güncelle
          </button>
        </div>
      </section>
    </div>
  )
}































