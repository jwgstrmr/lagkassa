import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import type { Campaign } from '@/types/database'

/** Slutdatumet har passerat – utan slutdatum pågår händelsen */
export function isEnded(c: Pick<Campaign, 'end_date'>): boolean {
  return !!c.end_date && c.end_date < format(new Date(), 'yyyy-MM-dd')
}

export function dateRange(c: Pick<Campaign, 'start_date' | 'end_date'>): string | null {
  const f = (d: string) => format(parseISO(d), 'd MMM yyyy', { locale: sv })
  if (c.start_date && c.end_date) return `${f(c.start_date)} – ${f(c.end_date)}`
  if (c.start_date) return `Från ${f(c.start_date)}`
  if (c.end_date) return `Till ${f(c.end_date)}`
  return null
}
