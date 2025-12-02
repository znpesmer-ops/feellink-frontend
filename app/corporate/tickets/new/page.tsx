'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { Loader2, Ticket, Calendar, X } from 'lucide-react'

interface Event {
  id: string
  title: string
  description?: string
  coverImage?: string
  date: string
}

export default function NewTicketPage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [showTicketForm, setShowTicketForm] = useState(false)

  useEffect(() => {
    // Layout'ta zaten kontrol ediliyor, sadece etkinlikleri yükle
    async function fetchEvents() {
      try {
        const res = await api.get('/events/my')
        setEvents(res.data)
      } catch (err) {
        console.error('Etkinlikler alınamadı:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
    setIsChecking(false)
  }, [])

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff7b00]"></div>
      </div>
    )
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  return (
    <div className="max-w-4xl mx-auto pt-8 px-4 pb-20">
        <div className="bg-white dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700/40 rounded-2xl p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-[#ff7b00] mb-2">
            🎟️ Yeni Bilet Oluştur
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Etkinlik seçin ve bilet bilgilerini girin
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#ff7b00]" />
            </div>
          ) : !showTicketForm ? (
            <EventSelectionStep
              events={events}
              onSelectEvent={(eventId) => {
                setSelectedEventId(eventId)
                setShowTicketForm(true)
              }}
            />
          ) : selectedEvent ? (
            <TicketFormStep
              event={selectedEvent}
              onBack={() => {
                setShowTicketForm(false)
                setSelectedEventId(null)
              }}
              onSuccess={() => router.push('/events?tab=mine')}
            />
          ) : null}
        </div>
      </div>
  )
}

function EventSelectionStep({
  events,
  onSelectEvent,
}: {
  events: Event[]
  onSelectEvent: (eventId: string) => void
}) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Henüz etkinlik oluşturmamışsınız.
        </p>
        <a
          href="/corporate/events/new"
          className="text-[#ff7b00] hover:underline font-medium"
        >
          Önce bir etkinlik oluşturun →
        </a>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Etkinlik Seçin
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {events.map((event) => (
          <button
            key={event.id}
            onClick={() => onSelectEvent(event.id)}
            className="text-left p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-[#ff7b00] hover:bg-[#ff7b00]/5 transition group"
          >
            <div className="flex gap-4">
              {event.coverImage && (
                <img
                  src={event.coverImage}
                  alt={event.title}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#ff7b00] transition mb-1">
                  {event.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar size={14} />
                  {new Date(event.date).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                {event.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function TicketFormStep({
  event,
  onBack,
  onSuccess,
}: {
  event: Event
  onBack: () => void
  onSuccess: () => void
}) {
  const [type, setType] = useState('')
  const [price, setPrice] = useState('')
  const [capacity, setCapacity] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!type.trim() || !price.trim() || !capacity.trim()) {
      toast.error('Tüm alanlar zorunludur.')
      return
    }

    setLoading(true)
    try {
      await api.post('/tickets', {
        eventId: event.id,
        type: type.trim(),
        price: parseFloat(price),
        capacity: parseInt(capacity),
      })
      toast.success('🎟️ Bilet başarıyla oluşturuldu!')
      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (err: any) {
      console.error('Bilet oluşturma hatası:', err)
      toast.error(err.response?.data?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Seçilen Etkinlik Bilgisi */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Etkinlik: {event.title}
          </h2>
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Calendar size={14} />
          {new Date(event.date).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      {/* Bilet Formu */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bilet Türü *
          </label>
          <input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
            placeholder="Örn: Genel Giriş, VIP, Öğrenci"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fiyat (₺) *
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.01"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kapasite (Adet) *
            </label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min="1"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
              placeholder="100"
              required
            />
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Geri
          </button>
          <button
            type="submit"
            disabled={loading || !type.trim() || !price.trim() || !capacity.trim()}
            className="flex-1 bg-[#ff7b00] hover:bg-[#e36f00] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2.5 rounded-xl transition font-medium flex justify-center items-center"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Oluşturuluyor...
              </>
            ) : (
              <>
                <Ticket size={18} className="mr-2" />
                Bilet Oluştur
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

