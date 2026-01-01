/**
 * ✅ TEK KAYNAK Avatar Constants
 * 
 * Tüm uygulamada avatar fallback'leri için kullanılır.
 * Bu dosyayı değiştirerek tüm uygulamadaki default avatar'ı güncelleyebilirsiniz.
 */

export const DEFAULT_AVATAR = '/icons/default-user.svg'

/**
 * Yasaklı placeholder URL'ler ve pattern'ler
 * Bu URL'ler göründüğünde otomatik olarak DEFAULT_AVATAR'a yönlendirilir
 */
export const FORBIDDEN_PLACEHOLDERS = [
  '/images/default-avatar.png',
  '/images/female-placeholder.png',
  '/images/avatar-placeholder.png',
  '/assets/avatar-default.svg', // Eski path
  'female-avatar',
  'placeholder',
  'default-avatar',
  'woman',
  'kadın',
  'female',
  'default-user',
  'user-default',
]

/**
 * Avatar URL'ini güvenli hale getirir
 * Geçersiz veya yasaklı URL'ler için DEFAULT_AVATAR döndürür
 */
export function safeAvatar(url?: string | null): string {
  if (!url) return DEFAULT_AVATAR
  
  const trimmed = String(url).trim()
  
  // Boş string kontrolü
  if (trimmed === '') return DEFAULT_AVATAR
  
  // "null" veya "undefined" string kontrolü
  const lower = trimmed.toLowerCase()
  if (lower === 'null' || lower === 'undefined') return DEFAULT_AVATAR
  
  // Yasaklı placeholder kontrolü (case-insensitive)
  const urlLower = trimmed.toLowerCase()
  if (FORBIDDEN_PLACEHOLDERS.some((forbidden) => urlLower.includes(forbidden.toLowerCase()))) {
    return DEFAULT_AVATAR
  }
  
  // Ek pattern kontrolü: Eğer URL'de "placeholder" veya "default" varsa ve "avatar" içeriyorsa
  if (urlLower.includes('placeholder') && urlLower.includes('avatar')) {
    return DEFAULT_AVATAR
  }
  
  // Ek pattern kontrolü: Eğer URL'de "female" veya "woman" varsa
  if (urlLower.includes('female') || urlLower.includes('woman') || urlLower.includes('kadın')) {
    return DEFAULT_AVATAR
  }
  
  return trimmed
}

