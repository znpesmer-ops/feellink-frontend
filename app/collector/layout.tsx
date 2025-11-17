'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'

export default function CollectorLayout({
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
    if (!accessToken || !user || !capabilities) {
      router.push('/login')
      return
    }

    // Not collector - redirect to feed
    if (!capabilities.roles.includes('collector')) {
      router.push('/feed')
      return
    }

    // Is collector, can proceed
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


