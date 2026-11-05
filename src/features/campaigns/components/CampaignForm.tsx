import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Input } from '@/components/ui/Input'
import { SegmentedToggle } from '@/components/ui/SegmentedToggle'
import { Textarea } from '@/components/ui/Textarea'
import { formatSek, oreToInput, parseSek } from '@/lib/money'
import { useUIStore } from '@/store/uiStore'
import { pluralize } from '@/lib/utils'
import { useChildren } from '@/features/children/hooks/useChildren'
import { useTransactions } from '@/features/transactions/hooks/useTransactions'
import { totals } from '@/features/transactions/lib/finance'
import { useCampaignParticipants, useDeleteCampaign, useSaveCampaign } from '../hooks/useCampaigns'
import { CAMPAIGN_TYPES } from '../lib/format'
import type { Campaign, CampaignType } from '@/types/database'

const NAME_EXAMPLE: Record<CampaignType, string> = {
  sale: 'Bingolotter våren',
  fee: 'Cupavgift',
  job: 'Städning efter match',
  other: 'Avslutning',
}

// Typerna som följs upp per barn – vad beloppet är och vad barnen gör
const PER_CHILD: Record<Exclude<CampaignType, 'other'>, { amount: string; who: string }> = {
  sale: { amount: 'Minst per barn (kr)', who: 'Säljer' },
  fee: { amount: 'Belopp per barn (kr)', who: 'Ska betala' },
  job: { amount: 'Ersättning per barn (kr)', who: 'Jobbar' },
}

interface Props {
  campaign?: Campaign
  onDone: (id?: string) => void
}

export function CampaignForm({ campaign, onDone }: Props) {
  const navigate = useNavigate()
  const save = useSaveCampaign()
  const remove = useDeleteCampaign()
  const { data: children = [] } = useChildren()
  const { data: participants = [] } = useCampaignParticipants()
  const { data: transactions = [] } = useTransactions()
  const openConfirm = useUIStore((s) => s.openConfirm)

  const [name, setName] = useState(campaign?.name ?? '')
  const [amount, setAmount] = useState(
    campaign?.amount_per_child_ore ? oreToInput(campaign.amount_per_child_ore) : '',
  )
  // null tills man ändrar – då gäller sparade deltagare, eller alla barn
  const [picked, setPicked] = useState<string[] | null>(null)
  const [startDate, setStartDate] = useState(campaign?.start_date ?? '')
  const [endDate, setEndDate] = useState(campaign?.end_date ?? '')
  const [notes, setNotes] = useState(campaign?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  // Nya händelser är oftast försäljningar
  const [type, setType] = useState<CampaignType>(campaign?.type ?? 'sale')
  const saved = participants.filter((p) => p.campaign_id === campaign?.id).map((p) => p.child_id)
  const participantIds = picked ?? (saved.length ? saved : children.map((c) => c.id))
  const perChild = type === 'other' ? null : PER_CHILD[type]
  const ore = parseSek(amount)

  function toggleChild(id: string) {
    setPicked(participantIds.includes(id) ? participantIds.filter((c) => c !== id) : [...participantIds, id])
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (type === 'fee' && !ore) return setError('Ange vad varje barn ska betala')
    if (type === 'sale' && amount.trim() && !ore) return setError('Minimum per barn är inte ett belopp')
    if (type === 'job' && amount.trim() && !ore) return setError('Ersättningen per barn är inte ett belopp')
    if (perChild && !participantIds.length) {
      return setError(type === 'job' ? 'Välj vilka barn som jobbar' : 'Välj vilka barn som ska betala in')
    }
    // Utan slutdatum blir händelsen aldrig avslutad och ligger kvar som pågående
    if (perChild && !endDate) {
      return setError(type === 'job' ? 'Ange ett till-datum när jobbet är klart' : 'Ange ett till-datum när inbetalningarna ska vara klara')
    }
    if (startDate && endDate && endDate < startDate) return setError('Till-datumet är före från-datumet')
    setError(null)
    save.mutate(
      {
        id: campaign?.id,
        name: name.trim(),
        type,
        // Avgift: exakt belopp. Försäljning: valfritt minimum. Jobb: valfri ersättning. Övrigt: inget
        amount_per_child_ore: type === 'other' ? null : ore,
        start_date: startDate || null,
        end_date: endDate || null,
        notes: notes.trim() || null,
        participant_ids: perChild ? participantIds : [],
      },
      { onSuccess: (id) => onDone(id as string) },
    )
  }

  function confirmDelete() {
    if (!campaign) return
    const linked = transactions.filter((t) => t.campaign_id === campaign.id)
    const { income, expense } = totals(linked)
    openConfirm(
      'Ta bort händelse',
      linked.length
        ? `"${campaign.name}" tas bort tillsammans med ${pluralize(linked.length, 'post', 'poster')} – ` +
            `${formatSek(income)} i intäkter och ${formatSek(expense)} i kostnader försvinner ur kassan. Det går inte att ångra.`
        : `"${campaign.name}" tas bort. Det går inte att ångra.`,
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
      <SegmentedToggle value={type} options={CAMPAIGN_TYPES} onChange={setType} />
      <Input
        label="Namn"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={NAME_EXAMPLE[type]}
        autoFocus={!campaign}
      />
      {perChild && (
        <Input
          label={perChild.amount}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={type === 'fee' ? '0' : type === 'sale' ? 'Valfritt – t.ex. 10 lotter à 50 kr = 500' : 'Valfritt'}
        />
      )}
      {perChild && children.length > 0 && (
        <div className="space-y-1.5">
          <span className="block text-[#A0A0A0] text-sm font-medium">
            {perChild.who} · {participantIds.length} barn
            {ore ? ` · ${type === 'sale' ? 'minst ' : ''}${formatSek(participantIds.length * ore)}` : ''}
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
        placeholder={
          type === 'job' ? 'Var och när, samlingstid, vad barnen ska ha med sig …' : 'Vad gäller, sista dag att betala, Swish-nummer …'
        }
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
