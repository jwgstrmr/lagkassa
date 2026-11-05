import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import { ArrowLeftRight } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { FAB } from '@/components/layout/FAB'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { formatSek } from '@/lib/money'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useCampaigns } from '@/features/campaigns/hooks/useCampaigns'
import { collapseCampaigns, entryDate, entryNet, type LedgerEntry } from '@/features/transactions/lib/ledger'
import { CampaignLedgerRow } from '@/features/transactions/components/CampaignLedgerRow'
import { useTransactions } from '@/features/transactions/hooks/useTransactions'
import { balance, balanceSeries, byGroup, inYear, netCampaigns, totals, years } from '@/features/transactions/lib/finance'
import { BalanceChart } from '@/features/dashboard/components/BalanceChart'
import { ShareBars } from '@/features/dashboard/components/ShareBars'
import { KIND_TEXT } from '@/features/transactions/lib/colors'
import { TransactionRow } from '@/features/transactions/components/TransactionRow'
import { TransactionSheet } from '@/features/transactions/components/TransactionSheet'
import type { Transaction, TransactionKind } from '@/types/database'

export function TransactionsPage() {
  const { team, isAdmin } = useActiveTeam()
  const { data: transactions, isLoading } = useTransactions()
  const { data: campaigns = [] } = useCampaigns()

  // null = från start – samma som på Hem
  const [year, setYear] = useState<number | null>(null)
  const [kind, setKind] = useState<TransactionKind | null>(null)
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null)

  const yearOptions = useMemo(() => years(transactions ?? []), [transactions])

  const inPeriod = useMemo(
    () => (year === null ? transactions ?? [] : inYear(transactions ?? [], year)),
    [transactions, year],
  )
  // En händelse räknas som intäkt eller utgift efter sitt netto
  const netted = useMemo(
    () => netCampaigns(inPeriod).filter((t) => !kind || t.kind === kind),
    [inPeriod, kind],
  )
  const sum = totals(netted)
  const entries = useMemo(
    () => collapseCampaigns(inPeriod).filter((e) => !kind || (entryNet(e) >= 0 ? 'income' : 'expense') === kind),
    [inPeriod, kind],
  )

  const series = useMemo(
    () => (team && transactions ? balanceSeries(team, transactions) : []),
    [team, transactions],
  )
  const shares = useMemo(
    () =>
      (kind ? [kind] : (['expense', 'income'] as const)).map((k) => ({
        kind: k,
        shares: byGroup(netted, campaigns, k),
      })),
    [netted, campaigns, kind],
  )

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
      <TopBar title="Kassan" />

      {/* Saldot och dess historik gäller hela tiden – därför ovanför filtren */}
      <div className="px-4 pt-4">
        <Card>
          <div className="text-center">
            <p className="text-[#A0A0A0] text-sm font-medium">I kassan</p>
            {team && transactions ? (
              <p className="text-white text-3xl font-bold mt-1 tabular-nums">{formatSek(balance(team, transactions))}</p>
            ) : (
              <Skeleton className="h-9 w-36 mx-auto mt-1" />
            )}
          </div>
          {series.length > 1 && (
            <div className="mt-4">
              <BalanceChart points={series} />
            </div>
          )}
        </Card>
      </div>

      {/* Åren blir fler för varje säsong – de får en egen rad som skrollar i sidled */}
      <div className="pt-4 space-y-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4">
          <Chip active={year === null} onClick={() => setYear(null)}>Från start</Chip>
          {yearOptions.map((y) => (
            <Chip key={y} active={year === y} onClick={() => setYear(y)}>{y}</Chip>
          ))}
        </div>
        <div className="flex gap-2 px-4">
          {(['income', 'expense'] as const).map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(kind === k ? null : k)}>
              {k === 'income' ? 'Intäkter' : 'Utgifter'}
            </Chip>
          ))}
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Inget bokfört"
          actionLabel={isAdmin ? 'Lägg till' : undefined}
          onAction={() => setEditing('new')}
        />
      ) : (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Card className="px-2 py-3">
              <p className="text-[#8A8A8A] text-xs">In</p>
              <p className={`${KIND_TEXT.income} text-sm font-semibold tabular-nums`}>{formatSek(sum.income)}</p>
            </Card>
            <Card className="px-2 py-3">
              <p className="text-[#8A8A8A] text-xs">Ut</p>
              <p className={`${KIND_TEXT.expense} text-sm font-semibold tabular-nums`}>{formatSek(sum.expense)}</p>
            </Card>
            <Card className="px-2 py-3">
              <p className="text-[#8A8A8A] text-xs">Netto</p>
              <p className="text-white text-sm font-semibold tabular-nums">{formatSek(sum.net)}</p>
            </Card>
          </div>

          <Card className="space-y-5">
            {shares.map((s) => (
              <div key={s.kind}>
                <h2 className="text-white font-semibold mb-3">
                  {s.kind === 'expense' ? 'Utgifter' : 'Intäkter'}{year !== null && ` ${year}`}
                </h2>
                {s.shares.length ? (
                  <ShareBars shares={s.shares} kind={s.kind} />
                ) : (
                  <p className="text-[#8A8A8A] text-sm">
                    {s.kind === 'expense' ? 'Inga utgifter' : 'Inga intäkter'}{year !== null && ` ${year}`}
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
                <span className="text-[#8A8A8A] text-xs tabular-nums">
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
                      onClick={isAdmin ? () => setEditing(e.transaction) : undefined}
                    />
                  ),
                )}
              </Card>
            </section>
          ))}
        </div>
      )}

      {isAdmin && <FAB onClick={() => setEditing('new')} label="Ny intäkt eller utgift" />}

      <TransactionSheet editing={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
