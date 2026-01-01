'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

interface StoryUser {
  id: string
  username: string
  fullName: string | null
  avatar: string | null
  isVerified: boolean
}

export default function StoriesRow() {
  const { accessToken } = useAuthStore()
  const router = useRouter()
  const [highlights, setHighlights] = useState<StoryUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return

    const fetchHighlights = async () => {
      try {
        const response = await api.get('/users/highlights')
        setHighlights(response.data)
      } catch (error) {
        console.error('Failed to fetch highlights:', error)
        // Fallback: empty array
        setHighlights([])
      } finally {
        setLoading(false)
      }
    }

    fetchHighlights()
  }, [accessToken])

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4 px-2 scrollbar-hide">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="min-w-[100px] h-[140px] bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (highlights.length === 0) {
    return null
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 px-2 scrollbar-hide">
      {highlights.map((user) => (
        <div
          key={user.id}
          onClick={() => router.push(`/profile/${user.username}`)}
          className="min-w-[100px] h-[140px] bg-gradient-to-br from-orange-100 to-orange-200 
                     dark:from-orange-950 dark:to-orange-900 rounded-2xl shadow-sm flex flex-col 
                     items-center justify-center cursor-pointer hover:scale-105 transition-transform 
                     duration-200 border-2 border-orange-300 dark:border-orange-800 hover:border-[#ff7b00] 
                     dark:hover:border-[#ff7b00] group"
        >
          <div className="relative mb-2">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-gray-900 group-hover:border-[#ff7b00] transition-colors"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#ff7b00] flex items-center justify-center text-white font-semibold text-lg border-2 border-white dark:border-gray-900 group-hover:border-[#ff7b00] transition-colors">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            {user.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-200 text-center px-2 truncate w-full">
            {user.username}
          </p>
        </div>
      ))}
    </div>
  )
}

