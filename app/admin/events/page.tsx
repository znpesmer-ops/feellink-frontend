'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Calendar, Users, Trash2 } from 'lucide-react'

interface Event {
  id: string
  title: string
  description: string | null
  date: string
  participantCount: number
  createdAt: string
  owner: {
    id: string
    username: string
    avatar: string | null
  }
  _count: {
    participants: number
    tickets: number
  }
}

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchEvents()
  }, [page])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/admin/events?page=${page}&limit=20`)
      setEvents(response.data.events)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
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
      <h2 className="text-3xl font-bold dark:text-white text-gray-900">Etkinlikler</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm p-6 dark:bg-[#111] bg-white hover:shadow-md transition-all"
          >
            <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-2">
              {event.title}
            </h3>
            {event.description && (
              <p className="text-sm dark:text-gray-400 text-gray-600 mb-4 line-clamp-2">
                {event.description}
              </p>
            )}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600">
                <Calendar className="w-4 h-4" />
                {new Date(event.date).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
              <div className="flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600">
                <Users className="w-4 h-4" />
                {event._count.participants} katılımcı
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                {event.owner.avatar ? (
                  <img
                    src={event.owner.avatar}
                    alt={event.owner.username}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#ff7b00] flex items-center justify-center text-white text-xs font-semibold">
                    {event.owner.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs dark:text-gray-400 text-gray-600">
                  {event.owner.username}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm dark:text-gray-400 text-gray-600">
          Toplam {total} etkinlik
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-[#0d0d0d] bg-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
          >
            Önceki
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 20 >= total}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-[#0d0d0d] bg-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>
  )
}





































