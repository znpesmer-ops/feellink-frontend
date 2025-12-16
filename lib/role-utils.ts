import {
  CapabilitySummary,
  RoleFeatureFlags,
  UserRoleCode,
} from '@/types/capabilities'

export type PrimaryRole = 'admin' | UserRoleCode

export const ROLE_PRIORITY: PrimaryRole[] = ['admin', 'corporate', 'collector', 'artist', 'art_lover']

const ROLE_ROUTES: Record<PrimaryRole, string> = {
  admin: '/admin',
  corporate: '/corporate/dashboard',
  collector: '/collector/dashboard',
  artist: '/artist/dashboard',
  art_lover: '/feed',
}

export const ROLE_METADATA: Record<UserRoleCode, { label: string; emoji: string; color: string; badgeEmoji: string }> = {
  art_lover: {
    label: 'Sanat Sever',
    emoji: '🎨',
    color: '#ff7b00',
    badgeEmoji: '🟠',
  },
  corporate: {
    label: 'Kurumsal',
    emoji: '🏢',
    color: '#2563eb',
    badgeEmoji: '🟧',
  },
  collector: {
    label: 'Koleksiyoner',
    emoji: '🗝️',
    color: '#7c3aed',
    badgeEmoji: '🟣',
  },
  artist: {
    label: 'Sanatçı',
    emoji: '🖌️',
    color: '#ec4899',
    badgeEmoji: '🟡',
  },
}

export const BADGE_METADATA = {
  pro: { emoji: '🟤', label: 'Pro Rozeti' },
  corporate_verified: { emoji: '🟧', label: 'Kurumsal Onay Rozeti' },
  premium: { emoji: '🌟', label: 'Feellink Premium' },
} as const

const PERMISSION_KEY_MAP: Record<string, keyof RoleFeatureFlags> = {
  'event:create': 'canCreateEvents',
  'event:manage': 'canAccessMyEvents',
  'collection:view': 'canAccessCollections',
  'collection:manage': 'canManageCollections',
  'analytics:view': 'canAccessAnalytics',
  'listing:create': 'canCreateListings',
  'artwork:create': 'canCreateArtworks',
}

export function normalizeRole(role: string | null | undefined): UserRoleCode {
  if (!role) return 'art_lover'
  const lower = role.toLowerCase()
  switch (lower) {
    case 'art_lover':
    case 'user':
      return 'art_lover'
    case 'corporate':
      return 'corporate'
    case 'collector':
      return 'collector'
    case 'artist':
    case 'museum':
      return 'artist'
    default:
      return 'art_lover'
  }
}

export function getPrimaryRole(roles: (string | UserRoleCode)[] | undefined | null, isAdmin?: boolean): PrimaryRole {
  if (isAdmin) {
    return 'admin'
  }
  const normalized = (roles ?? []).map((role) => normalizeRole(role))
  for (const priority of ROLE_PRIORITY) {
    if (priority === 'admin') continue
    if (normalized.includes(priority)) {
      return priority
    }
  }
  return 'art_lover'
}

export function getPrimaryRoleFromCapabilities(
  capabilities: CapabilitySummary | null | undefined,
  isAdmin?: boolean,
): PrimaryRole {
  if (isAdmin) {
    return 'admin'
  }
  const roles = capabilities?.roles ?? []
  return getPrimaryRole(roles, false)
}

export function getDashboardRoute(
  roles: (string | UserRoleCode)[] | undefined | null,
  isAdmin?: boolean,
): string {
  const primary = getPrimaryRole(roles, isAdmin)
  return ROLE_ROUTES[primary]
}

export function getDashboardRouteFromCapabilities(
  capabilities: CapabilitySummary | null | undefined,
  isAdmin?: boolean,
): string {
  const primary = getPrimaryRoleFromCapabilities(capabilities, isAdmin)
  return ROLE_ROUTES[primary]
}

export function getDashboardRouteFromUser(user: {
  roles?: (string | UserRoleCode)[] | null
  isAdmin?: boolean
  capabilities?: CapabilitySummary | null
}): string {
  if (user.capabilities) {
    return getDashboardRouteFromCapabilities(user.capabilities, user.isAdmin)
  }
  return getDashboardRoute(user.roles, user.isAdmin)
}

export function hasPermission(
  capabilities: CapabilitySummary | null | undefined,
  permission: keyof RoleFeatureFlags | string,
): boolean {
  if (!capabilities) {
    return false
  }
  const perms = capabilities.permissions
  if (typeof permission === 'string') {
    if ((perms as unknown as Record<string, boolean>)[permission] !== undefined) {
      return Boolean((perms as unknown as Record<string, boolean>)[permission])
    }
    const mapped = PERMISSION_KEY_MAP[permission]
    return mapped ? perms[mapped] : false
  }
  return perms[permission]
}

export function getRoleLabels(roles: (string | UserRoleCode)[] | undefined | null): string[] {
  if (!roles || roles.length === 0) {
    return [ROLE_METADATA.art_lover.label]
  }
  return roles.map((role) => ROLE_METADATA[normalizeRole(role)].label)
}

export function getRoleBadgesFromCapabilities(capabilities: CapabilitySummary | null | undefined): string[] {
  if (!capabilities) {
    return [ROLE_METADATA.art_lover.badgeEmoji]
  }

  const emojis = new Set<string>()
  capabilities.roles.forEach((role) => {
    const meta = ROLE_METADATA[role]
    if (meta) {
      emojis.add(meta.badgeEmoji)
    }
  })

  const { badges } = capabilities
  if (badges.pro) {
    emojis.add(BADGE_METADATA.pro.emoji)
  }
  if (badges.corporate_verified) {
    emojis.add(BADGE_METADATA.corporate_verified.emoji)
  }
  if (badges.premium) {
    emojis.add(BADGE_METADATA.premium.emoji)
  }

  return Array.from(emojis)
}

export function getRoleBadges(roles: (string | UserRoleCode)[] | undefined | null): string[] {
  if (!roles || roles.length === 0) {
    return [ROLE_METADATA.art_lover.badgeEmoji]
  }
  return Array.from(new Set(roles.map((role) => ROLE_METADATA[normalizeRole(role)].badgeEmoji)))
}
