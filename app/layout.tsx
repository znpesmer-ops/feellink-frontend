import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Navbar } from '@/components/navbar'

export const metadata: Metadata = {
  title: 'Feellink',
  description: 'A full-featured social platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="font-sans antialiased bg-white dark:bg-gray-900 text-[#1f1f1f] dark:text-gray-100 transition-colors">
        <Providers>
          <div className="flex min-h-screen">
            {/* Sol Sidebar - Sabit */}
            <Sidebar />

            {/* Sağ taraf - Header + İçerik */}
            <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
              {/* Header - Üstte Sabit (sadece desktop'ta görünür) */}
              <div className="hidden md:block">
                <Header />
              </div>

              {/* Sayfa içeriği - Header altında */}
              <main className="flex-1 md:mt-16 mb-16 md:mb-0 p-4 md:p-6 bg-[#f8f8f8] dark:bg-gray-950 transition-colors">
                {children}
              </main>
            </div>

            {/* Mobil Navbar - Sadece mobilde görünür */}
            <div className="md:hidden">
              <Navbar />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}

