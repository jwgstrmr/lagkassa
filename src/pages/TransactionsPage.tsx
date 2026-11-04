import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import { ArrowLeftRight } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { FAB } from '@/components/layout/FAB'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { formatSek } from '@/lib/money'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useCampaigns } from '@/features/campaigns/hooks/useCampaigns'
import { collapseCampaigns, entryDate, entryNet, type LedgerEntry } from '@/features/transactions/lib/ledger'
import { CampaignLedgerRow } from '@/features/transactions/components/CampaignLedgerRow'
import { useCategories, useTransactions } from '@/features/transactions/hooks/useTransactions'
import { balanceSeries, byCategory, inYear, netCampaigns, totals, years } from '@/features/transactions/lib/finance'
import { BalanceChart } from '@/features/dashboard/components/BalanceChart'
import { CategoryBars } from '@/features/dashboard/components/CategoryBars'
import { TransactionRow } from '@/features/transactions/components/TransactionRow'
import { TransactionForm } from '@/features/transactions/components/TransactionForm'
import type { Transaction, TransactionKind } from '@/types/database'

export function TransactionsPage() {
  const { team, isAdmin } = useActiveTeam()
  const { data: transactions, isLoading } = useTransactions()
  const { data: categories = [] } = useCategories()
  const { data: campaigns = [] } = useCampaigns()

  const [year, setYear] = useState(new Date().getFullYear())
  const [kind, setKind] = useState<TransactionKind | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null)

  const yearOptions = useMemo(() => years(transactions ?? []), [transactions])

  const inCategory = useMemo(
    () => inYear(transactions ?? [], year).filter((t) => !categoryId || t.category_id === categoryId),
    [transactions, year, categoryId],
  )
  // En händelse räknas som intäkt eller utgift efter sitt netto
  const sum = totals(netCampaigns(inCategory).filter((t) => !kind || t.kind === kind))
  const entries = useMemo(
    () =>
      collapseCampaigns(inCategory).filter(
        (e) => !kind || (entryNet(e) >= 0 ? 'income' : 'expense') === kind,
      ),
    [inCategory, kind],
  )

  const series = useMemo(
    () => (team && transactions ? balanceSeries(team, transactions) : []),
    [team, transactions],
  )
  // Fördelningen per kategori följer år och typ, inte vald kategori
  const shares = useMemo(() => {
    const thisYear = netCampaigns(inYear(transactions ?? [], year))
    return (kind ? [kind] : (['expense', 'income'] as const)).map((k) => ({
      kind: k,
      shares: byCategory(thisYear, categories, k),
    }))
  }, [transactions, categories, year, kind])

  // En händelse hamnar i månaden för sin senaste transaktion
  const months = useMemo(() => {
    const groups = new Map<string, LedgerEntry[]>()
    for (const e of entries) {
      const key = entryDate(e).slice(0, 7)
      groups.set(key, [...(groups.get(key) ?? []), e])
    }
    return [...groups.entries()]
  }, [entries])

  return (
    <div>
      <TopBar title="Lagkassan" />

      <div className="px-4 pt-3 space-y-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {yearOptions.map((y) => (
            <Chip key={y} active={year === y} onClick={() => setYear(y)}>{y}</Chip>
          ))}
          <span className="w-px bg-[#333333] shrink-0 mx-1" />
          <Chip active={kind === 'income'} onClick={() => setKind(kind === 'income' ? null : 'income')}>
            Intäkter
          </Chip>
          <Chip active={kind === 'expense'} onClick={() => setKind(kind === 'expense' ? null : 'expense')}>
            Utgifter
          </Chip>
        </div>
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {categories.map((c) => (
              <Chip
                key={c.id}
                active={categoryId === c.id}
                color={c.color}
                onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
              >
                {c.name}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Inga transaktioner"
          actionLabel={isAdmin ? 'Lägg till' : undefined}
          onAction={() => setEditing('new')}
        />
      ) : (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Card className="px-2 py-3">
              <p className="text-[#666666] text-xs">In</p>
              <p className="text-white text-sm font-semibold tabular-nums">{formatSek(sum.income)}</p>
            </Card>
            <Card className="px-2 py-3">
              <p className="text-[#666666] text-xs">Ut</p>
              <p className="text-white text-sm font-semibold tabular-nums">{formatSek(sum.expense)}</p>
            </Card>
            <Card className="px-2 py-3">
              <p className="text-[#666666] text-xs">Netto</p>
              <p className="text-white text-sm font-semibold tabular-nums">{formatSek(sum.net)}</p>
            </Card>
          </div>

          {series.length > 1 && (
            <Card>
              <h2 className="text-white font-semibold mb-3">Saldo över tid</h2>
              <BalanceChart points={series} />
            </Card>
          )}

          <Card className="space-y-5">
            {shares.map((s) => (
              <div key={s.kind}>
                <h2 className="text-white font-semibold mb-3">
                  {s.kind === 'expense' ? 'Utgifter' : 'Intäkter'} {year}
                </h2>
                {s.shares.length ? (
                  <CategoryBars shares={s.shares} />
                ) : (
                  <p className="text-[#666666] text-sm">
                    {s.kind === 'expense' ? `Inga utgifter ${year}` : `Inga intäkter ${year}`}
                  </p>
                )}
              </div>
            ))}
          </Card>

          {months.map(([month, list]) => (
            <section key={month}>
              <div className="flex items-baseline justify-between px-1 mb-2">
                <h2 className="text-[#A0A0A0] text-xs font-semibold uppercase tracking-wider">
                  {format(parseISO(`${month}-01`), 'LLLL yyyy', { locale: sv })}
                </h2>
                <span className="text-[#666666] text-xs tabular-nums">
                  {formatSek(list.reduce((sum, e) => sum + entryNet(e), 0))}
                </span>
              </div>
              <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
                {list.map((e) =>
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
                      onClick={isAdmin ? () => setEditing(e.transaction) : undefined}
                    />
                  ),
                )}
              </Card>
            </section>
          ))}
        </div>
      )}

      {isAdmin && <FAB onClick={() => setEditing('new')} label="Ny transaktion" />}

      <BottomSheet
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Ny transaktion' : 'Ändra transaktion'}
      >
        {editing !== null && (
          <TransactionForm
            key={editing === 'new' ? 'new' : editing.id}
            transaction={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </BottomSheet>
    </div>
  )
}
