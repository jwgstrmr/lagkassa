import type { Campaign, CampaignParticipant, Transaction } from '@/types/database'
import { formatSek } from '@/lib/money'
import { signed, totals } from '@/features/transactions/lib/finance'
import { campaignStatus } from './format'

/**
 * Vad som betalats in för barnet, ev. för en viss händelse. En kostnad kopplad till barnet är en
 * återbetalning (t.ex. en inställd cup) och räknas av.
 */
export function paidIn(transactions: Transaction[], childId: string, campaignId?: string): number {
  return transactions
    .filter((t) => t.child_id === childId && (!campaignId || t.campaign_id === campaignId))
    .reduce((sum, t) => sum + signed(t), 0)
}

/** Vad familjen betalat in – utan ersättningar för jobb, som betalas av den som anlitat laget */
export function paidByFamily(transactions: Transaction[], campaigns: Campaign[], childId: string): number {
  const jobs = new Set(campaigns.filter((c) => c.type === 'job').map((c) => c.id))
  return transactions
    .filter((t) => t.child_id === childId && !(t.campaign_id && jobs.has(t.campaign_id)))
    .reduce((sum, t) => sum + signed(t), 0)
}

/** Återbetalningar till barnen i en händelse – kostnader kopplade till ett barn */
export function refunds(list: Transaction[]): number {
  return list.filter((t) => t.kind === 'expense' && t.child_id).reduce((sum, t) => sum + t.amount_ore, 0)
}

/**
 * Vad barnet tjänat till kassan – barnets del av händelsens netto, fördelat efter vad
 * barnet betalat in efter återbetalningar. Går händelsen back räknas det som 0 för barnet.
 */
export function earned(transactions: Transaction[], childId: string, campaignId?: string): number {
  const campaignIds = new Set(
    transactions
      .filter((t) => t.child_id === childId && t.campaign_id && (!campaignId || t.campaign_id === campaignId))
      .map((t) => t.campaign_id!),
  )
  let sum = 0
  for (const id of campaignIds) {
    const list = transactions.filter((t) => t.campaign_id === id)
    const { income, net } = totals(list)
    const paidInTotal = income - refunds(list)
    const share = paidIn(list, childId)
    if (paidInTotal > 0 && net > 0 && share > 0) sum += (share * net) / paidInTotal
  }
  return Math.round(sum)
}

export interface Due {
  campaign: Campaign
  childId: string
  /** Belopp per barn – avgiften, försäljningens minimum eller jobbets ersättning. Null om inget är angivet */
  expected: number | null
  /** Händelsens intäkter kopplade till barnet, minus återbetalningar */
  paid: number
  remaining: number
  /** Hela beloppet betalt, eller utan fast belopp: något är registrerat */
  done: boolean
}

/** Vad ett barn ska betala in till en händelse och vad som är registrerat */
export function due(
  campaign: Campaign,
  childId: string,
  participants: CampaignParticipant[],
  transactions: Transaction[],
): Due | null {
  if (!participants.some((p) => p.campaign_id === campaign.id && p.child_id === childId)) return null
  const expected = campaign.amount_per_child_ore
  const paid = paidIn(transactions, childId, campaign.id)
  const remaining = expected ? Math.max(0, expected - paid) : 0
  return { campaign, childId, expected, paid, remaining, done: expected ? !remaining : paid > 0 }
}

/** Föräldrarna har något kvar att betala – ett jobb betalas av någon annan */
export function owes(d: Due): boolean {
  return !d.done && d.campaign.type !== 'job'
}

/** "200 kr kvar av 400 kr", "Betalt 400 kr", "300 kr kvar till minst 500 kr", "Inget registrerat än" … */
export function dueStatus(d: Due): string {
  if (d.campaign.type === 'job') {
    if (d.done) return `Ersättning ${formatSek(d.paid)}`
    const status = campaignStatus(d.campaign)
    return status === 'upcoming' ? 'Ska jobba' : status === 'ongoing' ? 'Jobbar' : 'Väntar på ersättning'
  }
  // Försäljningens minimum får överskridas – visa vad som faktiskt är inbetalt
  if (d.expected && d.campaign.type === 'sale') {
    return d.done ? `Inbetalt ${formatSek(d.paid)}` : `${formatSek(d.remaining)} kvar till minst ${formatSek(d.expected)}`
  }
  if (d.expected) {
    return d.done ? `Betalt ${formatSek(d.expected)}` : `${formatSek(d.remaining)} kvar av ${formatSek(d.expected)}`
  }
  return d.done ? 'Inbetalning registrerad' : 'Inget registrerat än'
}
