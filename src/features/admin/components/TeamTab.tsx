import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { oreToInput, parseSek } from '@/lib/money'
import { useActiveTeam, useUpdateTeam } from '@/features/teams/hooks/useTeams'
import type { Team } from '@/types/database'

export function TeamTab() {
  const { team } = useActiveTeam()
  return team ? <TeamForm key={team.id} team={team} /> : null
}

function TeamForm({ team }: { team: Team }) {
  const update = useUpdateTeam()

  const [name, setName] = useState(team.name)
  const [opening, setOpening] = useState(team.opening_balance_ore ? oreToInput(team.opening_balance_ore) : '')
  const [openingDate, setOpeningDate] = useState(team.opening_date ?? '')

  function save(e: React.FormEvent) {
    e.preventDefault()
    const negative = opening.trim().startsWith('-')
    const ore = opening.trim() ? parseSek(opening.replace('-', '')) : 0
    if (!name.trim()) return toast.error('Ange ett namn')
    if (ore === null) return toast.error('Ingående saldo är inte ett belopp')
    update.mutate({
      id: team.id,
      name: name.trim(),
      opening_balance_ore: negative ? -ore : ore,
      opening_date: openingDate || null,
    })
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <form onSubmit={save} className="space-y-4">
          <Input label="Lagets namn" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ingående saldo (kr)"
              inputMode="decimal"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              placeholder="0"
            />
            <Input
              label="Per datum"
              type="date"
              value={openingDate}
              onChange={(e) => setOpeningDate(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" loading={update.isPending}>
            Spara
          </Button>
        </form>
      </Card>
    </div>
  )
}
