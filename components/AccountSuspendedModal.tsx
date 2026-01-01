'use client'

import { useEffect, useState } from 'react'
import { XCircle, AlertCircle } from 'lucide-react'

interface SuspensionData {
  reason: string
  until: string | null
}

export function AccountSuspendedModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [suspensionData, setSuspensionData] = useState<SuspensionData | null>(null)

  useEffect(() => {
    const handleSuspension = (event: CustomEvent<SuspensionData>) => {
      setSuspensionData(event.detail)
      setIsOpen(true)
    }

    window.addEventListener('account-suspended', handleSuspension as EventListener)

    return () => {
      window.removeEventListener('account-suspended', handleSuspension as EventListener)
    }
  }, [])

  if (!isOpen || !suspensionData) return null

  const untilDate = suspensionData.until ? new Date(suspensionData.until) : null
  const isExpired = untilDate && untilDate < new Date()

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">
              Hesabınız Askıya Alındı
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Hesabınız geçici olarak askıya alınmıştır. Bu süre boyunca yeni içerik paylaşamaz, yorum yapamaz veya mesaj gönderemezsiniz.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Neden:</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{suspensionData.reason}</p>
              </div>
              {untilDate && !isExpired && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bitiş Tarihi:</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {untilDate.toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
              {isExpired && (
                <div>
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Durum:</p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Askı süresi doldu. Hesabınız yakında aktif hale gelecektir.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              Anladım
            </button>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}





