'use client'

import React from 'react'

interface AvatarProps {
  src?: string | null
  alt?: string
  className?: string
  size?: number | string
}

/**
 * ✅ TEK KAYNAK Avatar Component
 * 
 * Tüm uygulamada profil fotoğrafı gösterimi için kullanılır.
 * 
 * Özellikler:
 * - Profil fotoğrafı yoksa otomatik default avatar gösterir
 * - null, "", undefined → hepsi otomatik default
 * - Dark/light mode uyumlu
 * - Tek bir görsel kullanılır (tutarlılık)
 * 
 * Kullanım:
 * <Avatar src={user.avatar} alt={user.fullName} className="w-10 h-10" />
 */
export function Avatar({ src, alt, className = '', size }: AvatarProps) {
  // ✅ KRİTİK: null, "", undefined → hepsi otomatik default avatar
  const imageSrc = src && src.trim() !== '' ? src : '/assets/avatar-default.svg'

  // Size prop'u varsa width ve height ekle
  const sizeStyle = size 
    ? typeof size === 'number' 
      ? { width: `${size}px`, height: `${size}px` }
      : { width: size, height: size }
    : {}

  return (
    <img
      src={imageSrc}
      alt={alt ?? 'Kullanıcı'}
      className={`
        rounded-full
        object-cover
        bg-gray-100 dark:bg-gray-800
        ${className}
      `}
      style={sizeStyle}
      onError={(e) => {
        // Hata durumunda (broken image) default avatar'a geç
        const target = e.target as HTMLImageElement
        if (target.src !== '/assets/avatar-default.svg') {
          target.src = '/assets/avatar-default.svg'
        }
      }}
    />
  )
}

