import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { formatSek } from '@/lib/money'
import { useChartTheme } from '@/lib/chartTheme'
import { cn, pluralize } from '@/lib/utils'
import { useChildren } from '@/features/children/hooks/useChildren'
import { useCampaignParticipants, useCampaigns } from '@/features/campaigns/hooks/useCampaigns'
import { useTransactions } from '@/features/transactions/hooks/useTransactions'
import { earned, paidIn } from '@/features/campaigns/lib/sales'
import { campaignStatus } from '@/features/campaigns/lib/format'
import { ShareBars } from '@/features/dashboard/components/ShareBars'
import { totals, type Share } from '@/features/transactions/lib/finance'
import { KIND_TEXT } from '@/features/transactions/lib/colors'
import type { Campaign } from '@/types/database'

type Measure = 'earned' | 'sold' | 'participation'

const MEASURES: { value: Measure; label: string }[] = [
  { value: 'earned', label: 'Intjänat till kassan' },
  { value: 'sold', label: 'Sålt för' },
  { value: 'participation', label: 'Deltagande' },
]

/**
 * En händelse hör till året den började – så att inköpet i december och försäljningen i
 * januari räknas till samma år
 */
function campaignYear(c: Campaign): number {
  return Number((c.start_date ?? c.end_date ?? c.created_at).slice(0, 4))
}

const decimal = (n: number) => n.toLocaleString('sv-SE', { maximumFractionDigits: 1 })

/** Hur många av händelserna barnet var med i – stapeln är full när barnet var med i alla */
function CountBars({ rows, of }: { rows: { id: string; name: string; count: number }[]; of: number }) {
  const c = useChartTheme()
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-white truncate">{r.name}</span>
            <span className="text-white tabular-nums shrink-0">{r.count} av {of}</span>
          </div>
          <div className="mt-1.5 h-2">
            <div className="h-full rounded-r" style={{ width: `${(r.count / of) * 100}%`, backgroundColor: c.income }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Barnens bidrag jämförda, störst först, och vad varje händelse gav. Intjänat är barnets del av
 * händelsernas netto, jobb inräknade. Sålt för är det barnet betalat in för försäljningar.
 * Deltagande är hur många försäljningar och jobb barnet var med i. Avgifter är inget bidrag till
 * kassan och räknas inte.
 */
export function StatsTab() {
  const { data: children, isLoading } = useChildren()
  const { data: campaigns = [] } = useCampaigns()
  const { data: transactions = [] } = useTransactions()
  const { data: participants = [] } = useCampaignParticipants()
  const [year, setYear] = useState<number | null>(null)
  const [measure, setMeasure] = useState<Measure>('earned')

  const kids = children ?? []
  const inTeam = (childId: string) => kids.some((c) => c.id === childId)
  const isParticipant = (c: Campaign, childId: string) =>
    participants.some((p) => p.campaign_id === c.id && p.child_id === childId)

  // Kommande års händelser har inte gett något än
  const thisYear = new Date().getFullYear()
  const contributing = campaigns.filter((c) => c.type !== 'fee' && campaignStatus(c) !== 'upcoming')
  const yearOptions = [...new Set([thisYear, ...contributing.map(campaignYear)])]
    .filter((y) => y <= thisYear)
    .sort((a, b) => b - a)
  const inPeriod = contributing.filter((c) => year === null || campaignYear(c) === year)
  const txOf = (list: Campaign[]) => {
    const ids = new Set(list.map((c) => c.id))
    return transactions.filter((t) => t.campaign_id && ids.has(t.campaign_id))
  }

  const sales = inPeriod.filter((c) => c.type === 'sale')
  const salesTx = txOf(sales)
  const allTx = txOf(inPeriod)
  const shares: Share[] = kids
    .map((child) => ({
      id: child.id,
      name: child.name,
      amount: Math.max(0, measure === 'earned' ? earned(allTx, child.id) : paidIn(salesTx, child.id)),
    }))
    .sort((a, b) => b.amount - a.amount)
  const total = shares.reduce((sum, s) => sum + s.amount, 0)

  // Med i en försäljning är den som sålt något, med i ett jobb den som jobbade
  const salesAndJobs = inPeriod.filter((c) => c.type === 'sale' || c.type === 'job')
  const took = kids
    .map((child) => ({
      id: child.id,
      name: child.name,
      count: salesAndJobs.filter(
        (c) => paidIn(transactions, child.id, c.id) > 0 || (c.type === 'job' && isParticipant(c, child.id)),
      ).length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'sv'))
  const tookTotal = took.reduce((sum, r) => sum + r.count, 0)

  // Vad varje händelse gav – mest först. Barnen räknas bland deltagarna, annars de som betalat in
  const results = inPeriod
    .map((c) => {
      const list = transactions.filter((t) => t.campaign_id === c.id)
      const sum = totals(list)
      const invited = participants.filter((p) => p.campaign_id === c.id && inTeam(p.child_id)).length
      const paying = new Set(list.filter((t) => t.child_id && t.kind === 'income').map((t) => t.child_id)).size
      const count = invited || paying
      // Hela kronor – ett snitt med ören ser exaktare ut än det är
      return { campaign: c, ...sum, perChild: count ? Math.round(sum.net / count / 100) * 100 : null }
    })
    .filter((r) => r.income > 0)
    .sort((a, b) => b.net - a.net)

  const suffix = year !== null ? ` ${year}` : ''
  const title = `${MEASURES.find((m) => m.value === measure)!.label}${suffix}`

  return (
    <div>
      {/* Som i Kassan – åren får en egen rad som skrollar i sidled */}
      <div className="pt-4 space-y-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4">
          <Chip active={year === null} onClick={() => setYear(null)}>Från start</Chip>
          {yearOptions.map((y) => (
            <Chip key={y} active={year === y} onClick={() => setYear(y)}>{y}</Chip>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4">
          {MEASURES.map((m) => (
            <Chip key={m.value} active={measure === m.value} onClick={() => setMeasure(m.value)}>
              {m.label}
            </Chip>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-4"><ListSkeleton rows={4} /></div>
      ) : !kids.length ? (
        <EmptyState icon={Users} title="Inga spelare än" />
      ) : (
        <div className="p-4 space-y-4">
          <Card>
            <h2 className="text-white font-semibold">{title}</h2>
            {measure === 'participation' ? (
              salesAndJobs.length > 0 ? (
                <>
                  <p className="text-[#8A8A8A] text-sm mt-0.5 mb-4">
                    {pluralize(salesAndJobs.length, 'försäljning eller jobb', 'försäljningar och jobb')}
                    {' · '}i snitt med i {decimal(tookTotal / took.length)} per barn
                  </p>
                  <CountBars rows={took} of={salesAndJobs.length} />
                </>
              ) : (
                <p className="text-[#8A8A8A] text-sm mt-1">Inga försäljningar eller jobb{suffix}</p>
              )
            ) : total > 0 ? (
              <>
                <p className="text-[#8A8A8A] text-sm mt-0.5 mb-4">
                  Totalt {formatSek(total)} · i snitt {formatSek(Math.round(total / shares.length))} per barn
                </p>
                <ShareBars shares={shares} kind="income" />
              </>
            ) : (
              <p className="text-[#8A8A8A] text-sm mt-1">
                {measure === 'earned' ? 'Inget intjänat' : 'Inget sålt'}{suffix}
              </p>
            )}
          </Card>

          <Card padding={false} className="overflow-hidden">
            <h2 className="text-white font-semibold px-4 pt-4 pb-2">Resultat per händelse{suffix}</h2>
            {results.length === 0 ? (
              <p className="text-[#8A8A8A] text-sm px-4 pb-4">Inga händelser{suffix}</p>
            ) : (
              <div className="divide-y divide-[#222222]">
                {results.map((r) => (
                  <Link
                    key={r.campaign.id}
                    to={`/handelser/${r.campaign.id}`}
                    className="flex items-center gap-3 px-4 py-3 active:bg-[#1A1A1A]"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-white text-sm font-medium truncate">{r.campaign.name}</span>
                      <span className="block text-[#8A8A8A] text-xs truncate">
                        {[
                          r.perChild !== null && `${formatSek(r.perChild)} per barn`,
                          r.net < 0 ? 'gick back' : `${Math.round((r.net / r.income) * 100)} % kvar efter kostnader`,
                        ].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className={cn('text-sm font-semibold tabular-nums shrink-0', r.net < 0 ? KIND_TEXT.expense : 'text-white')}>
                      {formatSek(r.net)}
                    </span>
                    <ChevronRight size={16} className="text-[#8A8A8A] shrink-0 -mr-1" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
