export type UserRoleCode = 'art_lover' | 'corporate' | 'collector' | 'artist'

export type SubscriptionPlanCode = 'FREE' | 'PRO' | 'ORI'

export interface BadgeState {
  pro: boolean
  corporate_verified: boolean
}

export interface CapabilityBadgeState extends BadgeState {
  premium: boolean
}

export interface RoleFeatureFlags {
  canCreateEvents: boolean
  canAccessMyEvents: boolean
  canAccessCollections: boolean
  canManageCollections: boolean
  canAccessAnalytics: boolean
  canCreateListings: boolean
  canCreateArtworks: boolean
}

export interface RoleSidebarConfig {
  home: boolean
  explore: boolean
  messages: boolean
  profile: boolean
  createEvent: boolean
  myEvents: boolean
  collections: boolean
  manageCollections: boolean
  analytics: boolean
  listings: boolean
  badges: boolean
}

export interface RoleCombinationDefinition {
  id: string
  roles: UserRoleCode[]
  summary: string
  features: string[]
}

export interface CapabilitySummary {
  roles: UserRoleCode[]
  plan: SubscriptionPlanCode
  permissions: RoleFeatureFlags
  limits: {
    eventLimitMonthly: number | null
    artworkLimitMonthly: number | null
    eventCooldownMonths: number | null
  }
  sidebar: RoleSidebarConfig
  badges: CapabilityBadgeState
  unlockedCombinations: RoleCombinationDefinition[]
}

export interface SidebarVisibility {
  showFeed: boolean
  showExplore: boolean
  showProfile: boolean
  showMessages: boolean
  showListings: boolean
  showAnalytics: boolean
  showEvents: boolean
  showCollections: boolean
  showTickets: boolean
}

export interface PlanDefinition {
  code: SubscriptionPlanCode
  label: string
  description: string
  perks: string[]
  badge?: keyof BadgeState
}

export interface BadgeDefinition {
  key: keyof BadgeState | 'premium'
  label: string
  emoji: string
  description: string
}

export interface RoleDefinition {
  id: UserRoleCode
  label: string
  emoji: string
  description: string
}

export interface RoleOverview {
  roles: RoleDefinition[]
  features: Record<UserRoleCode, RoleFeatureFlags>
  limits: Record<
    UserRoleCode,
    {
      plans: Partial<
        Record<
          SubscriptionPlanCode,
          {
            eventLimitMonthly?: number | null
            artworkLimitMonthly?: number | null
            eventCooldownMonths?: number | null
          }
        >
      >
    }
  >
  sidebar: Record<UserRoleCode, RoleSidebarConfig>
  combinations: RoleCombinationDefinition[]
  plans: PlanDefinition[]
  badges: BadgeDefinition[]
}





