import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatSek, parseSek } from '@/lib/money'
import { useAddTransactions } from '@/features/transactions/hooks/useTransactions'
import type { Campaign, Child } from '@/types/database'

interface Props {
  campaign: Campaign
  children: Child[]
  onDone: () => void
}

/** Alla barns inbetalningar på en gång – en intäkt per barn med belopp */
export function BulkIncomeForm({ campaign, children, onDone }: Props) {
  const add = useAddTransactions()
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const filled = children
    .map((child) => ({ child, text: amounts[child.id]?.trim() ?? '' }))
    .filter((x) => x.text)
  const parsed = filled.map((x) => ({ ...x, ore: parseSek(x.text) }))
  const invalid = parsed.filter((x) => !x.ore)
  const total = parsed.reduce((sum, x) => sum + (x.ore ?? 0), 0)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!parsed.length) return setError('Fyll i minst ett belopp')
    if (invalid.length) return setError(`Beloppet för ${invalid.map((x) => x.child.name).join(', ')} är inte ett belopp`)
    setError(null)
    add.mutate(
      parsed.map(({ child, ore }) => ({
        kind: 'income',
        amount_ore: ore!,
        date,
        category_id: null,
        campaign_id: campaign.id,
        child_id: child.id,
      })),
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={submit} className="px-4 pb-6 space-y-4">
      <Input label="Datum" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      <div className="space-y-1.5">
        <span className="block text-[#A0A0A0] text-sm font-medium">Belopp (kr)</span>
        <div className="bg-[#161616] rounded-xl border border-[#222222] divide-y divide-[#222222]">
          {children.map((child) => (
            <label key={child.id} className="flex items-center gap-3 px-4 py-2">
              <span className="flex-1 min-w-0 text-white text-sm truncate">{child.name}</span>
              <input
                inputMode="decimal"
                value={amounts[child.id] ?? ''}
                onChange={(e) => setAmounts((a) => ({ ...a, [child.id]: e.target.value }))}
                placeholder="0"
                className="w-28 h-10 bg-[#0F0F0F] border border-[#333333] rounded-lg px-3 text-right text-white tabular-nums focus:outline-none focus:border-[#FFD700]"
              />
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-[#EF4444] text-sm">{error}</p>}

      <Button type="submit" className="w-full" loading={add.isPending} disabled={!parsed.length}>
        {parsed.length
          ? `Spara ${parsed.length === 1 ? '1 inbetalning' : `${parsed.length} inbetalningar`} · ${formatSek(total)}`
          : 'Spara'}
      </Button>
    </form>
  )
}
