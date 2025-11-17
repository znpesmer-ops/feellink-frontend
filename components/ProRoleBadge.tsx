'use client'

import { getProRoleBadgeConfig, getProRoleBadgeTooltip } from '@/lib/pro-role-badges'

interface ProRoleBadgeProps {
  roles?: string[] | null
  plan?: string | null
  className?: string
  showTooltip?: boolean
}

/**
 * PRO Role Badge Component
 * Sadece PRO planı olan kullanıcılar için premium gradient rozet gösterir
 * Instagram doğrulama rozeti tarzında modern tasarım
 */
export function ProRoleBadge({
  roles,
  plan,
  className = '',
  showTooltip = true,
}: ProRoleBadgeProps) {
  const badgeConfig = getProRoleBadgeConfig(roles, plan)
  const tooltip = showTooltip ? getProRoleBadgeTooltip(roles, plan) : null

  if (!badgeConfig) {
    return null
  }

  const Icon = badgeConfig.icon

  return (
    <span
      className={`inline-flex items-center justify-center ml-1 w-5 h-5 rounded-full ${badgeConfig.gradient} text-white shadow-md ${className}`}
      title={tooltip || undefined}
    >
      <Icon size={12} className="text-white" />
    </span>
  )
}

