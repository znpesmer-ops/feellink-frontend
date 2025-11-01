'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import { AuthGuard } from '@/lib/auth-guard'

function EditProfileContent() {
  const router = useRouter()
  const { user, accessToken, setAuth, refreshToken } = useAuthStore()
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')
  const [fullName, setFullName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setBio(user.bio || '')
      setAvatar(user.avatar || '')
      setAvatarPreview(user.avatar || '')
      setFullName(user.fullName || '')
      setIsPrivate(user.isPrivate || false)
    }
  }, [user])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('Lütfen bir resim dosyası seçin')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Dosya boyutu 5MB\'dan büyük olamaz')
      return
    }

    setIsUploading(true)
    setMessage('')

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload file
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setAvatar(response.data.url)
      setMessage('')
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Dosya yüklenirken bir hata oluştu')
      setAvatarPreview(user?.avatar || '')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatar('')
    setAvatarPreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!accessToken) return

    setIsLoading(true)
    setMessage('')

    try {
      const response = await api.put(
        '/users/profile',
        {
          bio,
          avatar,
          fullName,
          isPrivate,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      // Update store with new user data
      setAuth(response.data, accessToken!, refreshToken!)
      setMessage('Profil başarıyla güncellendi! 🎉')

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/profile/${user?.username}`)
      }, 1500)
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  if (!accessToken) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 transition-colors">
        <h2 className="text-2xl font-bold text-[#1f1f1f] dark:text-gray-100 mb-6">Profili Düzenle</h2>

        {/* Avatar Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Profil Fotoğrafı
          </label>
          
          {/* Avatar Preview */}
          {(avatarPreview || avatar) && (
            <div className="mb-4 flex items-center gap-4">
              <div className="relative">
                <img
                  src={avatarPreview || avatar}
                  alt="Avatar preview"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=Avatar'
                  }}
                />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
              >
                Kaldır
              </button>
            </div>
          )}

          {/* File Input */}
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl px-4 py-6 cursor-pointer transition-colors ${
                isUploading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-[#ff7b00] hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Yükleniyor...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {avatar || avatarPreview ? 'Fotoğrafı Değiştir' : 'Fotoğraf Yükle'}
                  </span>
                </>
              )}
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            JPG, PNG veya GIF formatında, maksimum 5MB
          </p>
        </div>

        {/* Full Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ad Soyad
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/20 focus:border-[#ff7b00] transition-all"
            placeholder="Adınız ve soyadınız"
          />
        </div>

        {/* Bio */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Biyografi
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/20 focus:border-[#ff7b00] transition-all resize-none"
            rows={4}
            placeholder="Kendini kısaca tanıt..."
            maxLength={150}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{bio.length}/150</p>
        </div>

        {/* Private Account */}
        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-[#ff7b00] focus:ring-[#ff7b00] focus:ring-offset-0 cursor-pointer bg-white dark:bg-gray-700"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Hesabımı gizli yap</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Gizli hesaplarda yalnızca onayladığınız kişiler gönderilerinizi görebilir
              </p>
            </div>
          </label>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 bg-[#ff7b00] text-white py-3 rounded-xl hover:bg-[#e36f00] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-gray-700 dark:text-gray-200"
          >
            İptal
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-xl text-sm ${
              message.includes('başarıyla')
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export default function EditProfilePage() {
  return (
    <AuthGuard>
      <EditProfileContent />
    </AuthGuard>
  )
}

