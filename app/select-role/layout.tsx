'use client'

import { useEffect, useState } from 'react'

export default function RoleSelectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialDarkMode = savedTheme ? savedTheme === 'dark' : prefersDark
    setDarkMode(initialDarkMode)
    if (initialDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  return (
    <div
      className={`relative min-h-screen w-full transition-all duration-500 ${
        darkMode
          ? 'bg-gradient-to-b from-[#0b0b0b] to-[#111] text-gray-100'
          : 'bg-gradient-to-b from-white to-gray-50 text-gray-800'
      }`}
    >
      {darkMode && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,122,0,0.04),transparent_80%)]" />
      )}

      <div className="relative z-10 w-full">{children}</div>
    </div>
  )
}


