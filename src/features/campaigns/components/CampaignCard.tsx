import { Link } from 'react-router-dom'
import { Briefcase, CalendarDays, Check, ChevronRight, ShoppingBag, Ticket, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { formatSek } from '@/lib/money'
import { useMyChildren } from '@/features/children/hooks/useChildren'
import { useTransactions } from '@/features/transactions/hooks/useTransactions'
import { useCampaignParticipants } from '../hooks/useCampaigns'
import { due, dueStatus, owes, paidIn, type Due } from '../lib/sales'
import { campaignTypeLabel, shortRange } from '../lib/format'
import type { Campaign, CampaignType } from '@/types/database'

const TYPE_ICONS: Record<CampaignType, LucideIcon> = { sale: ShoppingBag, fee: Ticket, job: Briefcase, other: CalendarDays }

/** Kort status till etiketten – "300 kr kvar", "Betalt 400 kr", "Ej registrerat", "Jobbar" */
function statusLabel(d: Due): string {
  if (d.campaign.type === 'job') return dueStatus(d)
  if (!d.done) return d.expected ? `${formatSek(d.remaining)} kvar` : 'Ej registrerat'
  return `${d.campaign.type === 'fee' ? 'Betalt' : 'Inbetalt'} ${formatSek(d.paid)}`
}

/**
 * En händelse i en lista – med de egna barnens betalstatus. Likadan för alla, ekonomiansvarig
 * följer upp hela laget under Admin
 */
export function CampaignCard({ campaign: c }: { campaign: Campaign }) {
  const { data: transactions = [] } = useTransactions()
  const { data: participants = [] } = useCampaignParticipants()
  const { data: myChildren } = useMyChildren()

  const Icon = TYPE_ICONS[c.type]
  const meta = [campaignTypeLabel(c.type), shortRange(c)].filter(Boolean).join(' · ')

  // De egna barnens status – det föräldern vill kontrollera. Grått när föräldern inte har något att göra
  const mine = myChildren.flatMap((child) => {
    const d = due(c, child.id, participants, transactions)
    if (d) return [{ child, text: statusLabel(d), done: d.done, owes: owes(d) }]
    const paid = paidIn(transactions, child.id, c.id)
    const text = `${c.type === 'job' ? 'Ersättning' : 'Inbetalt'} ${formatSek(paid)}`
    return paid ? [{ child, text, done: true, owes: false }] : []
  })

  return (
    <Link to={`/handelser/${c.id}`} className="block">
      <Card padding={false} className="overflow-hidden active:bg-[#1A1A1A]">
        <div className="flex items-center gap-3 p-4">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#FFD700]/15 text-[#FFD700]">
            <Icon size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate">{c.name}</p>
            <p className="text-[#8A8A8A] text-xs mt-0.5 truncate">{meta}</p>
          </div>
          <ChevronRight size={16} className="text-[#8A8A8A] shrink-0" />
        </div>

        {mine.length > 0 && (
          <div className="border-t border-[#222222] divide-y divide-[#222222]">
            {mine.map((m) => (
              <div key={m.child.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-white text-sm truncate">{m.child.name}</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums whitespace-nowrap',
                    m.done
                      ? 'bg-[#22C55E]/15 text-[#22C55E]'
                      : m.owes
                        ? 'bg-[#FFD700]/15 text-[#FFD700]'
                        : 'bg-[#222222] text-[#A0A0A0]',
                  )}
                >
                  {m.done && <Check size={12} strokeWidth={3} />}
                  {m.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Link>
  )
}
