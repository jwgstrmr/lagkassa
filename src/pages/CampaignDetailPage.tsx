import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Pencil, Plus, CalendarDays, Users } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { cn, pluralize } from '@/lib/utils'
import { formatSek } from '@/lib/money'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useChildren } from '@/features/children/hooks/useChildren'
import { useCampaignParticipants, useCampaigns, useSwitchToCampaignTeam } from '@/features/campaigns/hooks/useCampaigns'
import { useTransactions } from '@/features/transactions/hooks/useTransactions'
import { totals } from '@/features/transactions/lib/finance'
import { due, dueStatus, earned, owes, paidIn } from '@/features/campaigns/lib/sales'
import { campaignTypeLabel, dateRange } from '@/features/campaigns/lib/format'
import { CampaignForm } from '@/features/campaigns/components/CampaignForm'
import { BulkIncomeForm } from '@/features/campaigns/components/BulkIncomeForm'
import { SignedAmount, TransactionRow } from '@/features/transactions/components/TransactionRow'
import { SwishButton } from '@/features/campaigns/components/SwishButton'
import { TransactionForm } from '@/features/transactions/components/TransactionForm'
import { KIND_TEXT } from '@/features/transactions/lib/colors'
import type { Transaction, TransactionKind } from '@/types/database'

type Sheet =
  | { type: 'campaign' }
  | { type: 'bulk' }
  | { type: 'transaction'; transaction?: Transaction; kind?: TransactionKind; childId?: string; amountOre?: number }

function Stat({ label, value, kind }: { label: string; value: string; kind?: TransactionKind }) {
  return (
    <div>
      <p className="text-[#8A8A8A] text-xs">{label}</p>
      <p className={cn('font-semibold tabular-nums', kind ? KIND_TEXT[kind] : 'text-white')}>{value}</p>
    </div>
  )
}

function SumRow({ title, detail, kind, ore }: { title: string; detail: string; kind: TransactionKind; ore: number }) {
  return (
    <div className="flex items-center gap-3 w-full px-4 py-3">
      <span className="flex-1 min-w-0">
        <span className="block text-white text-sm font-medium truncate">{title}</span>
        <span className="block text-[#8A8A8A] text-xs">{detail}</span>
      </span>
      <SignedAmount kind={kind} ore={ore} className="text-sm" />
    </div>
  )
}

/**
 * Vad pengarna i händelsen kom från och gick till, för föräldrarna. Kostnader och intäkter som inte
 * gäller något barn visas var för sig – barnens inbetalningar och återbetalningar bara som summor
 */
function ParentLedger({ linked }: { linked: Transaction[] }) {
  const fromChildren = linked.filter((t) => t.child_id && t.kind === 'income')
  const toChildren = linked.filter((t) => t.child_id && t.kind === 'expense')
  const other = linked.filter((t) => !t.child_id)
  const sum = (list: Transaction[]) => list.reduce((s, t) => s + t.amount_ore, 0)
  const kids = (list: Transaction[]) => pluralize(new Set(list.map((t) => t.child_id)).size, 'barn', 'barn')

  return (
    <Card padding={false} className="overflow-hidden">
      <h2 className="text-white font-semibold px-4 pt-4 pb-2">Intäkter och kostnader</h2>
      <div className="divide-y divide-[#222222]">
        {fromChildren.length > 0 && (
          <SumRow title="Inbetalningar från barnen" detail={kids(fromChildren)} kind="income" ore={sum(fromChildren)} />
        )}
        {other.map((t) => (
          <TransactionRow key={t.id} transaction={t} />
        ))}
        {toChildren.length > 0 && (
          <SumRow title="Återbetalningar" detail={kids(toChildren)} kind="expense" ore={sum(toChildren)} />
        )}
      </div>
    </Card>
  )
}

export function CampaignDetailPage() {
  const { id = '' } = useParams()
  const { isAdmin } = useActiveTeam()
  const { data: campaigns, isLoading } = useCampaigns()
  const { data: children = [] } = useChildren()
  const { data: transactions = [] } = useTransactions()
  const { data: participants = [] } = useCampaignParticipants()
  const [sheet, setSheet] = useState<Sheet | null>(null)

  const campaign = campaigns?.find((c) => c.id === id)
  const switching = useSwitchToCampaignTeam(id, !isLoading && !campaign)
  if (isLoading || switching) return <><TopBar showBack /><ListSkeleton /></>
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
  const subtitle = [campaignTypeLabel(campaign.type), dateRange(campaign)].filter(Boolean).join(' · ')

  // De som ska betala eller jobbar, plus barn som ändå har något bokfört. Övrigt följs inte upp
  // per barn, så där visas bara barn med inbetalningar – annars ser 0 kr ut som en obetald skuld
  const perChild = campaign.type !== 'other'
  const job = campaign.type === 'job'
  const rows = children
    .map((child) => ({ child, due: due(campaign, child.id, participants, transactions) }))
    .filter(({ child, due: d }) => d || linked.some((t) => t.child_id === child.id))

  const sheetTitle =
    sheet?.type === 'campaign'
      ? 'Ändra händelse'
      : sheet?.type === 'bulk'
        ? job ? 'Registrera ersättningar' : 'Registrera inbetalningar'
        : sheet?.transaction
          ? 'Ändra'
          : sheet?.childId ? (job ? 'Ny ersättning' : 'Ny inbetalning') : 'Lägg till'

  return (
    <div>
      <TopBar
        title={campaign.name}
        subtitle={subtitle}
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
          <h2 className="text-white font-semibold mb-3">Totalt för hela laget</h2>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Intäkter" value={formatSek(sum.income)} kind="income" />
            <Stat label="Kostnader" value={formatSek(sum.expense)} kind="expense" />
            <Stat label="Till kassan" value={formatSek(sum.net)} />
          </div>
        </Card>

        {rows.length > 0 && (
          <Card padding={false} className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
              <h2 className="text-white font-semibold">
                {isAdmin ? 'Deltagare' : children.length === 1 ? 'Mitt barn' : 'Mina barn'}
              </h2>
              {isAdmin && (
                <Button size="sm" variant="secondary" onClick={() => setSheet({ type: 'bulk' })}>
                  <Users size={16} className="mr-1" /> {job ? 'Registrera ersättningar' : 'Registrera inbetalningar'}
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
                        <span className="block text-[#8A8A8A] text-xs">
                          {job ? dueStatus(d) : d.expected ? `${formatSek(d.remaining)} kvar` : 'Inget registrerat'}
                        </span>
                      )}
                      {!isAdmin && paid > 0 && (
                        <span className="block text-[#8A8A8A] text-xs">
                          Intjänat till kassan {formatSek(earned(transactions, child.id, id))}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {d ? (
                        <span
                          className={cn(
                            'text-sm tabular-nums whitespace-nowrap',
                            d.done ? 'text-[#22C55E] font-semibold' : d.paid ? 'text-white font-semibold' : 'text-[#8A8A8A]',
                          )}
                        >
                          {formatSek(d.paid)}
                          {d.expected ? (
                            <span className="text-[#8A8A8A] font-normal">
                              {' / '}{campaign.type === 'sale' ? 'minst ' : ''}{formatSek(d.expected)}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className={cn('text-sm tabular-nums', paid ? 'text-white font-semibold' : 'text-[#8A8A8A]')}>
                          {formatSek(paid)}
                        </span>
                      )}
                      {!isAdmin && d && owes(d) && (
                        <SwishButton amountOre={d.remaining || null} message={`${child.name} ${campaign.name}`} />
                      )}
                    </span>
                  </Row>
                )
              })}
            </div>
          </Card>
        )}

        {!isAdmin && linked.length > 0 && <ParentLedger linked={linked} />}

        {isAdmin && (
          <Card padding={false} className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
              <h2 className="text-white font-semibold">Intäkter och kostnader</h2>
              <Button size="sm" variant="secondary" onClick={() => setSheet({ type: 'transaction' })}>
                <Plus size={16} className="mr-1" /> Lägg till
              </Button>
            </div>
            {linked.length === 0 ? (
              <p className="text-[#8A8A8A] text-sm px-4 pb-4">Inget bokfört än</p>
            ) : (
              <div className="divide-y divide-[#222222]">
                {linked.map((t) => (
                  <TransactionRow
                    key={t.id}
                    transaction={t}
                    child={children.find((c) => c.id === t.child_id)}
                    onClick={() => setSheet({ type: 'transaction', transaction: t })}
                  />
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      <BottomSheet isOpen={sheet !== null} onClose={() => setSheet(null)} title={sheetTitle}>
        {sheet?.type === 'campaign' && <CampaignForm campaign={campaign} onDone={() => setSheet(null)} />}
        {sheet?.type === 'bulk' && (
          <BulkIncomeForm
            campaign={campaign}
            children={perChild ? rows.map((r) => r.child) : children}
            onDone={() => setSheet(null)}
          />
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
