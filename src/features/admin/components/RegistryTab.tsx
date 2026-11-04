import { useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { useUIStore } from '@/store/uiStore'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import {
  useAllChildren,
  useCreateChild,
  useDeleteChild,
  useGuardians,
  useRenameChild,
  useSetChildTeams,
} from '@/features/children/hooks/useChildren'
import { useProfiles } from '../hooks/useUsers'
import { diff, displayName } from '../lib/diff'
import { MultiPicker } from './pickers'
import type { Child } from '@/types/database'

function ChildForm({ child, onDone }: { child?: Child; onDone: () => void }) {
  const { memberships } = useActiveTeam()
  const create = useCreateChild()
  const rename = useRenameChild()
  const setTeams = useSetChildTeams()
  const remove = useDeleteChild()
  const openConfirm = useUIStore((s) => s.openConfirm)
  const [name, setName] = useState(child?.name ?? '')
  const [teamIds, setTeamIds] = useState(child?.team_ids ?? [])
  const teams = memberships.map((m) => m.team)
  const busy = create.isPending || rename.isPending || setTeams.isPending

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      if (!child) {
        await create.mutateAsync({ name: name.trim(), teamIds })
      } else {
        if (name.trim() !== child.name) await rename.mutateAsync({ id: child.id, name: name.trim() })
        const change = diff(child.team_ids, teamIds)
        if (change.add.length || change.remove.length) await setTeams.mutateAsync({ childId: child.id, ...change })
      }
      onDone()
    } catch {
      // Felet visas redan som toast
    }
  }

  return (
    <form onSubmit={submit} className="px-4 pb-6 space-y-4">
      <Input label="Namn" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!child} />
      <MultiPicker label="Lag" options={teams} selected={teamIds} onChange={setTeamIds} />
      <div className="flex gap-2 pt-2">
        {child && (
          <Button
            type="button"
            variant="danger"
            aria-label="Ta bort"
            onClick={() =>
              openConfirm('Ta bort barn', `${child.name} tas bort ur alla lag och kopplingar till föräldrar slutar gälla.`, () =>
                remove.mutate(child.id, { onSuccess: onDone }),
              )
            }
          >
            <Trash2 size={18} />
          </Button>
        )}
        <Button type="submit" className="flex-1" loading={busy} disabled={!name.trim()}>
          Spara
        </Button>
      </div>
    </form>
  )
}

/** Alla barn och vilka lag de är med i */
export function RegistryTab() {
  const { memberships } = useActiveTeam()
  const { data: children, isLoading } = useAllChildren()
  const { data: guardians = [] } = useGuardians()
  const { data: profiles = [] } = useProfiles()
  const [sheet, setSheet] = useState<Child | 'new' | null>(null)

  const teamNames = (ids: string[]) =>
    memberships.filter((m) => ids.includes(m.team_id)).map((m) => m.team.name).join(', ')
  const guardianNames = (childId: string) =>
    guardians
      .filter((g) => g.child_id === childId)
      .map((g) => displayName(profiles.find((p) => p.id === g.profile_id)))
      .join(', ')

  return (
    <div className="p-4 space-y-3">
      <Button variant="secondary" className="w-full" onClick={() => setSheet('new')}>
        <Plus size={18} className="mr-1" /> Nytt barn
      </Button>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : !children?.length ? (
        <EmptyState icon={Users} title="Inga barn än" />
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
                {teamNames(c.team_ids) || 'Inget lag'}
                {guardianNames(c.id) && ` · ${guardianNames(c.id)}`}
              </span>
            </button>
          ))}
        </Card>
      )}

      <BottomSheet isOpen={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'new' ? 'Nytt barn' : 'Barn'}>
        {sheet !== null && (
          <ChildForm
            key={sheet === 'new' ? 'new' : sheet.id}
            child={sheet === 'new' ? undefined : sheet}
            onDone={() => setSheet(null)}
          />
        )}
      </BottomSheet>
    </div>
  )
}
