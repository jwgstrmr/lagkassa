import { Link } from 'react-router-dom'
import { ChevronRight, CalendarDays } from 'lucide-react'
import { pluralize } from '@/lib/utils'
import { shortDate } from '@/lib/date'
import { SignedAmount } from './TransactionRow'
import type { Campaign } from '@/types/database'

interface Props {
  campaign?: Campaign
  campaignId: string
  date: string
  count: number
  net: number
}

/** En händelse samlade transaktioner som en rad – detaljerna finns på händelsens sida */
export function CampaignLedgerRow({ campaign, campaignId, date, count, net }: Props) {
  return (
    <Link to={`/handelser/${campaignId}`} className="flex items-center gap-3 w-full px-4 py-3 active:bg-[#1A1A1A]">
      <CalendarDays size={14} className="text-[#A0A0A0] shrink-0 -mx-0.5" />
      <span className="flex-1 min-w-0">
        <span className="block text-white text-sm font-medium truncate">{campaign?.name ?? 'Händelse'}</span>
        <span className="block text-[#8A8A8A] text-xs truncate">
          {shortDate(date)} · {pluralize(count, 'post', 'poster')}
        </span>
      </span>
      <SignedAmount kind={net >= 0 ? 'income' : 'expense'} ore={Math.abs(net)} className="text-sm" />
      <ChevronRight size={16} className="text-[#8A8A8A] shrink-0 -mr-1" />
    </Link>
  )
}
