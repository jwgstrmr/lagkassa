import { Link } from 'react-router-dom'
import { ChevronRight, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { formatSek } from '@/lib/money'
import { useChildren, useGuardians } from '@/features/children/hooks/useChildren'
import { paidByFamily } from '@/features/campaigns/lib/sales'
import { useCampaigns } from '@/features/campaigns/hooks/useCampaigns'
import { useTransactions } from '@/features/transactions/hooks/useTransactions'
import { useProfiles } from '../hooks/useUsers'
import { displayName } from '../lib/diff'

/** Lagets spelare och deras inbetalningar – registret och föräldrarna sköts av huvudadmin */
export function PlayersTab() {
  const { data: children, isLoading } = useChildren()
  const { data: guardians = [] } = useGuardians()
  const { data: profiles = [] } = useProfiles()
  const { data: transactions = [] } = useTransactions()
  const { data: campaigns = [] } = useCampaigns()

  const guardianNames = (childId: string) =>
    guardians
      .filter((g) => g.child_id === childId)
      .map((g) => displayName(profiles.find((p) => p.id === g.profile_id)))
      .join(', ')

  return (
    <div className="p-4">
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : !children?.length ? (
        <EmptyState icon={Users} title="Inga spelare än" />
      ) : (
        <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
          {children.map((c) => (
            <Link
              key={c.id}
              to={`/barn/${c.id}`}
              className="flex items-center gap-3 w-full px-4 py-3 active:bg-[#1A1A1A]"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-white text-sm font-medium truncate">{c.name}</span>
                <span className="block text-[#8A8A8A] text-xs truncate">
                  {guardianNames(c.id) || 'Ingen förälder kopplad'}
                </span>
              </span>
              <span className="text-white text-sm font-semibold tabular-nums shrink-0">
                {formatSek(paidByFamily(transactions, campaigns, c.id))}
              </span>
              <ChevronRight size={16} className="text-[#8A8A8A] shrink-0" />
            </Link>
          ))}
        </Card>
      )}
    </div>
  )
}
