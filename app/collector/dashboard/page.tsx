'use client'

import { motion } from 'framer-motion'
import { useAuthStore } from '@/lib/store'

export default function CollectorDashboard() {
  const { user } = useAuthStore()
  const displayName = user?.fullName || user?.username || 'Koleksiyoner'

  return (
    <div className="flex items-center justify-center h-[70vh]">
      <motion.h1
        initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white"
      >
        Feellink'e hoş geldin, <span className="text-[#ff7b00]">{displayName}</span>.
      </motion.h1>
    </div>
  )
}
