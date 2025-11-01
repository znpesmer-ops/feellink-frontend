'use client'

import { useRouter } from 'next/navigation'

export default function TestNotif() {
  const router = useRouter()

  const notifications = [
    { id: '1', type: 'like', message: 'Zeynep gönderini beğendi', postId: 'abc123' },
    { id: '2', type: 'follow', message: 'Sude seni takip etmeye başladı', fromUserId: 'xyz987' },
  ]

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-2xl font-bold mb-4">Bildirim Yönlendirme Testi</h1>
      {notifications.map((n) => (
        <div
          key={n.id}
          onClick={() => {
            console.log('Test yönlendirme:', n)
            if (n.type === 'like' || n.type === 'comment') {
              router.push(`/posts/${n.postId}`)
            } else if (n.type === 'follow') {
              router.push(`/profile/${n.fromUserId}`)
            } else {
              router.push('/messages')
            }
          }}
          className="p-4 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
        >
          <p className="font-semibold">{n.message}</p>
          <p className="text-xs text-gray-500 mt-1">
            Tür: {n.type} | {n.postId ? `PostID: ${n.postId}` : `UserID: ${n.fromUserId}`}
          </p>
        </div>
      ))}
    </div>
  )
}

