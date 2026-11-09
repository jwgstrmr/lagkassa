import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Tabs } from '@/components/ui/Tabs'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { OverviewTab } from '@/features/admin/components/OverviewTab'
import { PlayersTab } from '@/features/admin/components/PlayersTab'

type Tab = 'overview' | 'players'

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Uppföljning' },
  { value: 'players', label: 'Spelare' },
]

/**
 * Ekonomiansvarigs uppföljning av det aktiva laget och lagets spelare med deras inbetalningar.
 * Lag, spelare, föräldrar och ingående saldo sköts under Huvudadmin – pengarna under Kassan och Händelser.
 */
export function AdminPage() {
  const navigate = useNavigate()
  const { pathname, state } = useLocation()
  const { isSuperAdmin } = useActiveTeam()
  const [tab, setTab] = useState<Tab>((state as { tab?: Tab } | null)?.tab ?? 'overview')

  // Fliken sparas i historiken – tillbaka från en händelse eller ett barn hamnar man där man var
  useEffect(() => {
    navigate(pathname, { replace: true, state: { tab } })
  }, [navigate, pathname, tab])

  return (
    <div>
      <TopBar
        title="Admin"
        actions={
          isSuperAdmin && (
            <button
              onClick={() => navigate('/huvudadmin')}
              aria-label="Alla lag"
              className="w-10 h-10 flex items-center justify-center text-[#A0A0A0] active:text-white"
            >
              <Building2 size={20} />
            </button>
          )
        }
      />
      <Tabs value={tab} tabs={TABS} onChange={setTab} />
      {tab === 'overview' && <OverviewTab />}
      {tab === 'players' && <PlayersTab />}
    </div>
  )
}
