import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Pencil, Plus, CalendarDays, Users } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { formatSek } from '@/lib/money'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useChildren } from '@/features/children/hooks/useChildren'
import { useCampaignParticipants, useCampaigns } from '@/features/campaigns/hooks/useCampaigns'
import { useCategories, useTransactions } from '@/features/transactions/hooks/useTransactions'
import { totals } from '@/features/transactions/lib/finance'
import { due, paidIn } from '@/features/campaigns/lib/sales'
import { dateRange } from '@/features/campaigns/lib/format'
import { CampaignForm } from '@/features/campaigns/components/CampaignForm'
import { BulkIncomeForm } from '@/features/campaigns/components/BulkIncomeForm'
import { TransactionRow } from '@/features/transactions/components/TransactionRow'
import { TransactionForm } from '@/features/transactions/components/TransactionForm'
import type { Transaction, TransactionKind } from '@/types/database'

type Sheet =
  | { type: 'campaign' }
  | { type: 'bulk' }
  | { type: 'transaction'; transaction?: Transaction; kind?: TransactionKind; childId?: string; amountOre?: number }

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[#666666] text-xs">{label}</p>
      <p className="text-white font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export function CampaignDetailPage() {
  const { id = '' } = useParams()
  const { isAdmin } = useActiveTeam()
  const { data: campaigns, isLoading } = useCampaigns()
  const { data: children = [] } = useChildren()
  const { data: transactions = [] } = useTransactions()
  const { data: categories = [] } = useCategories()
  const { data: participants = [] } = useCampaignParticipants()
  const [sheet, setSheet] = useState<Sheet | null>(null)

  const campaign = campaigns?.find((c) => c.id === id)
  if (isLoading) return <><TopBar showBack /><ListSkeleton /></>
  if (!campaign) {
    return (
      <>
        <TopBar showBack />
        <EmptyState icon={CalendarDays} title="Händelsen finns inte" />
      </>
    )
  }

  const linked = transactions.filter((t) => t.campaign_id === id)
  const sum = totals(linked)
  const range = dateRange(campaign)

  // Betalar barnen in visas de som ska betala, plus andra barn som ändå har något bokfört
  const childrenPay = participants.some((p) => p.campaign_id === id)
  const rows = children
    .map((child) => ({ child, due: due(campaign, child.id, participants, transactions) }))
    .filter(({ child, due: d }) => !childrenPay || d || linked.some((t) => t.child_id === child.id))

  const sheetTitle =
    sheet?.type === 'campaign'
      ? 'Ändra händelse'
      : sheet?.type === 'bulk'
        ? 'Inbetalningar'
        : sheet?.transaction
          ? 'Ändra transaktion'
          : sheet?.childId ? 'Ny intäkt' : 'Lägg till'

  return (
    <div>
      <TopBar
        title={campaign.name}
        subtitle={range ?? undefined}
        showBack
        actions={
          isAdmin && (
            <button
              onClick={() => setSheet({ type: 'campaign' })}
              aria-label="Ändra händelse"
              className="w-10 h-10 flex items-center justify-center text-[#A0A0A0] active:text-white"
            >
              <Pencil size={18} />
            </button>
          )
        }
      />

      <div className="p-4 space-y-4">
        {campaign.notes && (
          <Card>
            <h2 className="text-white font-semibold mb-2">Information</h2>
            <p className="text-white text-sm leading-relaxed whitespace-pre-line break-words">{campaign.notes}</p>
          </Card>
        )}

        <Card>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Intäkter" value={formatSek(sum.income)} />
            <Stat label="Kostnader" value={formatSek(sum.expense)} />
            <Stat label="Netto" value={formatSek(sum.net)} />
          </div>
        </Card>

        {rows.length > 0 && (
          <Card padding={false} className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
              <h2 className="text-white font-semibold">
                {isAdmin ? 'Per barn' : children.length === 1 ? 'Mitt barn' : 'Mina barn'}
              </h2>
              {isAdmin && (
                <Button size="sm" variant="secondary" onClick={() => setSheet({ type: 'bulk' })}>
                  <Users size={16} className="mr-1" /> Alla barn
                </Button>
              )}
            </div>
            <div className="divide-y divide-[#222222]">
              {rows.map(({ child, due: d }) => {
                const paid = d ? d.paid : paidIn(linked, child.id)
                const Row = isAdmin ? 'button' : 'div'
                return (
                  <Row
                    key={child.id}
                    onClick={
                      isAdmin
                        ? () => setSheet({ type: 'transaction', kind: 'income', childId: child.id, amountOre: d?.remaining || undefined })
                        : undefined
                    }
                    className="flex items-center justify-between gap-3 w-full px-4 py-3 text-left active:bg-[#1A1A1A]"
                  >
                    <span className="min-w-0">
                      <span className="block text-white text-sm truncate">{child.name}</span>
                      {d && !d.done && (
                        <span className="block text-[#666666] text-xs">
                          {d.expected ? `${formatSek(d.remaining)} kvar` : 'Inget registrerat'}
                        </span>
                      )}
                    </span>
                    {d ? (
                      <span
                        className={cn(
                          'text-sm tabular-nums whitespace-nowrap',
                          d.done ? 'text-[#22C55E] font-semibold' : d.paid ? 'text-white font-semibold' : 'text-[#666666]',
                        )}
                      >
                        {formatSek(d.paid)}
                        {d.expected ? <span className="text-[#666666] font-normal"> / {formatSek(d.expected)}</span> : null}
                      </span>
                    ) : (
                      <span className={cn('text-sm tabular-nums', paid ? 'text-white font-semibold' : 'text-[#666666]')}>
                        {formatSek(paid)}
                      </span>
                    )}
                  </Row>
                )
              })}
            </div>
          </Card>
        )}

        <Card padding={false} className="overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
            <h2 className="text-white font-semibold">Intäkter och utgifter</h2>
            {isAdmin && (
              <Button size="sm" variant="secondary" onClick={() => setSheet({ type: 'transaction' })}>
                <Plus size={16} className="mr-1" /> Lägg till
              </Button>
            )}
          </div>
          {linked.length === 0 ? (
            <p className="text-[#666666] text-sm px-4 pb-4">Inget bokfört än</p>
          ) : (
            <div className="divide-y divide-[#222222]">
              {linked.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  category={categories.find((c) => c.id === t.category_id)}
                  child={children.find((c) => c.id === t.child_id)}
                  onClick={isAdmin ? () => setSheet({ type: 'transaction', transaction: t }) : undefined}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <BottomSheet isOpen={sheet !== null} onClose={() => setSheet(null)} title={sheetTitle}>
        {sheet?.type === 'campaign' && <CampaignForm campaign={campaign} onDone={() => setSheet(null)} />}
        {sheet?.type === 'bulk' && (
          <BulkIncomeForm campaign={campaign} children={children} onDone={() => setSheet(null)} />
        )}
        {sheet?.type === 'transaction' && (
          <TransactionForm
            transaction={sheet.transaction}
            campaignId={id}
            childId={sheet.childId}
            amountOre={sheet.amountOre}
            defaultKind={sheet.kind}
            onDone={() => setSheet(null)}
          />
        )}
      </BottomSheet>
    </div>
  )
}
