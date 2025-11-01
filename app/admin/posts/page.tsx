'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Search, Image, Heart, MessageCircle, Calendar, User } from 'lucide-react'

interface Post {
  id: string
  userId: string
  caption?: string
  location?: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    username: string
    fullName?: string
    avatar?: string
    isVerified: boolean
  }
  media: Array<{
    id: string
    type: string
    url: string
    thumbnailUrl?: string
  }>
  _count: {
    likes: number
    comments: number
  }
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true)
        const response = await api.get('/explore/recent')
        setPosts(response.data)
      } catch (err) {
        console.error('Error fetching posts:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateCaption = (text?: string, maxLength: number = 100) => {
    if (!text) return ''
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const filteredPosts = posts.filter((post) => {
    if (searchQuery.trim() === '') return true
    const query = searchQuery.toLowerCase()
    return (
      post.caption?.toLowerCase().includes(query) ||
      post.user.username.toLowerCase().includes(query) ||
      post.location?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Gönderiler</h2>
        <p className="text-gray-500">Toplam {posts.length} gönderi</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Gönderi ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            Gönderi bulunamadı
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 ease-in-out border border-gray-100 overflow-hidden"
            >
              {/* Post Media */}
              <div className="relative aspect-square bg-gray-100">
                {post.media[0] && (
                  <img
                    src={post.media[0].thumbnailUrl || post.media[0].url}
                    alt={post.caption || 'Post'}
                    className="w-full h-full object-cover"
                  />
                )}
                {post.media.length > 1 && (
                  <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Image size={12} />
                    {post.media.length}
                  </div>
                )}
              </div>

              {/* Post Content */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                      {post.user.avatar ? (
                        <img
                          src={post.user.avatar}
                          alt={post.user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-blue-600 font-semibold text-xs">
                          {post.user.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        {post.user.username}
                        {post.user.isVerified && (
                          <span className="ml-1 text-blue-500">✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {post.caption && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {truncateCaption(post.caption)}
                  </p>
                )}

                {post.location && (
                  <div className="text-xs text-gray-500 mb-3">
                    📍 {post.location}
                  </div>
                )}

                <div className="flex items-center justify-between text-gray-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Heart size={16} />
                      <span className="text-sm">{post._count.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle size={16} />
                      <span className="text-sm">{post._count.comments}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Calendar size={12} />
                    {formatDate(post.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}


