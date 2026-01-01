'use client'

import React from 'react'
import { DEFAULT_AVATAR, safeAvatar } from '@/lib/avatar-constants'

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
  // ✅ Güvenli avatar URL - tüm geçersiz değerler normalize edilir
  const imageSrc = safeAvatar(src)
  
  // ✅ Debug: Eğer orijinal src yasaklı bir placeholder içeriyorsa log'la
  if (src && typeof src === 'string' && process.env.NODE_ENV === 'development') {
    const lower = src.toLowerCase()
    if (lower.includes('female') || lower.includes('woman') || lower.includes('placeholder') || lower.includes('kadın')) {
      console.warn('🚫 Yasaklı avatar URL tespit edildi:', src, '→', imageSrc)
    }
  }

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
        // ✅ Hata durumunda (broken image, 404, vb.) default avatar'a geç
        // ✅ Kadın görseli hiçbir durumda görünmemeli
        // ✅ Sonsuz döngüyü önle: eğer zaten default avatar ise tekrar set etme
        const target = e.target as HTMLImageElement
        const currentSrc = target.src || ''
        const defaultSrc = window.location.origin + DEFAULT_AVATAR
        
        // Eğer zaten default avatar değilse, default'a geç
        if (!currentSrc.includes('default-user.svg') && !currentSrc.includes('icons/default-user')) {
          target.src = DEFAULT_AVATAR
          // Hata tekrar oluşursa (default avatar de yüklenemezse) boş bırak
          target.onerror = () => {
            target.style.display = 'none'
          }
        }
      }}
      onLoad={(e) => {
        // ✅ Yüklenen görselin geçerli olduğundan emin ol
        const target = e.target as HTMLImageElement
        // Eğer görsel çok küçükse veya geçersizse default'a geç
        if (target.naturalWidth === 0 || target.naturalHeight === 0) {
          target.src = DEFAULT_AVATAR
        }
      }}
    />
  )
}


