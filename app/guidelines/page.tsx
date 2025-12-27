'use client'

import Link from 'next/link'

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Topluluk Kuralları – Feellink
        </h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Feellink; saygılı, güvenli ve yaratıcı bir ortam oluşturmayı amaçlar.
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Yasaklı İçerikler:</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Küfür ve hakaret</li>
              <li>Nefret söylemi</li>
              <li>Şiddet çağrısı</li>
              <li>Spam ve reklam</li>
              <li>Yanıltıcı içerik</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">İhlal Durumunda:</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>İçerik silinir</li>
              <li>Hesap uyarılır</li>
              <li>Tekrarında askıya alınır veya kapatılır</li>
            </ul>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/register"
              className="text-[#ff7b00] hover:text-[#e36f00] text-sm font-medium"
            >
              ← Kayıt sayfasına dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}






