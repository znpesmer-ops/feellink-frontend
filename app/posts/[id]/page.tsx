'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import { PostModal } from '@/components/post-modal'

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const [showModal, setShowModal] = useState(true)

  const postId = params?.id as string

  // Redirect to feed if modal is closed
  const handleClose = () => {
    setShowModal(false)
    router.push('/feed')
  }

  if (!postId || !accessToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff7b00]"></div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
        {showModal && (
          <PostModal postId={postId} onClose={handleClose} />
        )}
      </div>
    </AuthGuard>
  )
}

