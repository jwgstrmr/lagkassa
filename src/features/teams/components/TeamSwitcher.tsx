import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { cn } from '@/lib/utils'
import { useTeamStore } from '@/store/teamStore'
import { useActiveTeam } from '../hooks/useTeams'

export function TeamSwitcher() {
  const { team, memberships } = useActiveTeam()
  const setActiveTeam = useTeamStore((s) => s.setActiveTeam)
  const [open, setOpen] = useState(false)

  if (!team) return null
  if (memberships.length === 1) {
    return <span className="text-[#A0A0A0] text-xs font-medium max-w-[9rem] truncate">{team.name}</span>
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[#A0A0A0] text-xs font-medium max-w-[9rem] active:text-white"
      >
        <span className="truncate">{team.name}</span>
        <ChevronDown size={14} className="shrink-0" />
      </button>

      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Välj lag">
        <div className="px-4 pb-6 space-y-2">
          {memberships.map((m) => (
            <button
              key={m.team_id}
              onClick={() => {
                setActiveTeam(m.team_id)
                setOpen(false)
              }}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left',
                m.team_id === team.id
                  ? 'border-[#FFD700] bg-[#FFD700]/10'
                  : 'border-[#222222] bg-[#161616] active:bg-[#1A1A1A]',
              )}
            >
              <span className="flex-1 min-w-0">
                <span className="block text-white font-medium truncate">{m.team.name}</span>
                <span className="block text-[#666666] text-xs">
                  {m.role === 'admin' ? 'Ekonomiansvarig' : 'Förälder'}
                </span>
              </span>
              {m.team_id === team.id && <Check size={18} className="text-[#FFD700]" />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  )
}
