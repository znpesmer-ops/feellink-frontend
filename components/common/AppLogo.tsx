'use client'

export type AppLogoProps = {
  className?: string
  width?: number
  height?: number
  priority?: boolean
  alt?: string
  /** 'full' = icon + wordmark, 'icon' = sadece işaret */
  variant?: 'full' | 'icon'
}

/**
 * Feellink logo — saf SVG bileşen.
 * İkon: Bağlantı düğümlü F harfi (fırça vuruşu + ağ noktaları konsepti).
 * Wordmark: "feellink" currentColor → Tailwind ile açık/koyu tema desteği.
 */
export function AppLogo({
  className = '',
  width = 180,
  height = 44,
  variant = 'full',
}: AppLogoProps) {
  if (variant === 'icon') {
    return (
      <svg
        width={44}
        height={44}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Feellink"
        role="img"
      >
        <FIconPaths />
      </svg>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 196 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Feellink"
      role="img"
    >
      {/* — İKON İŞARETİ — */}
      <FIconPaths />

      {/* — WORDMARK — */}
      {/* "feel" */}
      <text
        x="56"
        y="30"
        fontFamily="'Inter', 'Geist', 'Helvetica Neue', Arial, sans-serif"
        fontSize="21"
        fontWeight="300"
        letterSpacing="0.5"
        fill="currentColor"
      >
        feel
      </text>
      {/* "link" — turuncu vurgu */}
      <text
        x="101"
        y="30"
        fontFamily="'Inter', 'Geist', 'Helvetica Neue', Arial, sans-serif"
        fontSize="21"
        fontWeight="600"
        letterSpacing="0.5"
        fill="#FF8A00"
      >
        link
      </text>
    </svg>
  )
}

/** F harfi ikon yolları — 44×44 viewBox içinde */
function FIconPaths() {
  const orange = '#FF8A00'
  const strokeW = 5.5

  return (
    <>
      {/* Dikey bar — fırça tutacağı gibi hafif konik */}
      <line
        x1="10"
        y1="7"
        x2="10"
        y2="37"
        stroke={orange}
        strokeWidth={strokeW + 1}
        strokeLinecap="round"
      />

      {/* Üst yatay çubuk */}
      <line
        x1="10"
        y1="11"
        x2="33"
        y2="11"
        stroke={orange}
        strokeWidth={strokeW}
        strokeLinecap="round"
      />
      {/* Üst bağlantı düğümü — "link" noktası */}
      <circle cx="37.5" cy="11" r="4.5" fill={orange} />

      {/* Orta yatay çubuk */}
      <line
        x1="10"
        y1="24"
        x2="26"
        y2="24"
        stroke={orange}
        strokeWidth={strokeW - 0.5}
        strokeLinecap="round"
      />
      {/* Orta bağlantı düğümü — ikinci "link" noktası */}
      <circle cx="30" cy="24" r="3.5" fill={orange} />
    </>
  )
}
