'use client'

export default function GlobalError({ error }: { error: any }) {
  console.error('Global error boundary caught:', error)
  
  // Hata mesajını daha anlaşılır hale getir
  const errorMessage = error?.message || 
    (typeof error === 'string' ? error : 'Kritik bir hata oluştu')
  
  // "Internal Server Error" gibi istenmeyen mesajları filtrele
  const displayMessage = errorMessage.includes('Internal Server Error') || 
    errorMessage.includes('internal server error')
    ? 'Sunucu hatası oluştu. Lütfen sayfayı yenileyin.'
    : errorMessage

  return (
    <html>
      <body className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-gray-950">
        <div className="max-w-md w-full">
          <h2 className="text-2xl font-semibold text-orange-500 mb-4">Kritik Hata</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{displayMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            Sayfayı Yenile
          </button>
        </div>
      </body>
    </html>
  )
}

