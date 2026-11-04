import { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { useUIStore } from '@/store/uiStore'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import {
  useAllChildren,
  useChildren,
  useCreateChild,
  useGuardians,
  useRenameChild,
  useSetChildTeams,
} from '@/features/children/hooks/useChildren'
import { useProfiles } from '../hooks/useUsers'
import { displayName } from '../lib/diff'
import type { Child } from '@/types/database'

function AddPlayerForm({ onDone }: { onDone: () => void }) {
  const { teamId } = useActiveTeam()
  const { data: all = [] } = useAllChildren()
  const create = useCreateChild()
  const setTeams = useSetChildTeams()
  const [name, setName] = useState('')

  // Barn från andra lag man ansvarar för kan läggas till direkt
  const others = all.filter((c) => !c.team_ids.includes(teamId))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    create.mutate({ name: name.trim(), teamIds: [teamId] }, { onSuccess: onDone })
  }

  return (
    <div className="px-4 pb-6 space-y-5">
      <form onSubmit={submit} className="space-y-3">
        <Input label="Nytt barn" value={name} onChange={(e) => setName(e.target.value)} placeholder="Namn" autoFocus />
        <Button type="submit" className="w-full" loading={create.isPending} disabled={!name.trim()}>
          Lägg till
        </Button>
      </form>

      {others.length > 0 && (
        <div className="space-y-1.5">
          <span className="block text-[#A0A0A0] text-sm font-medium">Från andra lag</span>
          <div className="flex flex-wrap gap-2">
            {others.map((c) => (
              <Chip
                key={c.id}
                onClick={() => setTeams.mutate({ childId: c.id, add: [teamId], remove: [] }, { onSuccess: onDone })}
              >
                <Plus size={14} className="mr-1" />
                {c.name}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerForm({ child, guardianNames, onDone }: { child: Child; guardianNames: string; onDone: () => void }) {
  const { team } = useActiveTeam()
  const rename = useRenameChild()
  const setTeams = useSetChildTeams()
  const openConfirm = useUIStore((s) => s.openConfirm)
  const [name, setName] = useState(child.name)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    rename.mutate({ id: child.id, name: name.trim() }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} className="px-4 pb-6 space-y-4">
      <Input label="Namn" value={name} onChange={(e) => setName(e.target.value)} />
      <div>
        <span className="block text-[#A0A0A0] text-sm font-medium">Föräldrar</span>
        <p className="text-white text-sm mt-1">{guardianNames || '–'}</p>
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="danger"
          onClick={() =>
            team &&
            openConfirm('Ta bort ur laget', `${child.name} tas bort ur ${team.name}. Bokförda inbetalningar finns kvar i kassan.`, () =>
              setTeams.mutate({ childId: child.id, add: [], remove: [team.id] }, { onSuccess: onDone }),
            )
          }
        >
          Ta bort ur laget
        </Button>
        <Button type="submit" className="flex-1" loading={rename.isPending} disabled={!name.trim()}>
          Spara
        </Button>
      </div>
    </form>
  )
}

export function PlayersTab() {
  const { data: children, isLoading } = useChildren()
  const { data: guardians = [] } = useGuardians()
  const { data: profiles = [] } = useProfiles()
  const [sheet, setSheet] = useState<Child | 'add' | null>(null)

  const guardianNames = (childId: string) =>
    guardians
      .filter((g) => g.child_id === childId)
      .map((g) => displayName(profiles.find((p) => p.id === g.profile_id)))
      .join(', ')

  return (
    <div className="p-4 space-y-3">
      <Button variant="secondary" className="w-full" onClick={() => setSheet('add')}>
        <Plus size={18} className="mr-1" /> Lägg till spelare
      </Button>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : !children?.length ? (
        <EmptyState icon={Users} title="Inga spelare än" />
      ) : (
        <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setSheet(c)}
              className="block w-full px-4 py-3 text-left active:bg-[#1A1A1A]"
            >
              <span className="block text-white text-sm font-medium">{c.name}</span>
              <span className="block text-[#666666] text-xs truncate">
                {guardianNames(c.id) || 'Ingen förälder kopplad'}
              </span>
            </button>
          ))}
        </Card>
      )}

      <BottomSheet
        isOpen={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === 'add' ? 'Lägg till spelare' : 'Spelare'}
      >
        {sheet === 'add' && <AddPlayerForm onDone={() => setSheet(null)} />}
        {sheet && sheet !== 'add' && (
          <PlayerForm
            key={sheet.id}
            child={sheet}
            guardianNames={guardianNames(sheet.id)}
            onDone={() => setSheet(null)}
          />
        )}
      </BottomSheet>
    </div>
  )
}
