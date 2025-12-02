'use client'

import { motion } from 'framer-motion'
import { useEffect } from 'react'

export default function ZoomModal({ src, onClose }: { src: string; onClose: () => void }) {
  // ESC tuşu ile kapatma
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.img
        src={src}
        alt="Zoomed profile photo"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="
          w-64 h-64
          rounded-full
          object-cover
          shadow-[0_0_40px_rgba(0,0,0,0.4)]
          cursor-zoom-out
          border-4 border-white/30
        "
        onClick={(e) => e.stopPropagation()}
        onError={(e) => {
          ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
        }}
      />
    </div>
  )
}

