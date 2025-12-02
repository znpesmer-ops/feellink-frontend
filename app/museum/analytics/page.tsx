'use client'

import { Landmark, BarChart3, Users, TrendingUp, Calendar, MapPin } from 'lucide-react'

export default function MuseumAnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Ziyaretçi Analizi</h1>
          <p className="text-[var(--sub)] mt-1">Müze ziyaretçi verilerinizi analiz edin</p>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[var(--muted)] flex items-center justify-center">
          <BarChart3 className="w-12 h-12 text-[var(--sub)]" />
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text)] mb-3">
          Ziyaretçi Analizi Yakında
        </h2>
        <p className="text-[var(--sub)] max-w-md mx-auto mb-6">
          Bu sayfada müze ziyaretçi verilerinizi görüntüleyebilir, trend analizleri yapabilir ve raporlar oluşturabilirsiniz.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--muted)] text-[var(--sub)]">
            <Users className="w-4 h-4" />
            <span className="text-sm">Ziyaretçi Sayıları</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--muted)] text-[var(--sub)]">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Trend Analizi</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--muted)] text-[var(--sub)]">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Zaman Bazlı Raporlar</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--muted)] text-[var(--sub)]">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">Coğrafi Dağılım</span>
          </div>
        </div>
      </div>
    </div>
  )
}






















