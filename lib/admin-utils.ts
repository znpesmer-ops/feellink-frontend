/**
 * Admin utility functions for SaaS-style admin management
 * Admin users bypass all plan restrictions and have full access
 */

import { useAuthStore } from './store'

/**
 * Check if current user is admin (isAdmin or superAdmin)
 */
export function useIsAdmin(): boolean {
  const { user } = useAuthStore()
  return user?.isAdmin === true || user?.superAdmin === true
}

/**
 * Check if user has admin privileges (static version)
 */
export function isAdminUser(user: { isAdmin?: boolean; superAdmin?: boolean } | null | undefined): boolean {
  return user?.isAdmin === true || user?.superAdmin === true
}

/**
 * Check if feature should be available (admin bypasses plan restrictions)
 */
export function hasFeatureAccess(
  user: { isAdmin?: boolean; superAdmin?: boolean; plan?: string } | null | undefined,
  requiredPlan: 'FREE' | 'PRO' | 'ORI' = 'FREE'
): boolean {
  // Admin users have access to all features
  if (isAdminUser(user)) {
    return true
  }

  // Normal plan-based access control
  const userPlan = user?.plan?.toUpperCase() || 'FREE'
  const planHierarchy = { FREE: 0, ORI: 1, PRO: 2 }
  const requiredLevel = planHierarchy[requiredPlan] || 0
  const userLevel = planHierarchy[userPlan as keyof typeof planHierarchy] || 0

  return userLevel >= requiredLevel
}

/**
 * Get admin status label for UI
 */
export function getAdminStatusLabel(user: { isAdmin?: boolean; superAdmin?: boolean } | null | undefined): string {
  if (user?.superAdmin === true) {
    return 'Super Admin'
  }
  if (user?.isAdmin === true) {
    return 'Admin'
  }
  return ''
}








