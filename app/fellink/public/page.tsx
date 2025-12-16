'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function PublicFellinkRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/fellink')
  }, [router])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
    </div>
  )
}
