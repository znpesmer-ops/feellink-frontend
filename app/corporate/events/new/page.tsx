'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import api from '@/lib/api'

export default function NewEventPage() {
  return (
    <div className="max-w-4xl mx-auto pt-8 px-4 pb-20">
        <div className="bg-white dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700/40 rounded-2xl p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-[#ff7b00] mb-2">
            🎟️ Yeni Etkinlik Oluştur
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Etkinlik bilgilerini doldurun ve yayınlayın
          </p>
          
          <EventForm />
        </div>
      </div>
  )
}

function EventForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverImage(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date.trim()) {
      toast.error('Etkinlik adı ve tarihi gerekli.')
      return
    }

    setLoading(true)
    try {
      let coverUrl = null

      if (coverImage) {
        const formData = new FormData()
        formData.append('file', coverImage)
        const upload = await api.post('/media/upload?type=image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        coverUrl = upload.data.url
      }

      // Tarih ve saat birleştirme
      const dateTime = time ? `${date}T${time}` : date

      await api.post('/events', {
        title,
        description,
        date: dateTime,
        coverImage: coverUrl,
        location,
      })

      toast.success('🎉 Etkinlik başarıyla oluşturuldu!')
      setTimeout(() => {
        router.push('/my-events')
      }, 2000)
    } catch (err: any) {
      console.error('Etkinlik oluşturulamadı:', err)
      const responseData = err?.response?.data
      const nested = typeof responseData?.message === 'object' ? responseData.message : null
      const errorCode = nested?.code ?? responseData?.code
      const errorMessage =
        nested?.message ?? (typeof responseData?.message === 'string' ? responseData.message : responseData?.error)

      if (errorCode === 'LIMIT_REACHED') {
        toast.error(errorMessage ?? 'Etkinlik oluşturma limitinize ulaştınız.')
      } else {
        toast.error(errorMessage ?? 'Bir hata oluştu. Lütfen tekrar deneyin.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Kapak Görseli */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Kapak Görseli
        </label>
        <div className="flex items-center gap-4">
          <label className="flex items-center justify-center w-40 h-40 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition overflow-hidden">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="preview"
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex flex-col items-center text-gray-400 p-4">
                <svg
                  className="w-12 h-12 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs">Görsel Seç</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
          {coverImage && (
            <div className="text-sm text-gray-500">
              <p className="font-medium">{coverImage.name}</p>
              <p className="text-xs">
                {(coverImage.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Etkinlik Adı */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Etkinlik Adı *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
          placeholder="Etkinlik başlığı..."
          required
        />
      </div>

      {/* Tarih ve Saat */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tarih *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Saat
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
          />
        </div>
      </div>

      {/* Konum */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Konum
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
          placeholder="Etkinlik konumu..."
        />
      </div>

      {/* Açıklama */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Açıklama
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
          placeholder="Etkinliğin içeriği hakkında detaylı bilgi..."
        ></textarea>
      </div>

      {/* Butonlar */}
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim() || !date.trim()}
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
              Kaydediliyor...
            </>
          ) : (
            'Etkinliği Yayınla'
          )}
        </button>
      </div>
    </form>
  )
}

