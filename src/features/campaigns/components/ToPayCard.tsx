import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Card } from '@/components/ui/Card'
import { shortDate } from '@/lib/date'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useMyChildren } from '@/features/children/hooks/useChildren'
import { useTransactions } from '@/features/transactions/hooks/useTransactions'
import { useCampaignParticipants, useCampaigns } from '../hooks/useCampaigns'
import { due, dueStatus, owes } from '../lib/sales'
import { SwishButton } from './SwishButton'

/**
 * Det som återstår att betala för de egna barnen – även i händelser som är avslutade,
 * så att en missad avgift inte försvinner från Hem. Tidigast sista dag först.
 */
export function ToPayCard() {
  const { team } = useActiveTeam()
  const { data: myChildren } = useMyChildren()
  const { data: campaigns = [] } = useCampaigns()
  const { data: participants = [] } = useCampaignParticipants()
  const { data: transactions = [] } = useTransactions()

  const items = campaigns
    .flatMap((campaign) =>
      myChildren.flatMap((child) => {
        const d = due(campaign, child.id, participants, transactions)
        return d && owes(d) ? [{ campaign, child, due: d }] : []
      }),
    )
    .sort((a, b) => (a.campaign.end_date ?? '9999').localeCompare(b.campaign.end_date ?? '9999'))

  if (!items.length) return null
  const several = myChildren.length > 1

  async function copy(number: string) {
    try {
      await navigator.clipboard.writeText(number)
      toast.success('Numret är kopierat')
    } catch {
      toast(number)
    }
  }

  return (
    <Card padding={false} className="overflow-hidden">
      <h2 className="text-white font-semibold px-4 pt-4 pb-2">Att betala</h2>
      <div className="divide-y divide-[#222222]">
        {items.map(({ campaign, child, due: d }) => (
          <div key={`${campaign.id}-${child.id}`} className="flex items-center gap-3 px-4 py-3">
            <Link to={`/handelser/${campaign.id}`} className="flex-1 min-w-0">
              <span className="block text-white text-sm font-medium truncate">
                {campaign.name}
                {several && <span className="text-[#A0A0A0] font-normal"> · {child.name}</span>}
              </span>
              <span className="block text-[#FFD700] text-xs truncate">
                {dueStatus(d)}
                {campaign.end_date && ` · senast ${shortDate(campaign.end_date)}`}
              </span>
            </Link>
            <SwishButton amountOre={d.remaining || null} message={`${child.name} ${campaign.name}`} />
          </div>
        ))}
      </div>
      {/* I en dator öppnar knappen bara Swish webbsida – numret går att kopiera */}
      {team?.swish_number && (
        <button
          onClick={() => copy(team.swish_number!)}
          className="block w-full px-4 py-3 border-t border-[#222222] text-left text-[#8A8A8A] text-xs active:bg-[#1A1A1A]"
        >
          Swish {team.swish_number}
        </button>
      )}
    </Card>
  )
}
