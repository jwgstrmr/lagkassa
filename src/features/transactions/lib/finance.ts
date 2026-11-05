import type { Campaign, Child, Team, Transaction } from '@/types/database'

export function signed(t: Pick<Transaction, 'kind' | 'amount_ore'>): number {
  return t.kind === 'income' ? t.amount_ore : -t.amount_ore
}

/** Postens namn, annars barnet eller typen */
export function transactionTitle(t: Transaction, child?: Child): string {
  return t.description || child?.name || (t.kind === 'income' ? 'Intäkt' : t.campaign_id ? 'Kostnad' : 'Utgift')
}

export function balance(team: Team, transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + signed(t), team.opening_balance_ore)
}

export function totals(transactions: Transaction[]) {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (t.kind === 'income') income += t.amount_ore
    else expense += t.amount_ore
  }
  return { income, expense, net: income - expense }
}

/**
 * För kassans statistik: en händelses kostnader räknas av mot dess intäkter, så varje
 * händelse blir en post med sitt netto – intäkt om den gått plus, utgift om den gått back.
 * Utgifter är då bara fristående utgifter och händelser som kostat kassan pengar.
 */
export function netCampaigns(transactions: Transaction[]): Transaction[] {
  const result: Transaction[] = []
  const byCampaign = new Map<string, Transaction[]>()
  for (const t of transactions) {
    if (t.campaign_id) byCampaign.set(t.campaign_id, [...(byCampaign.get(t.campaign_id) ?? []), t])
    else result.push(t)
  }
  for (const list of byCampaign.values()) {
    const net = list.reduce((sum, t) => sum + signed(t), 0)
    if (!net) continue
    result.push({ ...list[0], kind: net > 0 ? 'income' : 'expense', amount_ore: Math.abs(net), child_id: null })
  }
  return result
}

export function inYear(transactions: Transaction[], year: number): Transaction[] {
  const prefix = `${year}-`
  return transactions.filter((t) => t.date.startsWith(prefix))
}

export function years(transactions: Transaction[]): number[] {
  const set = new Set(transactions.map((t) => Number(t.date.slice(0, 4))))
  set.add(new Date().getFullYear())
  return [...set].sort((a, b) => b - a)
}

/** Saldot efter varje dag med rörelser, äldst först */
export function balanceSeries(team: Team, transactions: Transaction[]) {
  const byDate = new Map<string, number>()
  for (const t of transactions) byDate.set(t.date, (byDate.get(t.date) ?? 0) + signed(t))
  const dates = [...byDate.keys()].sort()
  let running = team.opening_balance_ore
  const points = dates.map((date) => {
    running += byDate.get(date)!
    return { date, balance: running }
  })
  const start = team.opening_date ?? dates[0]
  if (start && (!dates.length || start < dates[0])) {
    points.unshift({ date: start, balance: team.opening_balance_ore })
  }
  return points
}

export interface Share {
  id: string
  name: string
  amount: number
}

/**
 * Summa per händelse för en typ, störst först. Fristående poster grupperas efter
 * sin beskrivning – utan beskrivning hamnar de i Övrigt.
 */
export function byGroup(
  transactions: Transaction[],
  campaigns: Campaign[],
  kind: Transaction['kind'],
): Share[] {
  const groups = new Map<string, { name: string; amount: number }>()
  for (const t of transactions) {
    if (t.kind !== kind) continue
    const description = t.description?.trim()
    const [key, name] = t.campaign_id
      ? [t.campaign_id, campaigns.find((c) => c.id === t.campaign_id)?.name ?? 'Händelse']
      : description
        ? [`text:${description.toLowerCase()}`, description]
        : ['', 'Övrigt']
    const group = groups.get(key) ?? { name, amount: 0 }
    group.amount += t.amount_ore
    groups.set(key, group)
  }
  return [...groups.entries()]
    .map(([id, g]) => ({ id, ...g }))
    .sort((a, b) => b.amount - a.amount)
}
