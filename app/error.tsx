'use client'

export default function Error({ error, reset }: { error: any; reset: () => void }) {
  console.error('Error boundary caught:', error)
  
  // Hata mesajını daha anlaşılır hale getir
  const errorMessage = error?.message || 
    (typeof error === 'string' ? error : 'Bilinmeyen bir hata oluştu')
  
  // "Internal Server Error" gibi istenmeyen mesajları filtrele
  const displayMessage = errorMessage.includes('Internal Server Error') || 
    errorMessage.includes('internal server error')
    ? 'Sunucu hatası oluştu. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.'
    : errorMessage

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-gray-950">
      <div className="max-w-md w-full">
        <h2 className="text-2xl font-semibold text-orange-500 mb-4">Bir şeyler ters gitti</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{displayMessage}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            Yeniden Dene
          </button>
          <button
            onClick={() => window.location.href = '/feed'}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    </div>
  )
}

