'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'

interface ModerationItem {
  id: string
  type: 'post' | 'comment' | 'user'
  reason: string
  status: 'pending' | 'reviewed' | 'resolved'
  createdAt: string
  reporter?: {
    username: string
    avatar: string | null
  }
  target?: {
    id: string
    username?: string
    content?: string
  }
}

export default function AdminModerationPage() {
  const [items, setItems] = useState<ModerationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchModerationItems()
  }, [])

  const fetchModerationItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/admin/moderation')
      setItems(response.data.items || [])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Veriler yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
            Beklemede
          </span>
        )
      case 'reviewed':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
            İncelendi
          </span>
        )
      case 'resolved':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
            Çözüldü
          </span>
        )
      default:
        return null
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'post':
        return 'Gönderi'
      case 'comment':
        return 'Yorum'
      case 'user':
        return 'Kullanıcı'
      default:
        return type
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7a00]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="text-[#ff7a00]" />
            Moderasyon Paneli
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Kullanıcı raporlarını, spam içerikleri ve inceleme bekleyen öğeleri yönetin
          </p>
        </div>
        <button
          onClick={fetchModerationItems}
          className="flex items-center gap-2 px-4 py-2 bg-[#ff7a00] hover:bg-[#ff9500] text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800/40 shadow-sm p-6 bg-red-50 dark:bg-red-900/10">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm p-12 dark:bg-[#111] bg-white text-center">
          <Shield className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            İnceleme Bekleyen Öğe Yok
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Şu anda moderasyon için bekleyen rapor veya içerik bulunmuyor.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm dark:bg-[#111] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tip
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sebep
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getTypeLabel(item.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 dark:text-white">{item.reason}</p>
                      {item.target?.content && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs">
                          {item.target.content}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Onayla"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Reddet"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm p-6 dark:bg-[#111] bg-white">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Moderasyon Sistemi
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Bu panelde kullanıcı raporlarını, spam içerikleri ve inceleme bekleyen gönderileri
              yönetebilirsiniz. Rapor sistemi yakında aktif olacak.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


