import { useState } from 'react'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import { formatSek, oreToInput, parseSek } from '@/lib/money'
import { useUIStore } from '@/store/uiStore'
import { useCampaigns } from '@/features/campaigns/hooks/useCampaigns'
import { useChildren } from '@/features/children/hooks/useChildren'
import {
  useAddTransactions,
  useCategories,
  useDeleteTransaction,
  useSaveTransaction,
} from '../hooks/useTransactions'
import type { Transaction, TransactionKind } from '@/types/database'

interface Props {
  transaction?: Transaction
  /** Förvald händelse, t.ex. när man bokför från en händelse */
  campaignId?: string
  /** Förvalt barn, t.ex. när man bokför ett barns inbetalning */
  childId?: string
  /** Förifyllt belopp, t.ex. det barnet har kvar att betala */
  amountOre?: number
  defaultKind?: TransactionKind
  onDone: () => void
}

export function TransactionForm({ transaction, campaignId, childId: presetChild, amountOre, defaultKind, onDone }: Props) {
  const { data: categories = [] } = useCategories()
  const { data: campaigns = [] } = useCampaigns()
  const { data: children = [] } = useChildren()
  const save = useSaveTransaction()
  const add = useAddTransactions()
  const remove = useDeleteTransaction()
  const openConfirm = useUIStore((s) => s.openConfirm)

  const [kind, setKind] = useState<TransactionKind>(
    transaction?.kind ?? defaultKind ?? (campaignId ? 'income' : 'expense'),
  )
  const [amount, setAmount] = useState(
    transaction ? oreToInput(transaction.amount_ore) : amountOre ? oreToInput(amountOre) : '',
  )
  const [date, setDate] = useState(transaction?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [categoryId, setCategoryId] = useState<string | null>(transaction?.category_id ?? null)
  const [selectedCampaign, setSelectedCampaign] = useState(transaction?.campaign_id ?? campaignId ?? '')
  const [childIds, setChildIds] = useState<string[]>(
    transaction?.child_id ? [transaction.child_id] : presetChild ? [presetChild] : [],
  )
  const [error, setError] = useState<string | null>(null)

  // Bara intäkter och utgifter i en händelse kan gälla ett barn
  const canHaveChild = !!selectedCampaign
  const selected = canHaveChild ? childIds : []
  // En sparad transaktion gäller ett barn – nya kan läggas på flera med samma belopp
  const multi = !transaction
  const ore = parseSek(amount)

  function toggleChild(id: string) {
    const next = childIds.includes(id)
      ? childIds.filter((c) => c !== id)
      : multi ? [...childIds, id] : [id]
    setChildIds(next)
  }

  function toggleAll() {
    const all = childIds.length === children.length
    setChildIds(all ? [] : children.map((c) => c.id))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ore) return setError('Ange ett belopp')
    setError(null)
    const fields = {
      kind,
      amount_ore: ore,
      date,
      // I en händelse ärvs kategorin från händelsen
      category_id: selectedCampaign ? null : categoryId,
      campaign_id: selectedCampaign || null,
    }
    if (selected.length > 1) {
      add.mutate(selected.map((child_id) => ({ ...fields, child_id })), { onSuccess: onDone })
    } else {
      save.mutate({ ...fields, id: transaction?.id, child_id: selected[0] ?? null }, { onSuccess: onDone })
    }
  }

  function confirmDelete() {
    if (!transaction) return
    openConfirm('Ta bort transaktion', 'Transaktionen tas bort från kassan.', () =>
      remove.mutate(transaction.id, { onSuccess: onDone }),
    )
  }

  return (
    <form onSubmit={submit} className="px-4 pb-6 space-y-4">
      <div className="grid grid-cols-2 gap-2 p-1 bg-[#161616] rounded-xl border border-[#222222]">
        {(['expense', 'income'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              'h-10 rounded-lg text-sm font-semibold transition-colors',
              kind === k ? 'bg-[#FFD700] text-[#0A0A0A]' : 'text-[#A0A0A0]',
            )}
          >
            {k === 'expense' ? (selectedCampaign ? 'Kostnad' : 'Utgift') : 'Intäkt'}
          </button>
        ))}
      </div>

      <Input
        label={selected.length > 1 ? 'Belopp per barn (kr)' : 'Belopp (kr)'}
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0"
        autoFocus={!transaction}
      />
      <Input label="Datum" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      {!selectedCampaign && categories.length > 0 && (
        <div className="space-y-1.5">
          <span className="block text-[#A0A0A0] text-sm font-medium">Kategori</span>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Chip
                key={c.id}
                active={categoryId === c.id}
                color={c.color}
                onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
              >
                {c.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {campaigns.length > 0 && (
        <Select
          label="Händelse"
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
        >
          <option value="">Ingen</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      )}

      {canHaveChild && children.length > 0 && (
        <div className="space-y-1.5">
          <span className="block text-[#A0A0A0] text-sm font-medium">Barn</span>
          <div className="flex flex-wrap gap-2">
            {multi && children.length > 1 && (
              <Chip active={childIds.length === children.length} onClick={toggleAll}>
                Alla
              </Chip>
            )}
            {children.map((c) => (
              <Chip key={c.id} active={childIds.includes(c.id)} onClick={() => toggleChild(c.id)}>
                {c.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-[#EF4444] text-sm">{error}</p>}

      <div className="flex gap-2 pt-2">
        {transaction && (
          <Button type="button" variant="danger" onClick={confirmDelete} aria-label="Ta bort">
            <Trash2 size={18} />
          </Button>
        )}
        <Button type="submit" className="flex-1" loading={save.isPending || add.isPending}>
          {selected.length > 1 && ore
            ? `Spara ${selected.length} × ${formatSek(ore)} = ${formatSek(selected.length * ore)}`
            : 'Spara'}
        </Button>
      </div>
    </form>
  )
}
