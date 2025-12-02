'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'

export default function CorporateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, capabilities, accessToken } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Wait for store hydration
    if (accessToken === undefined || user === undefined || capabilities === undefined) {
      return // Still hydrating
    }

    // Not logged in
    if (!accessToken || !user) {
      router.push('/login')
      return
    }

    // Capabilities not loaded yet - wait
    if (!capabilities) {
      return // Still loading capabilities
    }

    // Not corporate - redirect to feed
    if (!capabilities.roles.includes('corporate')) {
      router.push('/feed')
      return
    }

    // Is corporate, can proceed
    setIsChecking(false)
  }, [accessToken, user, capabilities, router])

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

