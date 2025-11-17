import { Palette, Building2, Gem, Star, LucideIcon } from 'lucide-react'

/**
 * PRO Role Badge Config
 * Her PRO rol için özel gradient ve icon
 */
export const PRO_ROLE_BADGE_CONFIG: Record<
  string,
  { icon: LucideIcon; gradient: string }
> = {
  artist: {
    icon: Palette,
    gradient: 'bg-gradient-to-br from-orange-400 to-rose-500',
  },
  corporate: {
    icon: Building2,
    gradient: 'bg-gradient-to-br from-gray-800 to-gray-600',
  },
  collector: {
    icon: Gem,
    gradient: 'bg-gradient-to-br from-purple-500 to-fuchsia-500',
  },
  art_lover: {
    icon: Star,
    gradient: 'bg-gradient-to-br from-blue-500 to-cyan-400',
  },
}

/**
 * PRO rozet gösterimi için yardımcı fonksiyon
 * @param roles - Kullanıcının rolleri array
 * @param plan - Kullanıcının planı ('FREE' | 'PRO' | 'ORI')
 * @returns PRO rozet config veya null
 */
export function getProRoleBadgeConfig(
  roles: string[] | null | undefined,
  plan: string | null | undefined
): { icon: LucideIcon; gradient: string } | null {
  // Plan PRO değilse rozet gösterme
  if (plan !== 'PRO' && plan !== 'ORI') {
    return null
  }

  // Roller yoksa rozet gösterme
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return null
  }

  // İlk PRO rolü için rozet döndür
  // Öncelik sırası: corporate > collector > artist > art_lover
  const priorityOrder: string[] = ['corporate', 'collector', 'artist', 'art_lover']
  
  for (const role of priorityOrder) {
    if (roles.includes(role)) {
      return PRO_ROLE_BADGE_CONFIG[role] || null
    }
  }

  // Eğer priority order'da yoksa, ilk bulunan rolü kullan
  for (const role of roles) {
    if (PRO_ROLE_BADGE_CONFIG[role]) {
      return PRO_ROLE_BADGE_CONFIG[role]
    }
  }

  return null
}

/**
 * PRO rozet tooltip metni
 */
export function getProRoleBadgeTooltip(
  roles: string[] | null | undefined,
  plan: string | null | undefined
): string | null {
  if (plan !== 'PRO' && plan !== 'ORI') {
    return null
  }

  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return null
  }

  const roleLabels: Record<string, string> = {
    artist: 'Sanatçı PRO',
    corporate: 'Kurumsal PRO',
    collector: 'Koleksiyoner PRO',
    art_lover: 'Sanatsever PRO',
  }

  const priorityOrder: string[] = ['corporate', 'collector', 'artist', 'art_lover']
  
  for (const role of priorityOrder) {
    if (roles.includes(role)) {
      return roleLabels[role] || null
    }
  }

  return null
}

