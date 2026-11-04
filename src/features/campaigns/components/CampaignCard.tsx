import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { formatSek } from '@/lib/money'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useMyChildren } from '@/features/children/hooks/useChildren'
import { useCategories, useTransactions } from '@/features/transactions/hooks/useTransactions'
import { totals } from '@/features/transactions/lib/finance'
import { useCampaignParticipants } from '../hooks/useCampaigns'
import { due, dueStatus, paidIn } from '../lib/sales'
import { dateRange } from '../lib/format'
import type { Campaign } from '@/types/database'

/** En händelse i en lista – med de egna barnens betalstatus och, för admin, hur många som betalat */
export function CampaignCard({ campaign: c, showTotals = true }: {
  campaign: Campaign
  /** In, kostnader och netto – startsidan klarar sig utan */
  showTotals?: boolean
}) {
  const { isAdmin } = useActiveTeam()
  const { data: transactions = [] } = useTransactions()
  const { data: categories = [] } = useCategories()
  const { data: participants = [] } = useCampaignParticipants()
  const { data: myChildren } = useMyChildren()

  const sum = totals(transactions.filter((t) => t.campaign_id === c.id))
  const meta = [categories.find((cat) => cat.id === c.category_id)?.name, dateRange(c)].filter(Boolean).join(' · ')
  const dues = participants
    .filter((p) => p.campaign_id === c.id)
    .flatMap((p) => due(c, p.child_id, participants, transactions) ?? [])
  const paidCount = dues.filter((d) => d.done).length
  const showPaid = isAdmin && dues.length > 0

  // De egna barnens status – det föräldern vill kontrollera
  const mine = myChildren.flatMap((child) => {
    const d = due(c, child.id, participants, transactions)
    if (d) return [{ child, text: dueStatus(d), done: d.done }]
    const paid = paidIn(transactions, child.id, c.id)
    return paid ? [{ child, text: `Inbetalt ${formatSek(paid)}`, done: true }] : []
  })

  return (
    <Link to={`/handelser/${c.id}`}>
      <Card className="flex items-center gap-3 active:bg-[#1A1A1A]">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{c.name}</p>
          {meta && <p className="text-[#666666] text-xs mt-0.5">{meta}</p>}
          {mine.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {mine.map((m) => (
                <p key={m.child.id} className="text-xs truncate">
                  <span className="text-white">{m.child.name}</span>
                  <span className={m.done ? 'text-[#22C55E]' : 'text-[#FFD700]'}> · {m.text}</span>
                </p>
              ))}
            </div>
          )}
          {(showTotals || showPaid) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
              {showTotals && (
                <>
                  <span className="text-[#A0A0A0]">
                    In <span className="text-white font-semibold tabular-nums">{formatSek(sum.income)}</span>
                  </span>
                  <span className="text-[#A0A0A0]">
                    Kostnader <span className="text-white font-semibold tabular-nums">{formatSek(sum.expense)}</span>
                  </span>
                  <span className="text-[#A0A0A0]">
                    Netto <span className="text-white font-semibold tabular-nums">{formatSek(sum.net)}</span>
                  </span>
                </>
              )}
              {showPaid && (
                <span className="text-[#A0A0A0]">
                  Betalt{' '}
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      paidCount === dues.length ? 'text-[#22C55E]' : 'text-white',
                    )}
                  >
                    {paidCount}/{dues.length}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronRight size={16} className="text-[#666666] shrink-0" />
      </Card>
    </Link>
  )
}
