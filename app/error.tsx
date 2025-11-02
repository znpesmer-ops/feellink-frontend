'use client'

export default function Error({ error, reset }: { error: any; reset: () => void }) {
  console.error(error)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <h2 className="text-xl font-semibold text-orange-500 mb-2">Bir şeyler ters gitti</h2>
      <p className="text-gray-500 mb-4">Sayfa yüklenemedi veya bileşen hatası oluştu.</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
      >
        Yeniden Dene
      </button>
    </div>
  )
}

