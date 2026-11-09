import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { FAB } from '@/components/layout/FAB'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { oreToInput, parseSek } from '@/lib/money'
import { pluralize } from '@/lib/utils'
import { useActiveTeam, useCreateTeam, useUpdateTeam } from '@/features/teams/hooks/useTeams'
import { useAllChildren } from '@/features/children/hooks/useChildren'
import { useProfiles, useTeamAdmins } from '../hooks/useUsers'
import { displayName } from '../lib/diff'
import type { Team } from '@/types/database'

/**
 * Lagets namn, Swish-nummer och ingående saldo. Det ingående saldot sätts en gång – det som fanns
 * i kassan den dag laget började använda appen. Allt därefter bokförs som intäkter och utgifter.
 */
function TeamForm({ team, onDone }: { team: Team; onDone: () => void }) {
  const update = useUpdateTeam()
  const [name, setName] = useState(team.name)
  const [swish, setSwish] = useState(team.swish_number ?? '')
  const [opening, setOpening] = useState(team.opening_balance_ore ? oreToInput(team.opening_balance_ore) : '')
  const [openingDate, setOpeningDate] = useState(team.opening_date ?? '')

  function save(e: React.FormEvent) {
    e.preventDefault()
    const negative = opening.trim().startsWith('-')
    const ore = opening.trim() ? parseSek(opening.replace('-', '')) : 0
    if (!name.trim()) return toast.error('Ange ett namn')
    // Samma regel som i databasen: siffror, mellanslag, + och -
    if (swish.trim() && !/^[0-9 +-]{5,20}$/.test(swish.trim())) return toast.error('Swish-numret är inte ett nummer')
    if (ore === null) return toast.error('Ingående saldo är inte ett belopp')
    update.mutate(
      {
        id: team.id,
        name: name.trim(),
        swish_number: swish.trim() || null,
        opening_balance_ore: negative ? -ore : ore,
        opening_date: openingDate || null,
      },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={save} className="px-4 pb-6 space-y-4">
      <Input label="Lagets namn" value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        label="Swish-nummer"
        inputMode="tel"
        value={swish}
        onChange={(e) => setSwish(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Ingående saldo (kr)"
          inputMode="decimal"
          value={opening}
          onChange={(e) => setOpening(e.target.value)}
          placeholder="0"
        />
        <Input label="Per datum" type="date" value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" loading={update.isPending}>
        Spara
      </Button>
    </form>
  )
}

/** Nytt lag – bara namnet, resten ställs in genom att trycka på laget i listan */
function NewTeamForm({ onDone }: { onDone: () => void }) {
  const create = useCreateTeam()
  const [name, setName] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    create.mutate(name.trim(), { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} className="px-4 pb-6 space-y-4">
      <Input label="Lagets namn" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <Button type="submit" className="w-full" loading={create.isPending} disabled={!name.trim()}>
        Skapa
      </Button>
    </form>
  )
}

/** Alla lag – skapa nya och tryck på ett lag för att ändra namn och ingående saldo */
export function AllTeamsTab() {
  const { memberships } = useActiveTeam()
  const { data: children = [] } = useAllChildren()
  const { data: admins = [] } = useTeamAdmins()
  const { data: profiles = [] } = useProfiles()
  const [open, setOpen] = useState<Team | 'new' | null>(null)

  return (
    <div className="p-4">
      <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
        {memberships.map(({ team }) => {
          const players = children.filter((c) => c.team_ids.includes(team.id)).length
          const adminNames = admins
            .filter((a) => a.team_id === team.id)
            .map((a) => displayName(profiles.find((p) => p.id === a.profile_id)))
            .join(', ')
          return (
            <button
              key={team.id}
              onClick={() => setOpen(team)}
              className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-[#1A1A1A]"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-white text-sm font-medium truncate">{team.name}</span>
                <span className="block text-[#8A8A8A] text-xs truncate">
                  {pluralize(players, 'spelare', 'spelare')}
                  {adminNames && ` · ${adminNames}`}
                </span>
              </span>
              <ChevronRight size={16} className="text-[#8A8A8A] shrink-0" />
            </button>
          )
        })}
      </Card>

      <FAB onClick={() => setOpen('new')} label="Nytt lag" />

      <BottomSheet isOpen={open !== null} onClose={() => setOpen(null)} title={open === 'new' ? 'Nytt lag' : 'Lag'}>
        {open === 'new' ? (
          <NewTeamForm onDone={() => setOpen(null)} />
        ) : (
          open && <TeamForm key={open.id} team={open} onDone={() => setOpen(null)} />
        )}
      </BottomSheet>
    </div>
  )
}
