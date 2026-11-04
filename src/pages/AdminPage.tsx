import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Tabs } from '@/components/ui/Tabs'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { PlayersTab } from '@/features/admin/components/PlayersTab'
import { ParentsTab } from '@/features/admin/components/ParentsTab'
import { CategoriesTab } from '@/features/admin/components/CategoriesTab'
import { TeamTab } from '@/features/admin/components/TeamTab'

type Tab = 'players' | 'parents' | 'categories' | 'team'

const TABS: { value: Tab; label: string }[] = [
  { value: 'players', label: 'Spelare' },
  { value: 'parents', label: 'Föräldrar' },
  { value: 'categories', label: 'Kategorier' },
  { value: 'team', label: 'Lag' },
]

/** Det aktiva lagets administration */
export function AdminPage() {
  const navigate = useNavigate()
  const { team, isSuperAdmin } = useActiveTeam()
  const [tab, setTab] = useState<Tab>('players')
  return (
    <div>
      <TopBar
        title="Admin"
        subtitle={team?.name}
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
      {tab === 'players' && <PlayersTab />}
      {tab === 'parents' && <ParentsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'team' && <TeamTab />}
    </div>
  )
}
