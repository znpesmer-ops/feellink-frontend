'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Ticket, User, Calendar } from 'lucide-react'

interface TicketPurchase {
  id: string
  code: string
  used: boolean
  createdAt: string
  user: {
    id: string
    username: string
    avatar: string | null
  }
  ticket: {
    id: string
    type: string
    price: number
    event: {
      id: string
      title: string
    }
  }
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState<TicketPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchTickets()
  }, [page])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/admin/tickets?page=${page}&limit=20`)
      setTickets(response.data.tickets)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Error fetching tickets:', error)
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
      <h2 className="text-3xl font-bold dark:text-white text-gray-900">Biletler</h2>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm dark:bg-[#111] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0d0d0d] border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kod
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Etkinlik
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tip
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fiyat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tarih
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-[#0d0d0d]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm font-mono dark:text-[#ff7b00] text-[#ff7b00]">
                      {ticket.code}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium dark:text-white text-gray-900">
                      {ticket.ticket.event.title}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {ticket.user.avatar ? (
                        <img
                          src={ticket.user.avatar}
                          alt={ticket.user.username}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#ff7b00] flex items-center justify-center text-white text-xs font-semibold">
                          {ticket.user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm dark:text-gray-300 text-gray-700">
                        {ticket.user.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-300 text-gray-700">
                    {ticket.ticket.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold dark:text-[#ff7b00] text-[#ff7b00]">
                    ₺{ticket.ticket.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        ticket.used
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {ticket.used ? 'Kullanıldı' : 'Aktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-400 text-gray-600">
                    {new Date(ticket.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm dark:text-gray-400 text-gray-600">
            Toplam {total} bilet
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
    </div>
  )
}











