'use client'

import React from 'react'
import clsx from 'clsx'

type BadgeId =
  | 'sanatsever-pro'
  | 'kurumsal-pro'
  | 'koleksiyoner-ori'
  | 'koleksiyoner-extra'
  | 'sanatci-pro'
  | 'sanatci-extra'

const BADGE_CONFIG: Record<
  BadgeId,
  { label: string; bg: string; text: string; border: string }
> = {
  'sanatsever-pro': {
    label: 'Sanatsever Pro',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-600 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-700',
  },
  'kurumsal-pro': {
    label: 'Kurumsal Pro',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-600 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-700',
  },
  'koleksiyoner-ori': {
    label: 'Koleksiyoner Ori',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-600 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-700',
  },
  'koleksiyoner-extra': {
    label: 'Koleksiyoner Ek Paket',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-600 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-700',
  },
  'sanatci-pro': {
    label: 'Sanatçı Pro',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-700',
  },
  'sanatci-extra': {
    label: 'Sanatçı Ek Paket',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-700',
  },
}

interface UserBadgesProps {
  badges?: any
}

function normalizeBadges(input: any): string[] {
  if (!input) return []

  if (Array.isArray(input)) {
    return input
      .filter((x) => typeof x === 'string')
      .map((x) => x.trim())
      .filter(Boolean)
  }

  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return []

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed
            .filter((x) => typeof x === 'string')
            .map((x) => x.trim())
            .filter(Boolean)
        }
      } catch {
        // ignore
      }
    }

    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    }

    return [trimmed]
  }

  if (typeof input === 'object') {
    try {
      const values = Object.values(input)
      return values
        .flatMap((v) => {
          if (Array.isArray(v)) return v
          if (typeof v === 'string') return [v]
          return []
        })
        .filter((x) => typeof x === 'string')
        .map((x) => x.trim())
        .filter(Boolean)
    } catch {
      return []
    }
  }

  return []
}

export const UserBadges: React.FC<UserBadgesProps> = ({ badges }) => {
  const normalized = normalizeBadges(badges)

  if (!normalized || normalized.length === 0) return null

  const validBadges = normalized.filter((badge): badge is BadgeId =>
    Object.prototype.hasOwnProperty.call(BADGE_CONFIG, badge),
  )

  if (validBadges.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {validBadges.map((badge) => {
        const cfg = BADGE_CONFIG[badge]
        return (
          <span
            key={badge}
            className={clsx(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
              cfg.bg,
              cfg.text,
              cfg.border,
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {cfg.label}
          </span>
        )
      })}
    </div>
  )
}

