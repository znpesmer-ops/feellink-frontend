import { getApiBaseURL } from './api'

const FALLBACK_AVATAR = '/images/avatar-placeholder.png'

// Backend URL - görseller backend'te (3002 portunda) bulunuyor
// getApiBaseURL fonksiyonunu kullan (farklı ağlardan erişim için dinamik)
const getBackendUrl = (): string => {
  // 1. NEXT_PUBLIC_BACKEND_URL varsa onu kullan
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL
  }
  
  // 2. getApiBaseURL kullan (dinamik URL belirleme)
  return getApiBaseURL()
}

const BACKEND_URL = getBackendUrl()

/**
 * Resolves image URLs for mobile compatibility
 * Backend görselleri 3002 portunda, frontend 3000 portunda
 * Bu yüzden görselleri backend URL'i ile birleştirmeliyiz
 * 
 * @param url - Image URL from backend (can be full URL or relative path)
 * @returns Resolved URL that works on both desktop and mobile
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url || url.trim() === '') return FALLBACK_AVATAR

  const trimmedUrl = url.trim()

  // If it's already a full URL with localhost, replace with BACKEND_URL
  if (trimmedUrl.startsWith('http://localhost') || trimmedUrl.startsWith('https://localhost')) {
    return trimmedUrl.replace(/http(s?):\/\/localhost:\d+/, BACKEND_URL)
  }

  // If it's already a full URL with 127.0.0.1, replace with BACKEND_URL
  if (trimmedUrl.startsWith('http://127.0.0.1') || trimmedUrl.startsWith('https://127.0.0.1')) {
    return trimmedUrl.replace(/http(s?):\/\/127\.0\.0\.1:\d+/, BACKEND_URL)
  }

  // If it's already a full URL with 192.168.1.38 but wrong port, fix it
  if (trimmedUrl.startsWith('http://192.168.1.38:3000') || trimmedUrl.startsWith('http://192.168.1.38:3001')) {
    return trimmedUrl.replace(/http:\/\/192\.168\.1\.38:(3000|3001)/, BACKEND_URL)
  }

  // If it's already a full URL with 192.168.1.38:3002, replace with BACKEND_URL (Cloudflare tunnel)
  if (trimmedUrl.includes('192.168.1.38:3002') || trimmedUrl.includes('localhost:3002')) {
    // Extract path from URL
    try {
      const urlObj = new URL(trimmedUrl)
      return `${BACKEND_URL}${urlObj.pathname}${urlObj.search}`
    } catch {
      // If URL parsing fails, try simple replace
      return trimmedUrl.replace(/http:\/\/192\.168\.1\.38:3002/, BACKEND_URL)
                       .replace(/http:\/\/localhost:3002/, BACKEND_URL)
    }
  }

  // If it's already a full URL
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    // Backend hostname'i önceden hesapla (catch bloğunda kullanmak için)
    let backendHost: string
    try {
      backendHost = new URL(BACKEND_URL).hostname
    } catch {
      backendHost = ''
    }
    
    try {
      const urlObj = new URL(trimmedUrl)
      const urlHost = urlObj.hostname
      
      // Eğer URL eski bir Cloudflare URL'si ise (mycloudflare.com veya farklı trycloudflare.com domaini)
      // veya local IP/localhost ise, path'i çıkar ve yeni BACKEND_URL ile birleştir
      if (
        urlHost.includes('.mycloudflare.com') || // Eski Cloudflare URL'leri
        (urlHost.includes('.trycloudflare.com') && urlHost !== backendHost) || // Farklı Cloudflare domaini
        urlHost === 'localhost' ||
        urlHost === '127.0.0.1' ||
        urlHost.startsWith('192.168.') ||
        urlHost.startsWith('10.') ||
        urlHost.startsWith('172.')
      ) {
        // Path ve query string'i koru, sadece domain'i değiştir
        return `${BACKEND_URL}${urlObj.pathname}${urlObj.search}`
      }
      
      // Eğer URL zaten doğru BACKEND_URL ile başlıyorsa, olduğu gibi döndür
      if (urlHost === backendHost) {
        return trimmedUrl
      }
      
      // Diğer external URL'ler (örneğin CDN, başka servisler) için olduğu gibi döndür
      return trimmedUrl
    } catch {
      // URL parse edilemezse, eski mantığı kullan
      // Eğer eski Cloudflare URL'si içeriyorsa, path'i çıkar ve yeni URL ile birleştir
      if (trimmedUrl.includes('.mycloudflare.com') || 
          (trimmedUrl.includes('.trycloudflare.com') && backendHost && !trimmedUrl.includes(backendHost))) {
        // Path'i bul (domain'den sonraki kısım)
        const pathMatch = trimmedUrl.match(/https?:\/\/[^\/]+(\/.*)/)
        if (pathMatch) {
          return `${BACKEND_URL}${pathMatch[1]}`
        }
      }
      return trimmedUrl
    }
  }

  // If it's a relative path (e.g., /instagram-uploads/posts/...), prepend BACKEND_URL
  // Ensure path starts with /
  const cleanPath = trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`
  return `${BACKEND_URL}${cleanPath}`
}

