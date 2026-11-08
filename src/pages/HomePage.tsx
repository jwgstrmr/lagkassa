import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatSek } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useTransactions } from '@/features/transactions/hooks/useTransactions'
import { balance, netCampaigns, totals } from '@/features/transactions/lib/finance'
import { KIND_TEXT } from '@/features/transactions/lib/colors'
import { MyChildrenCard } from '@/features/children/components/MyChildrenCard'
import { useCampaigns } from '@/features/campaigns/hooks/useCampaigns'
import { CampaignCard } from '@/features/campaigns/components/CampaignCard'
import { OpenDuesCard } from '@/features/campaigns/components/OpenDuesCard'
import { ToPayCard } from '@/features/campaigns/components/ToPayCard'
import { campaignStatus } from '@/features/campaigns/lib/format'
import type { CampaignType, TransactionKind } from '@/types/database'

// Där föräldrarna har något att göra – inte Övrigt
const ONGOING: { type: CampaignType; one: string; many: string }[] = [
  { type: 'sale', one: 'Pågående försäljning', many: 'Pågående försäljningar' },
  { type: 'job', one: 'Pågående jobb', many: 'Pågående jobb' },
  { type: 'fee', one: 'Pågående avgift', many: 'Pågående avgifter' },
]

function Total({ label, ore, small, kind }: { label: string; ore?: number; small?: boolean; kind?: TransactionKind }) {
  return (
    <div className="px-2 py-4 min-w-0">
      <p className="text-[#A0A0A0] text-xs font-medium truncate">{label}</p>
      {ore === undefined ? (
        <Skeleton className="h-6 w-20 mx-auto mt-1" />
      ) : (
        <p className={cn('font-bold mt-0.5 tabular-nums', kind ? KIND_TEXT[kind] : 'text-white', small ? 'text-base' : 'text-lg')}>
          {formatSek(ore)}
        </p>
      )}
    </div>
  )
}

export function HomePage() {
  const { team } = useActiveTeam()
  const { data: transactions } = useTransactions()
  const { data: campaigns = [] } = useCampaigns()
  const ongoing = ONGOING.map((g) => ({
    ...g,
    list: campaigns.filter((c) => c.type === g.type && campaignStatus(c) === 'ongoing'),
  })).filter((g) => g.list.length > 0)

  // Från start – ingående saldo plus intäkter minus utgifter blir det som är i kassan
  const stats = useMemo(() => {
    if (!team || !transactions) return null
    return { balance: balance(team, transactions), ...totals(netCampaigns(transactions)) }
  }, [team, transactions])
  const opening = team?.opening_balance_ore ?? 0

  return (
    <div>
      <TopBar title="Hem" />

      <div className="p-4 space-y-4">
        <Card padding={false} className="overflow-hidden text-center">
          <div className="px-4 pt-6 pb-5">
            <p className="text-[#A0A0A0] text-sm font-medium">I kassan</p>
            {stats ? (
              <p className="text-white text-4xl font-bold mt-1 tabular-nums">{formatSek(stats.balance)}</p>
            ) : (
              <Skeleton className="h-10 w-40 mx-auto mt-2" />
            )}
          </div>
          <div className={cn('grid divide-x divide-[#222222] border-t border-[#222222]', opening ? 'grid-cols-3' : 'grid-cols-2')}>
            {opening !== 0 && <Total label="Ingående saldo" ore={opening} small />}
            <Total label="Intäkter" ore={stats?.income} small={opening !== 0} kind="income" />
            <Total label="Utgifter" ore={stats?.expense} small={opening !== 0} kind="expense" />
          </div>
        </Card>

        <ToPayCard />

        <OpenDuesCard />

        {ongoing.map((g) => (
          <section key={g.type}>
            <Link
              to="/handelser"
              className="flex items-center justify-between px-1 mb-2 text-[#A0A0A0] text-xs font-semibold uppercase tracking-wider"
            >
              {g.list.length === 1 ? g.one : g.many}
              <ChevronRight size={14} className="text-[#8A8A8A]" />
            </Link>
            <div className="space-y-2">
              {g.list.map((c) => <CampaignCard key={c.id} campaign={c} />)}
            </div>
          </section>
        ))}

        <MyChildrenCard />
      </div>
    </div>
  )
}
