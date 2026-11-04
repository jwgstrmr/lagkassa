import type { Transaction } from '@/types/database'
import { totals } from './finance'

export type LedgerEntry =
  | { type: 'transaction'; transaction: Transaction }
  | {
      type: 'campaign'
      campaignId: string
      /** Senaste transaktionens datum – avgör var raden hamnar */
      date: string
      count: number
      income: number
      expense: number
      net: number
    }

/**
 * Händelsernas transaktioner slås ihop till en rad per händelse, övriga visas en och en.
 * Detaljerna per transaktion finns på händelsens sida. Förutsätter senaste först.
 */
export function collapseCampaigns(transactions: Transaction[]): LedgerEntry[] {
  const byCampaign = new Map<string, Transaction[]>()
  for (const t of transactions) {
    if (t.campaign_id) byCampaign.set(t.campaign_id, [...(byCampaign.get(t.campaign_id) ?? []), t])
  }

  const entries: LedgerEntry[] = []
  const added = new Set<string>()
  for (const t of transactions) {
    if (!t.campaign_id) {
      entries.push({ type: 'transaction', transaction: t })
    } else if (!added.has(t.campaign_id)) {
      added.add(t.campaign_id)
      const list = byCampaign.get(t.campaign_id)!
      entries.push({ type: 'campaign', campaignId: t.campaign_id, date: t.date, count: list.length, ...totals(list) })
    }
  }
  return entries
}

export function entryDate(e: LedgerEntry): string {
  return e.type === 'campaign' ? e.date : e.transaction.date
}

export function entryNet(e: LedgerEntry): number {
  if (e.type === 'campaign') return e.net
  return e.transaction.kind === 'income' ? e.transaction.amount_ore : -e.transaction.amount_ore
}
