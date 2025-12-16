'use client'

import { X, UserCircle2, MapPin, Building2, DollarSign, Calendar, Briefcase, FileText, Tag, ClipboardList, CheckCircle } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface PublicJobListing {
  id: string
  title: string
  description: string
  company?: string | null
  location?: string | null
  salary?: string | null
  tags: string[]
  createdAt: string
  // İleride eklenebilecek alanlar
  workMode?: string | null
  jobType?: string | null
  seniority?: string | null
  responsibilities?: string | null
  requirements?: string | null
  niceToHave?: string | null
  benefits?: string | null
  createdBy?: {
    id: string
    username: string | null
    fullName: string | null
    avatar: string | null
  } | null
}

interface JobDetailModalProps {
  open: boolean
  onClose: () => void
  job: PublicJobListing | null
}

// Modern Premium Bölüm Başlık Component'i (ikon kaldırıldı - daha temiz görünüm)
function JobSectionTitle({ icon: Icon, children, showIcon = false }: { icon: LucideIcon; children: React.ReactNode; showIcon?: boolean }) {
  return (
    <div className="mt-8 mb-3 first:mt-0">
      {showIcon ? (
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-brand-orange flex-shrink-0" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {children}
          </h3>
        </div>
      ) : (
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {children}
        </h3>
      )}
    </div>
  )
}

export function JobDetailModal({ open, onClose, job }: JobDetailModalProps) {
  if (!open || !job) return null

  // Markdown işaretlerini temizleme fonksiyonu
  const cleanText = (text: string) => {
    if (!text) return ''
    let cleaned = text
      // "İş Detayları:" başlığını ve altındaki tüm bölümü kaldır (LinkedIn tarzı için)
      .replace(/\*\*İş Detayları:\*\*\s*\n?/gi, '')
      .replace(/İş Detayları:\s*\n?/gi, '')
      // İş detayları satırlarını kaldır (Çalışma Şekli, İş Türü, Seviye)
      .replace(/[-•]\s*Çalışma Şekli:\s*[^\n]+\n?/gi, '')
      .replace(/[-•]\s*İş Türü:\s*[^\n]+\n?/gi, '')
      .replace(/[-•]\s*Seviye:\s*[^\n]+\n?/gi, '')
      // Bold işaretlerini kaldır
      .replace(/\*\*/g, '')
      // Gereksiz markdown karakterlerini temizle
      .replace(/[_#>-]/g, '')
      // Fazla boş satırları temizle
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    return cleaned
  }

  // Tarih formatı
  const dateText = new Date(job.createdAt).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // Şirket ve konum
  const companyLocation = [job.company, job.location].filter(Boolean).join(' · ')

  return (
    <>
      {/* Backdrop - Sadece içerik alanını kapsar, sidebar ve header kararmaz */}
      <div
        className="fixed top-[64px] left-0 lg:left-64 right-0 bottom-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-[64px] left-0 lg:left-64 right-0 bottom-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[calc(100vh-80px)] overflow-y-auto pointer-events-auto transform transition-all duration-200 scale-100 opacity-100 border border-blue-100 dark:border-blue-900/30"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6 z-10">
            <div className="grid grid-cols-[1fr_auto_auto] items-start gap-4">
              {/* SOL: İlan / Kurum */}
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-100 mb-2 truncate">
                  {job.title}
                </h2>
                {companyLocation && (
                  <p className="text-sm text-blue-600/70 dark:text-blue-400/70 truncate">
                    {companyLocation}
                  </p>
                )}
              </div>

              {/* ORTA: Kullanıcı */}
              {job.createdBy && (
                <div className="flex items-start gap-2 whitespace-nowrap">
                  {job.createdBy.avatar ? (
                    <img
                      src={job.createdBy.avatar}
                      alt={job.createdBy.username ?? 'Profil'}
                      className="h-10 w-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700 flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700 flex-shrink-0 mt-0.5">
                      <UserCircle2 className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex flex-col leading-tight">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {job.createdBy.fullName || job.createdBy.username || 'Kullanıcı'}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{dateText}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SAĞ: Kapat */}
              <button
                onClick={onClose}
                className="ml-2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                aria-label="Kapat"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6">

            {/* Maaş bilgisi */}
            {job.salary && (
              <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-brand-orange flex-shrink-0" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Maaş
                  </p>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {job.salary}
                </p>
              </div>
            )}

            {/* İlan Açıklaması */}
            <div>
              <JobSectionTitle icon={FileText} showIcon={false}>
                İlan Açıklaması
              </JobSectionTitle>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line mt-2 mb-4">
                {cleanText(job.description)}
              </div>
            </div>

            {/* İş Detayları bölümü kaldırıldı - bilgiler zaten etiketler olarak kartlarda gösteriliyor */}

            {/* Sorumluluklar */}
            {job.responsibilities && (
              <div>
                <JobSectionTitle icon={ClipboardList} showIcon={false}>
                  Sorumluluklar
                </JobSectionTitle>
                <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line mt-2">
                  {cleanText(job.responsibilities)}
                </div>
              </div>
            )}

            {/* Gereksinimler */}
            {job.requirements && (
              <div>
                <JobSectionTitle icon={CheckCircle} showIcon={false}>
                  Gereksinimler
                </JobSectionTitle>
                <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line mt-2">
                  {cleanText(job.requirements)}
                </div>
              </div>
            )}

            {/* Etiketler - Başlık kaldırıldı, LinkedIn tarzı, mavi-turuncu tema */}
            {job.tags.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-2">
                  {job.tags.map((tag, index) => {
                    // Seviye etiketlerini turuncu, diğerlerini mavi yap
                    const isLevelTag = /junior|mid|senior|lead|stajyer|intern/i.test(tag)
                    const tagClasses = isLevelTag
                      ? 'px-3 py-1 text-xs font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/30'
                      : 'px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30'
                    
                    return (
                      <span
                        key={tag}
                        className={tagClasses}
                      >
                        {tag}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={onClose}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors font-medium"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

