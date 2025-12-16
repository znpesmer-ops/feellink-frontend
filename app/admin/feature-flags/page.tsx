'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { ToggleLeft, ToggleRight } from 'lucide-react'

interface FeatureFlag {
  key: string
  enabled: boolean
  note: string | null
  updatedAt: string
}

export default function AdminFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFlags()
  }, [])

  const fetchFlags = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/feature-flags')
      setFlags(response.data)
    } catch (error) {
      console.error('Error fetching feature flags:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFlag = async (key: string, currentEnabled: boolean) => {
    try {
      await api.post('/admin/feature-flags', {
        key,
        enabled: !currentEnabled,
      })
      setFlags(
        flags.map((flag) =>
          flag.key === key ? { ...flag, enabled: !currentEnabled } : flag
        )
      )
    } catch (error) {
      console.error('Error toggling feature flag:', error)
      alert('Feature flag güncellenirken bir hata oluştu')
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
    <div className="space-y-6">
      <h2 className="text-3xl font-bold dark:text-white text-gray-900">Feature Flags</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {flags.map((flag) => (
          <div
            key={flag.key}
            className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm p-6 dark:bg-[#111] bg-white"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold dark:text-white text-gray-900">
                {flag.key}
              </h3>
              <button
                onClick={() => toggleFlag(flag.key, flag.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  flag.enabled ? 'bg-[#ff7b00]' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    flag.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {flag.note && (
              <p className="text-sm dark:text-gray-400 text-gray-600 mb-2">{flag.note}</p>
            )}
            <p className="text-xs dark:text-gray-500 text-gray-500">
              Son güncelleme: {new Date(flag.updatedAt).toLocaleDateString('tr-TR')}
            </p>
          </div>
        ))}
      </div>

      {flags.length === 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm p-6 dark:bg-[#111] bg-white text-center">
          <p className="text-sm dark:text-gray-400 text-gray-600">
            Henüz feature flag tanımlanmamış.
          </p>
        </div>
      )}
    </div>
  )
}





































