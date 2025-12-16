'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  // Direkt feed'e yönlendir - hiç bekleme yok
  useEffect(() => {
    router.replace('/feed')
  }, [router])

  return null
}

