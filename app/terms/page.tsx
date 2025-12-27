'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Kullanıcı Sözleşmesi – Feellink
        </h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Bu sözleşme, Feellink platformuna üye olan kullanıcılar ile Feellink arasında, platformun kullanım şartlarını belirler.
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Taraflar</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Bu sözleşme; Feellink platformu ile platforma üye olan kullanıcı arasında elektronik ortamda kurulmuştur.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Hizmet Tanımı</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Feellink; kullanıcıların içerik paylaşabildiği, etkinlikleri keşfedebildiği ve etkileşim kurabildiği dijital bir platformdur.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. Kullanıcı Yükümlülükleri</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              Kullanıcı;
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Paylaştığı tüm içeriklerden kendisi sorumludur</li>
              <li>Yürürlükteki mevzuata aykırı içerik paylaşmamayı</li>
              <li>Başkalarının haklarını ihlal etmemeyi</li>
              <li>Platformun güvenliğini zedeleyecek davranışlardan kaçınmayı kabul eder.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Yasaklı Davranışlar</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              Aşağıdaki davranışlar kesinlikle yasaktır:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Küfür, hakaret, aşağılayıcı dil</li>
              <li>Nefret söylemi, ayrımcılık</li>
              <li>Tehdit, şiddet çağrısı</li>
              <li>Spam, yanıltıcı veya reklam içerikleri</li>
              <li>Yasa dışı faaliyetlere teşvik</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. İçerik Kaldırma ve Hesap Askıya Alma</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Feellink, topluluk kurallarına aykırı içerikleri önceden bildirimde bulunmaksızın kaldırabilir. Tekrar eden ihlallerde hesap geçici veya kalıcı olarak kapatılabilir.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Sorumluluk Sınırları</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Feellink, kullanıcıların paylaştığı içeriklerden doğrudan sorumlu değildir.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Yürürlük</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Bu sözleşme, kullanıcı tarafından onaylandığı anda yürürlüğe girer.
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

