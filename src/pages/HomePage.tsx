import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Wallet } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatSek } from '@/lib/money'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useCategories, useTransactions } from '@/features/transactions/hooks/useTransactions'
import { balance, inYear, netCampaigns, totals } from '@/features/transactions/lib/finance'
import { TransactionRow } from '@/features/transactions/components/TransactionRow'
import { MyChildrenCard } from '@/features/children/components/MyChildrenCard'
import { useCampaigns } from '@/features/campaigns/hooks/useCampaigns'
import { CampaignCard } from '@/features/campaigns/components/CampaignCard'
import { isEnded } from '@/features/campaigns/lib/format'
import { collapseCampaigns } from '@/features/transactions/lib/ledger'
import { CampaignLedgerRow } from '@/features/transactions/components/CampaignLedgerRow'

export function HomePage() {
  const navigate = useNavigate()
  const { team, isAdmin } = useActiveTeam()
  const { data: transactions, isLoading } = useTransactions()
  const { data: categories = [] } = useCategories()
  const { data: campaigns = [] } = useCampaigns()
  const year = new Date().getFullYear()
  const ongoing = campaigns.filter((c) => !isEnded(c))

  const stats = useMemo(() => {
    if (!team || !transactions) return null
    const thisYear = inYear(transactions, year)
    return {
      balance: balance(team, transactions),
      year: totals(netCampaigns(thisYear)),
      latest: collapseCampaigns(transactions).slice(0, 5),
    }
  }, [team, transactions, year])

  return (
    <div>
      <TopBar title="Hem" />

      <div className="p-4 space-y-4">
        <Card className="text-center py-6">
          <p className="text-[#A0A0A0] text-sm font-medium">I kassan</p>
          {stats ? (
            <p className="text-white text-4xl font-bold mt-1">{formatSek(stats.balance)}</p>
          ) : (
            <Skeleton className="h-10 w-40 mx-auto mt-2" />
          )}
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-[#A0A0A0] text-xs font-medium">Intäkter {year}</p>
            <p className="text-white text-xl font-bold mt-1">{stats ? formatSek(stats.year.income) : '–'}</p>
          </Card>
          <Card>
            <p className="text-[#A0A0A0] text-xs font-medium">Utgifter {year}</p>
            <p className="text-white text-xl font-bold mt-1">{stats ? formatSek(stats.year.expense) : '–'}</p>
          </Card>
        </div>

        <MyChildrenCard />

        {ongoing.length > 0 && (
          <section>
            <Link
              to="/handelser"
              className="flex items-center justify-between px-1 mb-2 text-[#A0A0A0] text-xs font-semibold uppercase tracking-wider"
            >
              Pågående
              <ChevronRight size={14} className="text-[#666666]" />
            </Link>
            <div className="space-y-2">
              {ongoing.map((c) => <CampaignCard key={c.id} campaign={c} showTotals={false} />)}
            </div>
          </section>
        )}

        {!isLoading && transactions?.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Inga transaktioner än"
            actionLabel={isAdmin ? 'Lägg till' : undefined}
            onAction={() => navigate('/transaktioner')}
          />
        ) : (
          <Card padding={false} className="overflow-hidden">
            <Link
              to="/transaktioner"
              className="flex items-center justify-between px-4 pt-4 pb-2 text-white font-semibold"
            >
              Senaste
              <ChevronRight size={16} className="text-[#666666]" />
            </Link>
            <div className="divide-y divide-[#222222]">
              {stats?.latest.map((e) =>
                e.type === 'campaign' ? (
                  <CampaignLedgerRow
                    key={e.campaignId}
                    campaign={campaigns.find((c) => c.id === e.campaignId)}
                    {...e}
                  />
                ) : (
                  <TransactionRow
                    key={e.transaction.id}
                    transaction={e.transaction}
                    category={categories.find((c) => c.id === e.transaction.category_id)}
                  />
                ),
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
