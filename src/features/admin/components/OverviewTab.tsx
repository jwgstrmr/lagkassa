import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, CircleCheck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { formatSek } from '@/lib/money'
import { cn, pluralize } from '@/lib/utils'
import { useTeamStore } from '@/store/teamStore'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useChildren } from '@/features/children/hooks/useChildren'
import { useTransactions } from '@/features/transactions/hooks/useTransactions'
import { useCampaignParticipants, useCampaigns, useOpenDues, type OpenDue } from '@/features/campaigns/hooks/useCampaigns'
import { due, owes, type Due } from '@/features/campaigns/lib/sales'
import { campaignStatus, campaignTypeLabel, shortRange } from '@/features/campaigns/lib/format'
import type { Campaign } from '@/types/database'

interface EventProgress {
  campaign: Campaign
  dues: Due[]
  open: Due[]
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[#A0A0A0] text-xs font-semibold uppercase tracking-wider px-1 mb-2">{title}</h2>
      <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
        {children}
      </Card>
    </section>
  )
}

function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <span className="flex items-center gap-3 mt-2">
      <span className="flex-1 h-1.5 rounded-full bg-[#222222] overflow-hidden">
        <span className="block h-full rounded-full bg-[#22C55E]" style={{ width: `${(done / total) * 100}%` }} />
      </span>
      <span className="text-[#A0A0A0] text-xs tabular-nums shrink-0">
        {done}/{total} {label}
      </span>
    </span>
  )
}

/** Namnen på de som inte betalat klart – de tre första och hur många fler */
function names(list: string[]): string {
  return list.slice(0, 3).join(', ') + (list.length > 3 ? ` +${list.length - 3}` : '')
}

/**
 * En händelse – hur många som är klara och vad som är kvar. Gult och "saknas" när händelsen är
 * slut och pengarna borde ha kommit in, annars är det bara läget
 */
function EventRow({ progress: { campaign: c, dues, open }, detail, overdue }: {
  progress: EventProgress
  detail: string | null
  overdue?: boolean
}) {
  // Ett jobbs ersättning betalas av den som anlitat laget – den saknas först när jobbet är slut
  const remaining = open.filter((d) => overdue || owes(d)).reduce((sum, d) => sum + d.remaining, 0)
  return (
    <Link to={`/handelser/${c.id}`} className="block px-4 py-3 active:bg-[#1A1A1A]">
      <span className="flex items-center gap-3">
        <span className="flex-1 min-w-0">
          <span className="block text-white text-sm font-medium truncate">{c.name}</span>
          {detail && <span className="block text-[#A0A0A0] text-xs truncate">{detail}</span>}
          {!c.end_date && <span className="block text-[#F97316] text-xs">Saknar till-datum – avslutas aldrig</span>}
        </span>
        {remaining > 0 && (
          <span className="text-right shrink-0">
            <span className={cn('block text-sm font-semibold tabular-nums', overdue ? 'text-[#FFD700]' : 'text-white')}>
              {formatSek(remaining)}
            </span>
            <span className="block text-[#A0A0A0] text-xs">{overdue ? 'saknas' : 'kvar'}</span>
          </span>
        )}
        <ChevronRight size={16} className="text-[#8A8A8A] shrink-0" />
      </span>
      {dues.length > 0 && (
        <ProgressBar
          done={dues.length - open.length}
          total={dues.length}
          label={c.type === 'job' ? 'utbetalt' : 'betalt'}
        />
      )}
    </Link>
  )
}

/** Avslutade händelser med saknade inbetalningar i de andra lagen man är ekonomiansvarig för – trycket byter lag */
function OtherTeams({ dues }: { dues: OpenDue[] }) {
  const setActiveTeam = useTeamStore((s) => s.setActiveTeam)
  const byTeam = new Map<string, OpenDue[]>()
  for (const d of dues) byTeam.set(d.team_id, [...(byTeam.get(d.team_id) ?? []), d])

  return (
    <Section title="Andra lag">
      {[...byTeam.values()].map((list) => {
        const events = new Set(list.map((d) => d.campaign_id)).size
        const remaining = list.reduce(
          (sum, d) => sum + (d.expected_ore ? Math.max(0, d.expected_ore - d.paid_ore) : 0),
          0,
        )
        return (
          <button
            key={list[0].team_id}
            onClick={() => {
              setActiveTeam(list[0].team_id)
              // Sidorna rullar i main, inte i fönstret
              document.querySelector('main')?.scrollTo(0, 0)
            }}
            className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-[#1A1A1A]"
          >
            <span className="flex-1 min-w-0">
              <span className="block text-white text-sm font-medium truncate">{list[0].team_name}</span>
              <span className="block text-[#A0A0A0] text-xs truncate">
                {pluralize(events, 'händelse', 'händelser')} · {pluralize(list.length, 'barn', 'barn')}
              </span>
            </span>
            {remaining > 0 && (
              <span className="text-right shrink-0">
                <span className="block text-[#FFD700] text-sm font-semibold tabular-nums">{formatSek(remaining)}</span>
                <span className="block text-[#A0A0A0] text-xs">saknas</span>
              </span>
            )}
            <ChevronRight size={16} className="text-[#8A8A8A] shrink-0" />
          </button>
        )
      })}
    </Section>
  )
}

/**
 * Ekonomiansvarigs uppföljning i det aktiva laget: avslutade händelser där barn inte betalat klart
 * eller ett jobbs ersättning inte kommit, och hur de pågående går. Övrigt följs inte upp per barn och visas inte.
 */
export function OverviewTab() {
  const { teamId } = useActiveTeam()
  const { data: campaigns, isLoading } = useCampaigns()
  const { data: participants = [] } = useCampaignParticipants()
  const { data: transactions = [] } = useTransactions()
  const { data: children = [] } = useChildren()
  const { data: openDues = [] } = useOpenDues()

  if (isLoading || !campaigns) return <div className="p-4"><ListSkeleton rows={4} /></div>

  const progress = (campaign: Campaign): EventProgress => {
    const dues = participants
      // Barn som tagits bort ur laget räknas inte
      .filter((p) => p.campaign_id === campaign.id && children.some((ch) => ch.id === p.child_id))
      .flatMap((p) => due(campaign, p.child_id, participants, transactions) ?? [])
    return { campaign, dues, open: dues.filter((d) => !d.done) }
  }

  // Det som slutar eller slutade först överst – utan till-datum sist
  const byEndDate = (a: EventProgress, b: EventProgress) =>
    (a.campaign.end_date ?? '9999').localeCompare(b.campaign.end_date ?? '9999')
  const tracked = campaigns.filter((c) => c.type !== 'other').map(progress)
  const ended = tracked
    .filter((p) => p.open.length > 0 && campaignStatus(p.campaign) === 'ended')
    .sort(byEndDate)
  const ongoing = tracked.filter((p) => campaignStatus(p.campaign) === 'ongoing').sort(byEndDate)
  const otherTeams = openDues.filter((d) => d.team_id !== teamId)

  if (!ended.length && !ongoing.length && !otherTeams.length) {
    return <EmptyState icon={CircleCheck} title="Inget att följa upp" />
  }

  return (
    <div className="p-4 space-y-4">
      {ended.length > 0 && (
        <Section title="Avslutade">
          {ended.map((p) => (
            <EventRow
              key={p.campaign.id}
              progress={p}
              detail={
                // Ersättningen för ett jobb kommer från den som anlitat laget, inte från barnen
                p.campaign.type === 'job'
                  ? 'Väntar på ersättning'
                  : names(p.open.map((d) => children.find((ch) => ch.id === d.childId)?.name ?? ''))
              }
              overdue
            />
          ))}
        </Section>
      )}

      {ongoing.length > 0 && (
        <Section title="Pågående">
          {ongoing.map((p) => (
            <EventRow
              key={p.campaign.id}
              progress={p}
              detail={[campaignTypeLabel(p.campaign.type), shortRange(p.campaign)].filter(Boolean).join(' · ')}
            />
          ))}
        </Section>
      )}

      {otherTeams.length > 0 && <OtherTeams dues={otherTeams} />}
    </div>
  )
}
