'use client'

/**
 * Persistent Sidebar Wrapper
 * Bu component route değişimlerinde unmount olmaz
 * Sidebar'ın her zaman render edilmesini garanti eder
 */
import { Sidebar } from './sidebar'

export function SidebarPersistent() {
  // Global context flag - hydration kontrolü için
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.__FEELLINK_SIDEBAR_ACTIVE__ = true
  }

  return <Sidebar />
}






















