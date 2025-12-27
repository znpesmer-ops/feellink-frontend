'use client'

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Gizlilik Politikası – Feellink
        </h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Toplanan Veriler</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Ad, kullanıcı adı</li>
              <li>E-posta adresi</li>
              <li>Profil bilgileri</li>
              <li>Paylaşılan içerikler ve yorumlar</li>
              <li>IP adresi, cihaz bilgileri</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Verilerin İşlenme Amaçları</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Üyelik işlemleri</li>
              <li>Platform güvenliği</li>
              <li>İçerik moderasyonu</li>
              <li>İstatistik ve analiz çalışmaları</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. Verilerin Saklanması</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Veriler güvenli sunucularda saklanır ve mevzuata uygun süre boyunca tutulur.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Üçüncü Taraflar</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Kullanıcı verileri, açık rıza olmaksızın üçüncü kişilerle paylaşılmaz.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Kullanıcı Hakları</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Kullanıcılar; verilerini görüntüleme, silme ve düzeltme hakkına sahiptir.
            </p>
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






