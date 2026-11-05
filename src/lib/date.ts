import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'

/** "4 nov." – med årtal när det inte är i år: "4 nov. 2025" */
export function shortDate(iso: string): string {
  const d = parseISO(iso)
  return format(d, d.getFullYear() === new Date().getFullYear() ? 'd MMM' : 'd MMM yyyy', { locale: sv })
}
