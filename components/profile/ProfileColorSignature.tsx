'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface ProfileColorSignatureProps {
  username: string
}

/**
 * 🎨 Profil Renk İmzası Component'i
 * 
 * Kullanıcının tüm eserlerinden çıkarılan en çok kullanılan 5 rengi gösterir.
 * Minimal, LED hissi veren, Feelink'e uygun tasarım.
 * Profil header'da fullName'in yanında, sağ tarafta görünür.
 */
export function ProfileColorSignature({ username }: ProfileColorSignatureProps) {
  // ✅ KRİTİK: Username kontrolü - geçersizse hiçbir şey yapma
  if (!username || username === 'undefined' || username === 'null' || username === '') {
    return null
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['colorSignature', username],
    queryFn: async () => {
      try {
        const response = await api.get(`/users/profile/${encodeURIComponent(username)}/color-signature`)
        // ✅ Debug: Gelen veriyi logla
        if (process.env.NODE_ENV === 'development') {
          console.log('🎨 Renk imzası API yanıtı:', response.data)
        }
        return response.data as { topColors: string[] }
      } catch (err: any) {
        // API hatası durumunda sessizce null döndür (sayfa crash etmesin)
        if (process.env.NODE_ENV === 'development') {
          console.warn('❌ Renk imzası yüklenemedi:', err?.response?.data?.message || err?.message, err?.response?.status)
        }
        return null
      }
    },
    enabled: !!username && username !== 'undefined' && username !== 'null',
    staleTime: 5 * 60 * 1000, // 5 dakika cache
    retry: false, // Hata durumunda retry yapma
  })

  // ✅ Yükleniyor durumunda da göster (kullanıcı bilgilendirilsin)
  // if (isLoading) {
  //   return null
  // }

  if (error) {
    // Hata durumunda console'da göster ama UI'da gösterme
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Renk imzası hatası:', error)
    }
    return null
  }

  if (!data) {
    return null
  }

  // ✅ Ekstra güvenlik: topColors kontrolü
  if (!data.topColors || !Array.isArray(data.topColors) || data.topColors.length === 0) {
    return null
  }

  // ✅ En fazla 5 renk göster
  const colors = data.topColors.slice(0, 5).filter((color: any) => {
    // Geçerli HEX renk kontrolü
    return color && typeof color === 'string' && color.trim() !== ''
  })

  // ✅ Renk yoksa hiçbir şey gösterme
  if (colors.length === 0) {
    return null
  }

  return (
    <div 
      className="flex items-center gap-1.5 group" 
      title="Bu sanatçının renk imzası"
    >
      {colors.map((color: string, index: number) => {
        // HEX rengi RGB'ye çevir (opacity için)
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
          return result
            ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
              }
            : null
        }
        
        const rgb = hexToRgb(color)
        const rgbaGlow = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)` : `${color}40`
        const rgbaInset = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)` : `${color}60`

        return (
          <div
            key={`${color}-${index}`}
            className="h-4 w-4 rounded-sm transition-all duration-200 hover:scale-110 cursor-default"
            style={{
              backgroundColor: color,
              border: `1px solid ${color}`,
              boxShadow: `0 0 6px ${rgbaGlow}, inset 0 0 2px ${rgbaInset}`,
            }}
            title={color}
          />
        )
      })}
    </div>
  )
}

