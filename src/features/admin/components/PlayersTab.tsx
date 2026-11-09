import { Link } from 'react-router-dom'
import { ChevronRight, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { formatSek } from '@/lib/money'
import { useChildren, useGuardians } from '@/features/children/hooks/useChildren'
import { due, paidByFamily } from '@/features/campaigns/lib/sales'
import { campaignStatus } from '@/features/campaigns/lib/format'
import { useCampaignParticipants, useCampaigns } from '@/features/campaigns/hooks/useCampaigns'
import { useTransactions } from '@/features/transactions/hooks/useTransactions'
import { useProfiles } from '../hooks/useUsers'
import { displayName } from '../lib/diff'

/**
 * Lagets spelare, vad familjen betalat in och vad som saknas i avslutade försäljningar och
 * avgifter – som Uppföljning, fast per barn. Registret och föräldrarna sköts av huvudadmin.
 */
export function PlayersTab() {
  const { data: children, isLoading } = useChildren()
  const { data: guardians = [] } = useGuardians()
  const { data: profiles = [] } = useProfiles()
  const { data: transactions = [] } = useTransactions()
  const { data: campaigns = [] } = useCampaigns()
  const { data: participants = [] } = useCampaignParticipants()

  const guardianNames = (childId: string) =>
    guardians
      .filter((g) => g.child_id === childId)
      .map((g) => displayName(profiles.find((p) => p.id === g.profile_id)))
      .join(', ')

  // Under en pågående händelse är det väntat att inte ha betalat än, och jobb betalas inte av familjen
  const ended = campaigns.filter((c) => (c.type === 'sale' || c.type === 'fee') && campaignStatus(c) === 'ended')
  function missing(childId: string): string | null {
    const open = ended.flatMap((c) => due(c, childId, participants, transactions) ?? []).filter((d) => !d.done)
    if (!open.length) return null
    const remaining = open.reduce((sum, d) => sum + d.remaining, 0)
    return remaining > 0 ? `${formatSek(remaining)} saknas` : 'Inget registrerat'
  }

  return (
    <div className="p-4">
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : !children?.length ? (
        <EmptyState icon={Users} title="Inga spelare än" />
      ) : (
        <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
          {children.map((c) => {
            const names = guardianNames(c.id)
            const owes = missing(c.id)
            return (
              <Link
                key={c.id}
                to={`/barn/${c.id}`}
                className="flex items-center gap-3 w-full px-4 py-3 active:bg-[#1A1A1A]"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-white text-sm font-medium truncate">{c.name}</span>
                  {/* Utan kopplad förälder ser familjen inte vad den ska betala */}
                  {names ? (
                    <span className="block text-[#8A8A8A] text-xs truncate">{names}</span>
                  ) : (
                    <span className="block text-[#F97316] text-xs">Ingen förälder kopplad</span>
                  )}
                  {owes && <span className="block text-[#FFD700] text-xs">{owes}</span>}
                </span>
                <span className="text-right shrink-0">
                  <span className="block text-white text-sm font-semibold tabular-nums">
                    {formatSek(paidByFamily(transactions, campaigns, c.id))}
                  </span>
                  <span className="block text-[#8A8A8A] text-xs">inbetalt</span>
                </span>
                <ChevronRight size={16} className="text-[#8A8A8A] shrink-0" />
              </Link>
            )
          })}
        </Card>
      )}
    </div>
  )
}
