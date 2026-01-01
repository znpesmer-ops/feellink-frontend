/**
 * ✅ Avatar Cleanup Utility
 * 
 * localStorage'daki eski avatar URL'lerini temizler
 * Bu, eski "kadın placeholder" görsellerinin görünmesini önler
 */

import { FORBIDDEN_PLACEHOLDERS } from './avatar-constants'

const STORAGE_KEYS_TO_CHECK = [
  'recent-searches',
  'search-history',
  'user-cache',
  'avatar-cache',
]

/**
 * localStorage'daki tüm avatar URL'lerini temizler
 */
export function cleanupAvatarStorage() {
  if (typeof window === 'undefined') return

  try {
    // Tüm localStorage key'lerini kontrol et
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue

      try {
        const value = localStorage.getItem(key)
        if (!value) continue

        // JSON parse dene
        let parsed: any
        try {
          parsed = JSON.parse(value)
        } catch {
          // JSON değilse, string olarak kontrol et
          if (typeof value === 'string' && FORBIDDEN_PLACEHOLDERS.some(p => value.includes(p))) {
            // Eğer yasaklı placeholder içeriyorsa, key'i sil
            localStorage.removeItem(key)
            continue
          }
          continue
        }

        // Eğer object veya array ise, içindeki avatar URL'lerini temizle
        if (typeof parsed === 'object') {
          const cleanedData = cleanAvatarFromObject(parsed)
          
          // Eğer değişiklik olduysa (referans farklıysa), localStorage'ı güncelle
          if (JSON.stringify(cleanedData) !== JSON.stringify(parsed)) {
            localStorage.setItem(key, JSON.stringify(cleanedData))
          }
        }
      } catch (error) {
        // Hata durumunda devam et
        console.warn(`Avatar cleanup error for key ${key}:`, error)
      }
    }
  } catch (error) {
    console.warn('Avatar cleanup error:', error)
  }
}

/**
 * Object içindeki avatar URL'lerini temizler
 */
function cleanAvatarFromObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(item => cleanAvatarFromObject(item))
  }

  const cleaned: any = {}
  let hasChanges = false

  for (const [key, value] of Object.entries(obj)) {
    // Avatar ile ilgili key'leri kontrol et
    if (key.toLowerCase().includes('avatar') || key.toLowerCase().includes('profileimage')) {
      if (typeof value === 'string' && FORBIDDEN_PLACEHOLDERS.some(p => value.includes(p))) {
        // Yasaklı placeholder ise null yap
        cleaned[key] = null
        hasChanges = true
      } else {
        cleaned[key] = value
      }
    } else if (typeof value === 'object' && value !== null) {
      // Nested object'leri recursive temizle
      const cleanedValue = cleanAvatarFromObject(value)
      cleaned[key] = cleanedValue
      if (cleanedValue !== value) {
        hasChanges = true
      }
    } else {
      cleaned[key] = value
    }
  }

  return cleaned
}

/**
 * Sayfa yüklendiğinde otomatik temizlik yap
 */
if (typeof window !== 'undefined') {
  // ✅ AGRESİF CLEANUP: Her sayfa yüklemesinde çalıştır
  // ✅ İlk yüklemede tüm localStorage'ı temizle (bir kez)
  const cleanupDone = sessionStorage.getItem('avatar-cleanup-aggressive-done')
  
  if (!cleanupDone) {
    // İlk yüklemede tüm localStorage key'lerini kontrol et ve temizle
    try {
      const keysToCheck: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) keysToCheck.push(key)
      }
      
      keysToCheck.forEach(key => {
        try {
          const value = localStorage.getItem(key)
          if (!value) return
          
          const valueLower = value.toLowerCase()
          
          // Eğer yasaklı placeholder içeriyorsa, key'i direkt sil
          if (FORBIDDEN_PLACEHOLDERS.some(p => valueLower.includes(p.toLowerCase()))) {
            localStorage.removeItem(key)
            return
          }
          
          // JSON parse dene ve içindeki avatar URL'lerini temizle
          try {
            const parsed = JSON.parse(value)
            if (typeof parsed === 'object') {
              const cleaned = cleanAvatarFromObject(parsed)
              if (JSON.stringify(cleaned) !== JSON.stringify(parsed)) {
                localStorage.setItem(key, JSON.stringify(cleaned))
              }
            }
          } catch {
            // JSON değilse, string olarak kontrol et
            if (valueLower.includes('avatar') && (
              valueLower.includes('female') || 
              valueLower.includes('woman') || 
              valueLower.includes('placeholder') ||
              valueLower.includes('kadın')
            )) {
              localStorage.removeItem(key)
            }
          }
        } catch (error) {
          // Hata durumunda devam et
        }
      })
      
      sessionStorage.setItem('avatar-cleanup-aggressive-done', 'true')
    } catch (error) {
      console.warn('Avatar cleanup error:', error)
    }
  }
  
  // Her sayfa yüklemesinde normal cleanup'ı da çalıştır
  cleanupAvatarStorage()
}

