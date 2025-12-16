'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import { AuthGuard } from '@/lib/auth-guard'
import Cropper from 'react-easy-crop'
import getCroppedImg from '@/utils/cropImage'
import type { Area } from 'react-easy-crop'

function EditProfileContent() {
  const router = useRouter()
  const { user, accessToken, capabilities, setUser } = useAuthStore()
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')
  const [fullName, setFullName] = useState('')
  const [website, setWebsite] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Crop modal states
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setBio(user.bio || '')
      setAvatar(user.avatar || '')
      setAvatarPreview(user.avatar || '')
      setFullName(user.fullName || '')
      setWebsite((user as any).website || '')
      setIsPrivate(user.isPrivate || false)
    }
  }, [user])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('Lütfen bir resim dosyası seçin. JPG, PNG veya GIF formatında, maksimum 5MB')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Dosya boyutu 5MB\'dan büyük olamaz. JPG, PNG veya GIF formatında, maksimum 5MB')
      return
    }

    setMessage('')

    // Read file and open crop modal
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      setImageSrc(reader.result as string)
      setCropModalOpen(true)
    })
    reader.readAsDataURL(file)
  }

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCropFinish = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    setIsUploading(true)
    setMessage('')

    try {
      // Crop image
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      
      // Create preview
      const previewUrl = URL.createObjectURL(croppedImageBlob)
      setAvatarPreview(previewUrl)

      // Upload cropped file
      const formData = new FormData()
      formData.append('file', croppedImageBlob, 'profile.jpg')

      const response = await api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setAvatar(response.data.url)
      setMessage('')
      setCropModalOpen(false)
      
      // Cleanup
      setImageSrc(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
      
      // Cleanup preview URL
      URL.revokeObjectURL(previewUrl)
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Dosya yüklenirken bir hata oluştu')
      setAvatarPreview(user?.avatar || '')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCropCancel = () => {
    setCropModalOpen(false)
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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
      // Convert empty website string to null, or null if isPrivate is true
      const websiteValue = isPrivate || !website || website.trim() === '' ? null : website.trim()

      const response = await api.put(
        '/users/profile',
        {
          username,
          bio,
          avatar,
          fullName,
          website: websiteValue,
          isPrivate,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (user) {
        const updatedUser = { ...user, ...response.data }
        setUser(updatedUser, capabilities ?? null)
      }
          setMessage('Profil başarıyla güncellendi!')

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
      <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 p-6 md:p-8 transition-colors">
        <h2 className="text-2xl font-bold text-[#1f1f1f] dark:text-white mb-6">Profili Düzenle</h2>

        {/* Avatar Upload */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 dark:text-white/70 mb-3">
            Profil Fotoğrafı
          </label>
          
          {/* Avatar Preview with Change Button */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={avatarPreview || avatar || 'https://via.placeholder.com/96?text=Avatar'}
                alt="Avatar preview"
                className="w-[110px] h-[110px] rounded-full object-cover border border-black/10 dark:border-white/20"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = 'https://via.placeholder.com/96?text=Avatar'
                }}
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
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
                className={`inline-flex items-center justify-center px-4 py-1.5 bg-brand-orange hover:bg-[#ff8a1d] text-white text-sm font-medium rounded-md transition cursor-pointer ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Yükleniyor...
                  </>
                ) : (
                  avatar || avatarPreview ? 'Fotoğraf Değiştir' : 'Fotoğraf Yükle'
                )}
              </label>
              
              {(avatarPreview || avatar) && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:underline transition"
                >
                  Kaldır
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Username */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
            Kullanıcı Adı
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-white text-[#111] border border-black/10 rounded-lg px-3 py-2 placeholder-gray-400 focus:border-orange-500 transition dark:bg-[#1E1F24] dark:text-white dark:border-white/10 dark:placeholder-white/40 dark:focus:border-orange-400"
            placeholder="ör: sudesmer001"
          />
        </div>

        {/* Full Name */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
            Ad Soyad
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-white text-[#111] border border-black/10 rounded-lg px-3 py-2 placeholder-gray-400 focus:border-orange-500 transition dark:bg-[#1E1F24] dark:text-white dark:border-white/10 dark:placeholder-white/40 dark:focus:border-orange-400"
            placeholder="Adınız ve soyadınız"
          />
        </div>

        {/* Bio */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
            Biyografi
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-white text-[#111] border border-black/10 rounded-lg px-3 py-2 h-[80px] resize-none placeholder-gray-400 focus:border-orange-500 transition dark:bg-[#1E1F24] dark:text-white dark:border-white/10 dark:placeholder-white/40 dark:focus:border-orange-400"
            placeholder="Kendini kısaca tanıt..."
            maxLength={150}
          />
          <p className="text-xs text-gray-500 dark:text-white/50 mt-1 text-right">{bio.length}/150</p>
        </div>

        {/* Website */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
            Bağlantı
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={isPrivate}
            className={`w-full bg-white text-[#111] border border-black/10 rounded-lg px-3 py-2 placeholder-gray-400 focus:border-orange-500 transition dark:bg-[#1E1F24] dark:text-white dark:border-white/10 dark:placeholder-white/40 dark:focus:border-orange-400 ${
              isPrivate ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            placeholder="https://example.com"
          />
          {isPrivate && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Gizli hesaplarda bağlantı alanı devre dışı bırakılmıştır.
            </p>
          )}
        </div>

        {/* Private Account */}
        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-brand-orange focus:ring-brand-orange focus:ring-offset-0 cursor-pointer bg-white dark:bg-gray-700"
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
            className="flex-1 bg-[#FF8A00] text-white py-3 rounded-lg hover:bg-[#e67a00] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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

      {/* Crop Modal */}
      {cropModalOpen && imageSrc && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="relative w-full h-[400px] bg-gray-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            
            {/* Zoom Control */}
            <div className="p-4 bg-white dark:bg-[#111111] border-t border-gray-200 dark:border-gray-800">
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Yakınlaştır
              </label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 p-4 bg-white dark:bg-[#111111] border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={handleCropCancel}
                disabled={isUploading}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                İptal
              </button>
              <button
                onClick={handleCropFinish}
                disabled={isUploading}
                className="flex-1 px-4 py-2.5 bg-brand-orange hover:bg-[#ff8a1d] text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Yükleniyor...
                  </>
                ) : (
                  'Kaydet'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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

