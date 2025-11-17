'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'

export default function MuseumLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, accessToken, capabilities } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Wait for store hydration
    if (accessToken === undefined || user === undefined || capabilities === undefined) {
      return // Still hydrating
    }

    // Not logged in
    if (!accessToken || !user || !capabilities) {
      router.push('/login')
      return
    }

    // Check artist role capability
    if (!capabilities.roles.includes('artist')) {
      router.push('/feed')
      return
    }

    // Is museum, can proceed
    setIsChecking(false)
  }, [accessToken, user, router])

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff7b00]"></div>
      </div>
    )
  }

  return <AuthGuard>{children}</AuthGuard>
}


