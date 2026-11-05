import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatSek } from '@/lib/money'
import { useTeamStore } from '@/store/teamStore'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useOpenDues, type OpenDue } from '../hooks/useCampaigns'

/** Ekonomiansvarigs att göra – händelser där barn inte betalat klart, i alla hennes lag */
export function OpenDuesCard() {
  const navigate = useNavigate()
  const { teamId, isAdmin } = useActiveTeam()
  const setActiveTeam = useTeamStore((s) => s.setActiveTeam)
  const { data: dues = [] } = useOpenDues()

  if (!isAdmin || !dues.length) return null

  const byCampaign = new Map<string, OpenDue[]>()
  for (const d of dues) byCampaign.set(d.campaign_id, [...(byCampaign.get(d.campaign_id) ?? []), d])
  const severalTeams = new Set(dues.map((d) => d.team_id)).size > 1

  function open(d: OpenDue) {
    if (d.team_id !== teamId) setActiveTeam(d.team_id)
    navigate(`/handelser/${d.campaign_id}`)
  }

  return (
    <Card padding={false} className="overflow-hidden">
      <h2 className="text-white font-semibold px-4 pt-4 pb-2">Saknade inbetalningar</h2>
      <div className="divide-y divide-[#222222]">
        {[...byCampaign.values()].map((list) => {
          const first = list[0]
          const remaining = list.reduce(
            (sum, d) => sum + (d.expected_ore ? Math.max(0, d.expected_ore - d.paid_ore) : 0),
            0,
          )
          const names = list.map((d) => d.child_name)
          return (
            <button
              key={first.campaign_id}
              onClick={() => open(first)}
              className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-[#1A1A1A]"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-white text-sm font-medium truncate">
                  {first.campaign_name}
                  {severalTeams && <span className="text-[#A0A0A0] font-normal"> · {first.team_name}</span>}
                </span>
                <span className="block text-[#A0A0A0] text-xs truncate">
                  {names.slice(0, 3).join(', ')}
                  {names.length > 3 && ` +${names.length - 3}`}
                </span>
              </span>
              <span className="text-right shrink-0">
                <span className="block text-[#FFD700] text-sm font-semibold tabular-nums">
                  {remaining > 0 ? formatSek(remaining) : `${list.length} st`}
                </span>
                <span className="block text-[#A0A0A0] text-xs">
                  {remaining > 0 ? 'kvar' : 'ej registrerat'}
                </span>
              </span>
              <ChevronRight size={16} className="text-[#8A8A8A] shrink-0" />
            </button>
          )
        })}
      </div>
    </Card>
  )
}
