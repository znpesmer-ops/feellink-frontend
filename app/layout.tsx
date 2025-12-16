import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { LayoutConditional } from '@/components/layout-conditional'

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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-sans antialiased bg-white dark:bg-gray-950 text-[#1f1f1f] dark:text-gray-100 transition-colors min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

