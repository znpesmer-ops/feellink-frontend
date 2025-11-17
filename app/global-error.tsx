'use client'

export default function GlobalError({ error }: { error: any }) {
  console.error(error)
  return (
    <html>
      <body className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-xl font-semibold text-orange-500 mb-2">Kritik hata</h2>
        <p className="text-gray-500 mb-4">Uygulama genelinde bir hata oluştu.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
        >
          Yeniden Dene
        </button>
      </body>
    </html>
  )
}

