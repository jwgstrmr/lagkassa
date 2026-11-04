import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { formatSek, oreToInput, parseSek } from '@/lib/money'
import { useUIStore } from '@/store/uiStore'
import { useCategories } from '@/features/transactions/hooks/useTransactions'
import { useChildren } from '@/features/children/hooks/useChildren'
import { useCampaignParticipants, useDeleteCampaign, useSaveCampaign } from '../hooks/useCampaigns'
import type { Campaign } from '@/types/database'

interface Props {
  campaign?: Campaign
  onDone: (id?: string) => void
}

export function CampaignForm({ campaign, onDone }: Props) {
  const navigate = useNavigate()
  const save = useSaveCampaign()
  const remove = useDeleteCampaign()
  const { data: categories = [] } = useCategories()
  const { data: children = [] } = useChildren()
  const { data: participants = [] } = useCampaignParticipants()
  const openConfirm = useUIStore((s) => s.openConfirm)

  const [name, setName] = useState(campaign?.name ?? '')
  const [categoryId, setCategoryId] = useState(campaign?.category_id ?? null)
  const [amount, setAmount] = useState(
    campaign?.amount_per_child_ore ? oreToInput(campaign.amount_per_child_ore) : '',
  )
  // null tills man ändrar – då gäller sparade deltagare, eller alla barn
  const [picked, setPicked] = useState<string[] | null>(null)
  const [startDate, setStartDate] = useState(campaign?.start_date ?? '')
  const [endDate, setEndDate] = useState(campaign?.end_date ?? '')
  const [notes, setNotes] = useState(campaign?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  const saved = participants.filter((p) => p.campaign_id === campaign?.id).map((p) => p.child_id)
  const [childrenPay, setChildrenPay] = useState(saved.length > 0)
  const participantIds = picked ?? (saved.length ? saved : children.map((c) => c.id))
  const ore = parseSek(amount)

  function toggleChild(id: string) {
    setPicked(participantIds.includes(id) ? participantIds.filter((c) => c !== id) : [...participantIds, id])
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (childrenPay && amount.trim() && !ore) return setError('Beloppet per barn är inte ett belopp')
    if (childrenPay && !participantIds.length) return setError('Välj vilka barn som ska betala in')
    setError(null)
    save.mutate(
      {
        id: campaign?.id,
        name: name.trim(),
        category_id: categoryId,
        amount_per_child_ore: childrenPay ? ore : null,
        start_date: startDate || null,
        end_date: endDate || null,
        notes: notes.trim() || null,
        participant_ids: childrenPay ? participantIds : [],
      },
      { onSuccess: (id) => onDone(id as string) },
    )
  }

  function confirmDelete() {
    if (!campaign) return
    openConfirm(
      'Ta bort händelse',
      `"${campaign.name}" tas bort. Dess intäkter och utgifter finns kvar i kassan, utan koppling till händelsen.`,
      () =>
        remove.mutate(campaign.id, {
          onSuccess: () => {
            onDone()
            navigate('/handelser', { replace: true })
          },
        }),
    )
  }

  return (
    <form onSubmit={submit} className="px-4 pb-6 space-y-4">
      <Input
        label="Namn"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Bingolotter våren"
        autoFocus={!campaign}
      />
      {categories.length > 0 && (
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
      {children.length > 0 && (
        <Switch
          checked={childrenPay}
          onChange={setChildrenPay}
          label="Följ upp inbetalningar per barn"
          className="justify-between bg-[#161616] border border-[#222222] rounded-xl px-4 py-3"
        />
      )}
      {childrenPay && (
        <Input
          label="Belopp per barn (kr)"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Valfritt"
        />
      )}
      {childrenPay && children.length > 0 && (
        <div className="space-y-1.5">
          <span className="block text-[#A0A0A0] text-sm font-medium">
            Gäller {participantIds.length} barn{ore ? ` · ${formatSek(participantIds.length * ore)}` : ''}
          </span>
          <div className="flex flex-wrap gap-2">
            {children.length > 1 && (
              <Chip
                active={participantIds.length === children.length}
                onClick={() => setPicked(participantIds.length === children.length ? [] : children.map((c) => c.id))}
              >
                Alla
              </Chip>
            )}
            {children.map((c) => (
              <Chip key={c.id} active={participantIds.includes(c.id)} onClick={() => toggleChild(c.id)}>
                {c.name}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Från" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input label="Till" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <Textarea
        label="Information"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Vad gäller, sista dag att betala, Swish-nummer …"
        rows={6}
      />
      {error && <p className="text-[#EF4444] text-sm">{error}</p>}
      <div className="flex gap-2 pt-2">
        {campaign && (
          <Button type="button" variant="danger" onClick={confirmDelete} aria-label="Ta bort">
            <Trash2 size={18} />
          </Button>
        )}
        <Button type="submit" className="flex-1" loading={save.isPending} disabled={!name.trim()}>
          Spara
        </Button>
      </div>
    </form>
  )
}
