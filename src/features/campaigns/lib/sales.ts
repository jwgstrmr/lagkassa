import type { Campaign, CampaignParticipant, Transaction } from '@/types/database'
import { formatSek } from '@/lib/money'
import { totals } from '@/features/transactions/lib/finance'

/** Vad som betalats in för barnet – händelsernas intäkter kopplade till barnet, ev. för en viss händelse */
export function paidIn(transactions: Transaction[], childId: string, campaignId?: string): number {
  return transactions
    .filter((t) => t.kind === 'income' && t.child_id === childId && (!campaignId || t.campaign_id === campaignId))
    .reduce((sum, t) => sum + t.amount_ore, 0)
}

/**
 * Vad barnet tjänat till kassan – barnets del av händelsens netto, fördelat efter vad
 * barnet betalat in. Går händelsen back räknas det som 0 för barnet.
 */
export function earned(transactions: Transaction[], childId: string, campaignId?: string): number {
  const campaignIds = new Set(
    transactions
      .filter((t) => t.child_id === childId && t.campaign_id && (!campaignId || t.campaign_id === campaignId))
      .map((t) => t.campaign_id!),
  )
  let sum = 0
  for (const id of campaignIds) {
    const { income, net } = totals(transactions.filter((t) => t.campaign_id === id))
    if (income > 0 && net > 0) sum += (paidIn(transactions, childId, id) * net) / income
  }
  return Math.round(sum)
}

export interface Due {
  campaign: Campaign
  childId: string
  /** Fast belopp per barn – null när barnet betalar in t.ex. det det sålt för */
  expected: number | null
  /** Händelsens intäkter kopplade till barnet */
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

/** "200 kr kvar av 400 kr", "Betalt 400 kr", "Inget registrerat än" … */
export function dueStatus(d: Due): string {
  if (d.expected) {
    return d.done ? `Betalt ${formatSek(d.expected)}` : `${formatSek(d.remaining)} kvar av ${formatSek(d.expected)}`
  }
  return d.done ? 'Inbetalning registrerad' : 'Inget registrerat än'
}

/** Händelser där barnet ska betala in men inte är klart */
export function openDues(
  campaigns: Campaign[],
  childId: string,
  participants: CampaignParticipant[],
  transactions: Transaction[],
): Due[] {
  return campaigns.flatMap((c) => {
    const d = due(c, childId, participants, transactions)
    return d && !d.done ? [d] : []
  })
}
