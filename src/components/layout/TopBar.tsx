import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn, initials } from '@/lib/utils'
import { useAuthContext } from '@/features/auth/components/AuthProvider'
import { TeamSwitcher } from '@/features/teams/components/TeamSwitcher'

interface TopBarProps {
  title?: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
  actions?: ReactNode
  className?: string
}

export function TopBar({ title, subtitle, showBack, onBack, actions, className }: TopBarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { profile } = useAuthContext()
  const onProfile = pathname.startsWith('/profil')

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#333333] flex items-center h-14 px-4 gap-2',
        className,
      )}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {showBack && (
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-10 h-10 -ml-2 text-[#A0A0A0] active:text-white transition-colors"
          aria-label="Tillbaka"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      <div className="flex-1 min-w-0">
        {title && (
          <h1 className="font-bold text-white text-lg leading-tight truncate">{title}</h1>
        )}
        {subtitle && (
          <p className="text-[#A0A0A0] text-xs truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {actions}
        <div className="flex items-center gap-1.5 ml-1">
          <TeamSwitcher />
          <img
            src="https://cdn06.svenskalag.se/img/clubmarks/2391.png?2"
            alt="Vaksala SK"
            className="w-7 h-7 object-contain"
          />
        </div>
        <button
          onClick={() => navigate('/profil')}
          disabled={onProfile}
          aria-label="Profil"
          className={cn(
            'ml-2 w-8 h-8 rounded-full bg-[#FFD700]/15 flex items-center justify-center overflow-hidden shrink-0 transition-shadow',
            onProfile ? 'ring-2 ring-[#FFD700]' : 'active:scale-95',
          )}
        >
          <span className="text-[#FFD700] text-xs font-bold">{initials(profile?.full_name)}</span>
        </button>
      </div>
    </header>
  )
}
