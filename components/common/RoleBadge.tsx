'use client'

import { getRoleBadges, getRoleLabels, ROLE_METADATA } from '@/lib/role-utils'
import type { UserRoleCode } from '@/types/capabilities'

interface RoleBadgeProps {
  roles: string[] | undefined | null
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function RoleBadge({
  roles,
  showLabel = false,
  size = 'md',
  className = '',
}: RoleBadgeProps) {
  const badges = getRoleBadges(roles)
  const labels = getRoleLabels(roles)

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  if (!badges || badges.length === 0) {
    return null
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {badges.map((badge, index) => {
        const role = roles?.[index] as UserRoleCode | undefined
        const config = role ? ROLE_METADATA[role as keyof typeof ROLE_METADATA] : null
        const label = labels[index]

        return (
          <span
            key={index}
            className={`inline-flex items-center gap-1 rounded-full font-medium border transition-all ${
              sizeClasses[size]
            } ${
              config
                ? `bg-[${config.color}]/10 text-[${config.color}] border-[${config.color}]/20`
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            }`}
            style={
              config
                ? {
                    backgroundColor: `${config.color}15`,
                    color: config.color,
                    borderColor: `${config.color}30`,
                  }
                : undefined
            }
            title={showLabel ? undefined : label}
          >
            <span>{badge}</span>
            {showLabel && <span className="text-xs">{label}</span>}
          </span>
        )
      })}
    </div>
  )
}





































