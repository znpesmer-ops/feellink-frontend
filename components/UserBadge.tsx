import { Building2, UserCheck } from 'lucide-react'

interface UserBadgeProps {
  role?: string
  className?: string
}

export default function UserBadge({ role, className = '' }: UserBadgeProps) {
  if (role === 'corporate' || role === 'CORPORATE') {
    return (
      <span
        title="Kurumsal hesap"
        className={`ml-1 inline-flex items-center justify-center w-4 h-4 bg-[#ff7b00] text-white rounded-md shadow-sm border border-black/10 ${className}`}
      >
        <Building2 size={10} strokeWidth={2.5} />
      </span>
    )
  }
  
  if (role === 'user' || role === 'USER') {
    return (
      <span
        title="Bireysel kullanıcı"
        className={`ml-1 inline-flex items-center justify-center w-4 h-4 bg-[#ffa94d] text-white rounded-full shadow-sm border border-white/20 ${className}`}
      >
        <UserCheck size={10} strokeWidth={2.5} />
      </span>
    )
  }
  
  return null
}

