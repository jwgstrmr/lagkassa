import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import type { Campaign, CampaignType } from '@/types/database'

export const CAMPAIGN_TYPES: { value: CampaignType; label: string }[] = [
  { value: 'sale', label: 'Försäljning' },
  { value: 'job', label: 'Jobb' },
  { value: 'fee', label: 'Avgift' },
  { value: 'other', label: 'Övrigt' },
]

export function campaignTypeLabel(type: CampaignType): string {
  return CAMPAIGN_TYPES.find((t) => t.value === type)!.label
}

export type CampaignStatus = 'upcoming' | 'ongoing' | 'ended'

/** Utifrån datumen – utan startdatum har händelsen börjat, utan slutdatum pågår den */
export function campaignStatus(c: Pick<Campaign, 'start_date' | 'end_date'>): CampaignStatus {
  const today = format(new Date(), 'yyyy-MM-dd')
  if (c.end_date && c.end_date < today) return 'ended'
  if (c.start_date && c.start_date > today) return 'upcoming'
  return 'ongoing'
}

/** Kort form till listor – "1–30 nov", "28 nov – 5 dec", årtal bara när det inte är i år */
export function shortRange(c: Pick<Campaign, 'start_date' | 'end_date'>): string | null {
  const thisYear = new Date().getFullYear()
  const day = (d: Date) => format(d, 'd', { locale: sv })
  const dayMonth = (d: Date) => format(d, 'd MMM', { locale: sv })
  const full = (d: Date) => (d.getFullYear() === thisYear ? dayMonth(d) : format(d, 'd MMM yyyy', { locale: sv }))
  const start = c.start_date ? parseISO(c.start_date) : null
  const end = c.end_date ? parseISO(c.end_date) : null
  if (start && end) {
    const sameYear = start.getFullYear() === end.getFullYear()
    if (sameYear && start.getMonth() === end.getMonth()) return `${day(start)}–${full(end)}`
    return `${sameYear ? dayMonth(start) : full(start)} – ${full(end)}`
  }
  if (start) return `Från ${full(start)}`
  if (end) return `Till ${full(end)}`
  return null
}

export function dateRange(c: Pick<Campaign, 'start_date' | 'end_date'>): string | null {
  const f = (d: string) => format(parseISO(d), 'd MMM yyyy', { locale: sv })
  if (c.start_date && c.end_date) return `${f(c.start_date)} – ${f(c.end_date)}`
  if (c.start_date) return `Från ${f(c.start_date)}`
  if (c.end_date) return `Till ${f(c.end_date)}`
  return null
}
