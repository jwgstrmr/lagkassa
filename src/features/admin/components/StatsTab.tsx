import { useState } from 'react'
import { Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { formatSek } from '@/lib/money'
import { useChildren } from '@/features/children/hooks/useChildren'
import { useCampaigns } from '@/features/campaigns/hooks/useCampaigns'
import { useTransactions } from '@/features/transactions/hooks/useTransactions'
import { earned, paidIn } from '@/features/campaigns/lib/sales'
import { ShareBars } from '@/features/dashboard/components/ShareBars'
import type { Share } from '@/features/transactions/lib/finance'
import type { Campaign } from '@/types/database'

type Measure = 'earned' | 'sold'

const MEASURES: { value: Measure; label: string }[] = [
  { value: 'earned', label: 'Intjänat till kassan' },
  { value: 'sold', label: 'Sålt för' },
]

/**
 * En händelse hör till året den började – så att inköpet i december och försäljningen i
 * januari räknas till samma år
 */
function campaignYear(c: Campaign): number {
  return Number((c.start_date ?? c.end_date ?? c.created_at).slice(0, 4))
}

/**
 * Barnens bidrag jämförda, störst först. Intjänat är barnets del av händelsernas netto, jobb
 * inräknade. Sålt för är det barnet betalat in för försäljningar. Avgifter är inget bidrag
 * till kassan och räknas inte i något av dem.
 */
export function StatsTab() {
  const { data: children, isLoading } = useChildren()
  const { data: campaigns = [] } = useCampaigns()
  const { data: transactions = [] } = useTransactions()
  const [year, setYear] = useState<number | null>(null)
  const [measure, setMeasure] = useState<Measure>('earned')

  const contributing = campaigns.filter((c) => c.type !== 'fee')
  // Kommande års händelser har inte gett något än
  const thisYear = new Date().getFullYear()
  const yearOptions = [...new Set([thisYear, ...contributing.map(campaignYear)])]
    .filter((y) => y <= thisYear)
    .sort((a, b) => b - a)
  const counted = contributing.filter(
    (c) => (measure === 'earned' || c.type === 'sale') && (year === null || campaignYear(c) === year),
  )
  const ids = new Set(counted.map((c) => c.id))
  const list = transactions.filter((t) => t.campaign_id && ids.has(t.campaign_id))

  const shares: Share[] = (children ?? [])
    .map((child) => ({
      id: child.id,
      name: child.name,
      amount: Math.max(0, measure === 'earned' ? earned(list, child.id) : paidIn(list, child.id)),
    }))
    .sort((a, b) => b.amount - a.amount)
  const total = shares.reduce((sum, s) => sum + s.amount, 0)
  const title = `${MEASURES.find((m) => m.value === measure)!.label}${year !== null ? ` ${year}` : ''}`

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
        <div className="flex gap-2 px-4">
          {MEASURES.map((m) => (
            <Chip key={m.value} active={measure === m.value} onClick={() => setMeasure(m.value)}>
              {m.label}
            </Chip>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-4"><ListSkeleton rows={4} /></div>
      ) : !children?.length ? (
        <EmptyState icon={Users} title="Inga spelare än" />
      ) : (
        <div className="p-4">
          <Card>
            <h2 className="text-white font-semibold">{title}</h2>
            {total > 0 ? (
              <>
                <p className="text-[#8A8A8A] text-sm mt-0.5 mb-4">
                  Totalt {formatSek(total)} · i snitt {formatSek(Math.round(total / shares.length))} per barn
                </p>
                <ShareBars shares={shares} kind="income" />
              </>
            ) : (
              <p className="text-[#8A8A8A] text-sm mt-1">
                {measure === 'earned' ? 'Inget intjänat' : 'Inget sålt'}{year !== null && ` ${year}`}
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
