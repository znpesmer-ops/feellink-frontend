'use client'

import React, { useState } from 'react'
import { X, Loader2, Eye, EyeOff } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface ChangePasswordModalProps {
  open: boolean
  onClose: () => void
}

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<{
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }>({})

  if (!open) return null

  const validate = (): boolean => {
    const newErrors: typeof errors = {}

    if (!currentPassword.trim()) {
      newErrors.currentPassword = 'Mevcut şifre gereklidir.'
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = 'Yeni şifre gereklidir.'
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Yeni şifre en az 8 karakter olmalıdır.'
    } else if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(newPassword)) {
      newErrors.newPassword = 'Yeni şifre en az bir harf ve bir rakam içermelidir.'
    } else if (currentPassword && newPassword === currentPassword) {
      newErrors.newPassword = 'Yeni şifre eski şifreyle aynı olamaz.'
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Yeni şifreyi tekrar girmelisiniz.'
    } else if (newPassword && confirmPassword !== newPassword) {
      newErrors.confirmPassword = 'Yeni şifreler birbiriyle eşleşmiyor.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsLoading(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      })

      toast.success('Şifreniz başarıyla güncellendi.')
      handleClose()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.'
      
      if (errorMessage.includes('doğrulanamadı') || errorMessage.includes('yanlış')) {
        setErrors({ currentPassword: 'Mevcut şifreniz doğrulanamadı.' })
      } else if (errorMessage.includes('aynı')) {
        setErrors({ newPassword: 'Yeni şifre eski şifreyle aynı olamaz.' })
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setErrors({})
    onClose()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            🔐 Şifre Değiştir
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Açıklama */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Güvenliğiniz için mevcut şifrenizi doğrulamanız gerekir.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mevcut Şifre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mevcut Şifre
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  setErrors((prev) => ({ ...prev, currentPassword: undefined }))
                }}
                placeholder="Mevcut şifrenizi girin"
                disabled={isLoading}
                className={`w-full px-4 py-2 pr-10 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] disabled:opacity-50 ${
                  errors.currentPassword
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.currentPassword}</p>
            )}
          </div>

          {/* Yeni Şifre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Yeni Şifre
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setErrors((prev) => ({ ...prev, newPassword: undefined }))
                }}
                placeholder="Yeni şifre"
                disabled={isLoading}
                className={`w-full px-4 py-2 pr-10 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] disabled:opacity-50 ${
                  errors.newPassword
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.newPassword}</p>
            )}
          </div>

          {/* Yeni Şifre (Tekrar) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Yeni Şifre (Tekrar)
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                }}
                placeholder="Yeni şifreyi tekrar girin"
                disabled={isLoading}
                className={`w-full px-4 py-2 pr-10 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] disabled:opacity-50 ${
                  errors.confirmPassword
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Butonlar */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-[#ff7b00] text-white hover:bg-[#e96d00] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Güncelleniyor...
                </>
              ) : (
                'Şifreyi Güncelle'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

