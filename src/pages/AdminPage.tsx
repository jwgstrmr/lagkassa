import { useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { PlayersTab } from '@/features/admin/components/PlayersTab'

/**
 * Det aktiva lagets spelare och deras inbetalningar. Lag, spelare, föräldrar och ingående saldo
 * sköts under Huvudadmin – ekonomiansvarig sköter pengarna under Kassan och Händelser.
 */
export function AdminPage() {
  const navigate = useNavigate()
  const { isSuperAdmin } = useActiveTeam()
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
      <PlayersTab />
    </div>
  )
}
