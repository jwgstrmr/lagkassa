import { Link, useParams } from 'react-router-dom'
import { ChevronRight, User } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { formatSek } from '@/lib/money'
import { shortDate } from '@/lib/date'
import { useChildren } from '@/features/children/hooks/useChildren'
import { useCampaignParticipants, useCampaigns } from '@/features/campaigns/hooks/useCampaigns'
import { useTransactions } from '@/features/transactions/hooks/useTransactions'
import { signed, transactionTitle } from '@/features/transactions/lib/finance'
import { due, dueStatus, earned, paidIn } from '@/features/campaigns/lib/sales'
import { dateRange } from '@/features/campaigns/lib/format'

/** Vad ett barn betalat in och tjänat till kassan i lagets händelser */
export function ChildPage() {
  const { id = '' } = useParams()
  const { data: children, isLoading } = useChildren()
  const { data: campaigns = [] } = useCampaigns()
  const { data: transactions = [] } = useTransactions()
  const { data: participants = [] } = useCampaignParticipants()

  const child = children?.find((c) => c.id === id)
  if (isLoading) return <><TopBar showBack /><ListSkeleton /></>
  if (!child) {
    return (
      <>
        <TopBar showBack />
        <EmptyState icon={User} title="Barnet finns inte" />
      </>
    )
  }

  const payments = transactions.filter((t) => t.child_id === id)
  const perCampaign = campaigns
    .map((c) => ({
      campaign: c,
      payments: payments.filter((t) => t.campaign_id === c.id),
      paid: paidIn(transactions, id, c.id),
      earned: earned(transactions, id, c.id),
      due: due(c, id, participants, transactions),
    }))
    .filter((x) => x.payments.length > 0 || x.due)
    // Det som saknas först
    .sort((a, b) => Number(!!b.due && !b.due.done) - Number(!!a.due && !a.due.done))

  return (
    <div>
      <TopBar title={child.name} showBack />

      <div className="p-4 space-y-4">
        <Card className="text-center py-5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[#A0A0A0] text-sm font-medium">Inbetalt</p>
              <p className="text-white text-2xl font-bold mt-1 tabular-nums">{formatSek(paidIn(transactions, id))}</p>
            </div>
            <div>
              <p className="text-[#A0A0A0] text-sm font-medium">Intjänat till kassan</p>
              <p className="text-white text-2xl font-bold mt-1 tabular-nums">{formatSek(earned(transactions, id))}</p>
            </div>
          </div>
        </Card>

        {perCampaign.length === 0 ? (
          <p className="text-[#8A8A8A] text-sm text-center py-6">Inga inbetalningar än</p>
        ) : (
          perCampaign.map((x) => (
            <Card key={x.campaign.id} padding={false} className="overflow-hidden">
              <Link
                to={`/handelser/${x.campaign.id}`}
                className="flex items-center gap-3 px-4 pt-4 pb-3 active:bg-[#1A1A1A]"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-white font-semibold truncate">{x.campaign.name}</span>
                  {dateRange(x.campaign) && (
                    <span className="block text-[#8A8A8A] text-xs">{dateRange(x.campaign)}</span>
                  )}
                  {x.due && (
                    <span className={cn('block text-xs', x.due.done ? 'text-[#22C55E]' : 'text-[#FFD700]')}>
                      {dueStatus(x.due)}
                    </span>
                  )}
                  {x.paid > 0 && (
                    <span className="block text-[#8A8A8A] text-xs">Intjänat till kassan {formatSek(x.earned)}</span>
                  )}
                </span>
                <span className="text-white font-semibold tabular-nums">{formatSek(x.paid)}</span>
                <ChevronRight size={16} className="text-[#8A8A8A]" />
              </Link>
              {x.payments.length > 0 && (
                <ul className="px-4 pb-3 space-y-1 border-t border-[#222222] pt-3">
                  {x.payments.map((t) => (
                    <li key={t.id} className="flex justify-between gap-3 text-sm">
                      <span className="text-[#A0A0A0] truncate">
                        {shortDate(t.date)} · {transactionTitle(t)}
                      </span>
                      <span className="text-[#A0A0A0] tabular-nums shrink-0">{formatSek(signed(t))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
