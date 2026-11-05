import { NavLink } from 'react-router-dom'
import { Home, ArrowLeftRight, CalendarDays, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'

const tabs = [
  { to: '/hem', icon: Home, label: 'Hem', adminOnly: false },
  { to: '/transaktioner', icon: ArrowLeftRight, label: 'Kassan', adminOnly: false },
  { to: '/handelser', icon: CalendarDays, label: 'Händelser', adminOnly: false },
  { to: '/admin', icon: Settings, label: 'Admin', adminOnly: true },
]

export function BottomNav() {
  const { isAdmin } = useActiveTeam()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#111111] border-t border-[#333333]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {tabs.filter((t) => isAdmin || !t.adminOnly).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-1 min-h-[60px] py-2 transition-colors',
                isActive ? 'text-[#FFD700]' : 'text-[#8A8A8A]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 1.75} />
                <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
