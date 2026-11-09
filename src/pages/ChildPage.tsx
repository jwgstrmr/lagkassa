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
import { due, dueStatus, earned, owes, paidByFamily, paidIn, type Due } from '@/features/campaigns/lib/sales'
import { campaignStatus, dateRange } from '@/features/campaigns/lib/format'
import type { Campaign, Transaction } from '@/types/database'

/**
 * En händelse för barnet. Det inbetalda beloppet står till höger, och bara där –
 * statusraden säger om det är klart, och raderna visas bara när det finns fler än en.
 */
function CampaignPayments({ campaign, payments, paid, earned: fromChild, due: d }: {
  campaign: Campaign
  payments: Transaction[]
  paid: number
  earned: number
  due: Due | null
}) {
  const single = payments.length === 1 && payments[0].kind === 'income' ? payments[0] : null
  const when = single ? ` ${shortDate(single.date)}` : ''
  // Klart: när, inte hur mycket. Inte klart: det som är kvar – det står ingen annanstans
  const status = d
    ? d.done
      ? `${campaign.type === 'job' ? 'Ersättning mottagen' : 'Betalt'}${when}`
      : dueStatus(d)
    : single && `Betalt${when}`
  // En återbetalning eller flera inbetalningar behöver sina rader
  const rows = payments.length > 1 || payments.some((t) => t.kind === 'expense')

  return (
    <Card padding={false} className="overflow-hidden">
      <Link to={`/handelser/${campaign.id}`} className="flex items-center gap-3 px-4 pt-4 pb-3 active:bg-[#1A1A1A]">
        <span className="flex-1 min-w-0">
          <span className="block text-white font-semibold truncate">{campaign.name}</span>
          {dateRange(campaign) && <span className="block text-[#8A8A8A] text-xs">{dateRange(campaign)}</span>}
          {status && (
            <span
              className={cn(
                'block text-xs',
                d?.done ? 'text-[#22C55E]' : d && owes(d) ? 'text-[#FFD700]' : 'text-[#8A8A8A]',
              )}
            >
              {status}
            </span>
          )}
          {/* Bara när händelsen haft kostnader – annars är det samma belopp som inbetalt */}
          {paid > 0 && fromChild !== paid && (
            <span className="block text-[#8A8A8A] text-xs">Intjänat till kassan {formatSek(fromChild)}</span>
          )}
        </span>
        <span className="text-white font-semibold tabular-nums">{formatSek(paid)}</span>
        <ChevronRight size={16} className="text-[#8A8A8A]" />
      </Link>
      {rows && (
        <ul className="px-4 pb-3 space-y-1 border-t border-[#222222] pt-3">
          {payments.map((t) => (
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
  )
}

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
    // Det föräldrarna har kvar att betala först i varje avsnitt
    .sort((a, b) => Number(!!b.due && owes(b.due)) - Number(!!a.due && owes(a.due)))
  // Samma avsnitt som under Händelser
  const groups = [
    { title: 'Pågående', status: 'ongoing' },
    { title: 'Kommande', status: 'upcoming' },
    { title: 'Avslutade', status: 'ended' },
  ]
    .map((g) => ({ ...g, list: perCampaign.filter((x) => campaignStatus(x.campaign) === g.status) }))
    .filter((g) => g.list.length > 0)

  return (
    <div>
      <TopBar title={child.name} showBack />

      <div className="p-4 space-y-4">
        <Card className="text-center py-5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[#A0A0A0] text-sm font-medium">Inbetalt</p>
              <p className="text-white text-2xl font-bold mt-1 tabular-nums">{formatSek(paidByFamily(transactions, campaigns, id))}</p>
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
          groups.map((g) => (
            <section key={g.title}>
              <h2 className="text-[#A0A0A0] text-xs font-semibold uppercase tracking-wider px-1 mb-2">
                {g.title}
              </h2>
              <div className="space-y-2">
                {g.list.map((x) => <CampaignPayments key={x.campaign.id} {...x} />)}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
