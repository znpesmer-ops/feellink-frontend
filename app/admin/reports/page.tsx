'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Search, AlertCircle, CheckCircle, Clock, XCircle, Eye } from 'lucide-react'

interface Report {
  id: string
  reporterId: string
  reportedUserId: string
  conversationId?: string
  messageId?: string
  reason: 'HARASSMENT' | 'SPAM' | 'HATE_SPEECH' | 'IMPERSONATION' | 'INAPPROPRIATE_CONTENT'
  note?: string
  status: 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'REJECTED'
  createdAt: string
  reporter: {
    id: string
    username: string
    avatar?: string
    fullName?: string
  }
  reportedUser: {
    id: string
    username: string
    avatar?: string
    fullName?: string
  }
}

const reasonLabels: Record<Report['reason'], string> = {
  HARASSMENT: 'Taciz / Zorbalık',
  SPAM: 'Spam / Dolandırıcılık',
  HATE_SPEECH: 'Nefret Söylemi',
  IMPERSONATION: 'Taklit / Sahte Hesap',
  INAPPROPRIATE_CONTENT: 'Uygunsuz İçerik',
}

const statusConfig: Record<Report['status'], { label: string; color: string; icon: any }> = {
  OPEN: { label: 'Açık', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: AlertCircle },
  REVIEWING: { label: 'İnceleniyor', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
  RESOLVED: { label: 'Çözüldü', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  REJECTED: { label: 'Reddedildi', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchReports()
  }, [page, selectedStatus])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', '20')
      if (selectedStatus) {
        params.append('status', selectedStatus)
      }
      const response = await api.get(`/admin/reports?${params.toString()}`)
      setReports(response.data.reports)
      setTotal(response.data.total)
    } catch (err) {
      console.error('Error fetching reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    try {
      await api.patch(`/admin/reports/${reportId}`, { status: newStatus })
      await fetchReports()
      if (selectedReport?.id === reportId) {
        setSelectedReport({ ...selectedReport, status: newStatus as Report['status'] })
      }
    } catch (error) {
      console.error('Error updating report status:', error)
      alert('Durum güncellenirken bir hata oluştu')
    }
  }

  const handleViewDetails = async (reportId: string) => {
    try {
      const response = await api.get(`/admin/reports/${reportId}`)
      setSelectedReport(response.data)
    } catch (error) {
      console.error('Error fetching report details:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7b00]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold dark:text-white text-gray-900">Şikayetler</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Toplam {total} şikayet
          </p>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedStatus('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedStatus === ''
              ? 'bg-brand-orange text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Tümü
        </button>
        {Object.entries(statusConfig).map(([status, config]) => {
          const Icon = config.icon
          return (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedStatus === status
                  ? 'bg-brand-orange text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={16} />
              {config.label}
            </button>
          )
        })}
      </div>

      {/* Şikayetler Listesi */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Şikayet Eden
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Şikayet Edilen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Sebep
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Şikayet bulunamadı
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const statusInfo = statusConfig[report.status]
                  const StatusIcon = statusInfo.icon
                  return (
                    <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {report.reporter.avatar ? (
                            <img
                              src={report.reporter.avatar}
                              alt={report.reporter.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#ff7b00] flex items-center justify-center text-white font-semibold text-xs">
                              {report.reporter.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {report.reporter.fullName || report.reporter.username}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              @{report.reporter.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {report.reportedUser.avatar ? (
                            <img
                              src={report.reportedUser.avatar}
                              alt={report.reportedUser.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#ff7b00] flex items-center justify-center text-white font-semibold text-xs">
                              {report.reportedUser.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {report.reportedUser.fullName || report.reportedUser.username}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              @{report.reportedUser.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {reasonLabels[report.reason]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(report.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
                        >
                          <StatusIcon size={12} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(report.id)}
                          className="text-brand-orange hover:text-brand-orange/80 flex items-center gap-1"
                        >
                          <Eye size={16} />
                          Detay
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sayfalama */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Önceki
          </button>
          <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
            Sayfa {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sonraki
          </button>
        </div>
      )}

      {/* Detay Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="w-[600px] max-h-[80vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Şikayet Detayı</h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Şikayet Eden</label>
                <div className="mt-1 flex items-center gap-2">
                  {selectedReport.reporter.avatar ? (
                    <img
                      src={selectedReport.reporter.avatar}
                      alt={selectedReport.reporter.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#ff7b00] flex items-center justify-center text-white font-semibold">
                      {selectedReport.reporter.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedReport.reporter.fullName || selectedReport.reporter.username}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      @{selectedReport.reporter.username}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Şikayet Edilen</label>
                <div className="mt-1 flex items-center gap-2">
                  {selectedReport.reportedUser.avatar ? (
                    <img
                      src={selectedReport.reportedUser.avatar}
                      alt={selectedReport.reportedUser.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#ff7b00] flex items-center justify-center text-white font-semibold">
                      {selectedReport.reportedUser.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedReport.reportedUser.fullName || selectedReport.reportedUser.username}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      @{selectedReport.reportedUser.username}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Sebep</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {reasonLabels[selectedReport.reason]}
                </p>
              </div>

              {selectedReport.note && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Not</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedReport.note}</p>
                </div>
              )}

              {selectedReport.conversationId && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Konuşma ID</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                    {selectedReport.conversationId}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Tarih</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {new Date(selectedReport.createdAt).toLocaleString('tr-TR')}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">Durum</label>
                <div className="flex gap-2">
                  {Object.entries(statusConfig).map(([status, config]) => {
                    const Icon = config.icon
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(selectedReport.id, status)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                          selectedReport.status === status
                            ? config.color
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon size={14} />
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}








