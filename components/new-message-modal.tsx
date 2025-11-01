'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'

interface User {
  id: string
  username: string
  fullName?: string
  avatar?: string
  isVerified?: boolean
}

interface NewMessageModalProps {
  onClose: () => void
  onSelect: (conversationId: string) => void
}

export function NewMessageModal({ onClose, onSelect }: NewMessageModalProps) {
  const { accessToken } = useAuthStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim().length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await api.get(`/users/search?q=${encodeURIComponent(query.trim())}`)
        setResults(response.data || [])
      } catch (error) {
        console.error('Failed to search users:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, accessToken])

  const startConversation = async (recipientId: string) => {
    if (starting) return

    setStarting(recipientId)
    try {
      const response = await api.post('/chat/conversations', {
        participantIds: [recipientId],
      })
      onSelect(response.data.id)
      onClose()
    } catch (error: any) {
      console.error('Failed to start conversation:', error)
      alert(error.response?.data?.message || 'Konuşma başlatılamadı')
    } finally {
      setStarting(null)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Yeni Mesaj
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kullanıcı ara..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:text-white"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500 dark:text-gray-400 text-sm">Aranıyor...</div>
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500 dark:text-gray-400 text-sm text-center">
                <p>Kullanıcı bulunamadı</p>
                <p className="text-xs mt-1">Farklı bir arama terimi deneyin</p>
              </div>
            </div>
          )}

          {!loading && query.trim().length < 2 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500 dark:text-gray-400 text-sm text-center">
                <p>Kullanıcı adı veya isim yazın</p>
              </div>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startConversation(user.id)}
                  disabled={starting === user.id}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="relative flex-shrink-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-600 dark:text-gray-300 font-semibold">
                          {user.username[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    {user.isVerified && (
                      <span className="absolute -bottom-1 -right-1 text-blue-500 text-xs">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {user.fullName || user.username}
                      </p>
                      {user.isVerified && (
                        <span className="text-blue-500 flex-shrink-0">✓</span>
                      )}
                    </div>
                    {user.fullName && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        @{user.username}
                      </p>
                    )}
                  </div>
                  {starting === user.id && (
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

