import { useState } from 'react'
import { Trash2, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { Switch } from '@/components/ui/Switch'
import { useUIStore } from '@/store/uiStore'
import { useAuthContext } from '@/features/auth/components/AuthProvider'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useAllChildren, useLiveGuardians, useSetGuardianChildren } from '@/features/children/hooks/useChildren'
import {
  useDeleteUser,
  usePendingProfiles,
  useProfiles,
  useSetAdminTeams,
  useSetSuperAdmin,
  useTeamAdmins,
} from '../hooks/useUsers'
import { diff, displayName } from '../lib/diff'
import { ChildrenByTeamPicker, ChildrenNote, MultiPicker, TeamFilter } from './pickers'
import type { Profile } from '@/types/database'

function UserForm({ profile, teamId, onDone }: { profile: Profile; teamId: string | null; onDone: () => void }) {
  const { user } = useAuthContext()
  const { memberships } = useActiveTeam()
  const { data: children = [] } = useAllChildren()
  const { data: guardians = [] } = useLiveGuardians()
  const { data: admins = [] } = useTeamAdmins()
  const setSuper = useSetSuperAdmin()
  const setAdminTeams = useSetAdminTeams()
  const setGuardians = useSetGuardianChildren()
  const deleteUser = useDeleteUser()
  const openConfirm = useUIStore((s) => s.openConfirm)

  const currentTeams = admins.filter((a) => a.profile_id === profile.id).map((a) => a.team_id)
  const currentChildren = guardians.filter((g) => g.profile_id === profile.id).map((g) => g.child_id)
  const [isSuper, setIsSuper] = useState(profile.is_super_admin)
  const [isTreasurer, setIsTreasurer] = useState(currentTeams.length > 0)
  const [teamIds, setTeamIds] = useState(currentTeams)
  const [childIds, setChildIds] = useState(currentChildren)
  const isSelf = profile.id === user?.id
  const teamNames = (ids: string[]) =>
    memberships.filter((m) => ids.includes(m.team_id)).map((m) => m.team.name).join(', ')
  const busy = setSuper.isPending || setAdminTeams.isPending || setGuardians.isPending || deleteUser.isPending

  // Ekonomiansvarig gäller ett lag – börja med det filtrerade laget, eller det enda som finns
  function toggleTreasurer(on: boolean) {
    setIsTreasurer(on)
    const first = teamId ?? (memberships.length === 1 ? memberships[0].team_id : null)
    if (on && !teamIds.length && first) setTeamIds([first])
  }

  async function save() {
    try {
      if (isSuper !== profile.is_super_admin) await setSuper.mutateAsync({ profileId: profile.id, value: isSuper })
      // Huvudadmin har alla lag – lagen som ekonomiansvarig lämnas då orörda
      const wantedTeams = isSuper ? currentTeams : isTreasurer ? teamIds : []
      const teams = diff(currentTeams, wantedTeams)
      if (teams.add.length || teams.remove.length) await setAdminTeams.mutateAsync({ profileId: profile.id, ...teams })
      const kids = diff(currentChildren, childIds)
      if (kids.add.length || kids.remove.length) await setGuardians.mutateAsync({ profileId: profile.id, ...kids })
      toast.success('Sparat', { id: 'Sparat' })
      onDone()
    } catch {
      // Felet visas redan som toast
    }
  }

  return (
    <div className="px-4 pb-6 space-y-4">
      <div>
        <p className="text-white font-medium">{displayName(profile)}</p>
        {profile.full_name && <p className="text-[#8A8A8A] text-sm">{profile.email}</p>}
      </div>
      <ChildrenNote
        note={currentChildren.length ? null : profile.children_note}
        options={children.map((c) => ({ ...c, detail: teamNames(c.team_ids) }))}
        selected={childIds}
        onChange={setChildIds}
      />
      <ChildrenByTeamPicker
        label="Förälder till"
        options={children}
        selected={childIds}
        onChange={setChildIds}
        firstTeamId={teamId}
      />
      <div className="space-y-1.5">
        <span className="block text-[#A0A0A0] text-sm font-medium">Roller</span>
        <div className="bg-[#161616] border border-[#222222] rounded-xl divide-y divide-[#222222]">
          {/* Man kan inte ta bort sig själv som huvudadmin */}
          <Switch
            checked={isSuper}
            onChange={setIsSuper}
            disabled={isSelf}
            label="Huvudadmin"
            className="justify-between px-4 py-3"
          />
          {!isSuper && (
            <div>
              <Switch
                checked={isTreasurer}
                onChange={toggleTreasurer}
                label="Ekonomiansvarig"
                className="justify-between px-4 py-3"
              />
              {isTreasurer && (
                <div className="px-4 pb-3">
                  <MultiPicker options={memberships.map((m) => m.team)} selected={teamIds} onChange={setTeamIds} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        {/* Inte sig själv, och en huvudadmin måste först förlora rollen */}
        {!isSelf && !profile.is_super_admin && (
          <Button
            type="button"
            variant="danger"
            aria-label="Ta bort konto"
            disabled={busy}
            onClick={() =>
              openConfirm(
                'Ta bort konto',
                `${displayName(profile)} tas bort och kan inte längre logga in. Kopplingarna till barn och lag försvinner, men bokförda poster står kvar.`,
                () => deleteUser.mutate(profile.id, { onSuccess: onDone }),
              )
            }
          >
            <Trash2 size={18} />
          </Button>
        )}
        <Button className="flex-1" onClick={save} loading={busy}>
          Spara
        </Button>
      </div>
    </div>
  )
}

/**
 * Alla användare – huvudadmin, ekonomiansvar och barn. Med ett lag valt: de som hör till laget.
 * Alla registrerar sig själva via länken och kopplas sedan här.
 */
export function UsersTab({ teamId, onTeamChange }: { teamId: string | null; onTeamChange: (id: string | null) => void }) {
  const { memberships } = useActiveTeam()
  const { data: profiles } = useProfiles()
  const { data: admins = [] } = useTeamAdmins()
  const { data: guardians = [] } = useLiveGuardians()
  const { data: children = [] } = useAllChildren()
  // Inget kan öppnas förrän kopplingarna är hämtade – UserForm utgår från dem när den sparar
  const { data: pending, ready } = usePendingProfiles()
  const [open, setOpen] = useState<Profile | null>(null)

  const adminTeamsOf = (profileId: string) => admins.filter((a) => a.profile_id === profileId).map((a) => a.team_id)
  const childrenOf = (profileId: string) => guardians.filter((g) => g.profile_id === profileId).map((g) => g.child_id)
  // Lagen användaren är förälder i, via barnen
  const parentTeamsOf = (profileId: string) => [
    ...new Set(children.filter((c) => childrenOf(profileId).includes(c.id)).flatMap((c) => c.team_ids)),
  ]
  // Alla med tillgång till laget: huvudadmin, ekonomiansvarig i laget eller förälder till ett barn i laget
  const inTeam = (p: Profile) =>
    !teamId || p.is_super_admin || adminTeamsOf(p.id).includes(teamId) || parentTeamsOf(p.id).includes(teamId)
  // Väntande konton hör inte till något lag än och syns oavsett filter
  const linked = profiles?.filter((p) => !pending.some((q) => q.id === p.id) && inTeam(p))
  const teamNames = (ids: string[]) =>
    memberships.filter((m) => ids.includes(m.team_id)).map((m) => m.team.name).join(', ')
  const childNames = (ids: string[]) =>
    children.filter((c) => ids.includes(c.id)).map((c) => c.name).join(', ')

  // Som spelarnas rader: lagen först, sedan barnen. Lagen som ekonomiansvarig står med bland lagen
  function summary(profileId: string) {
    return [
      teamNames([...parentTeamsOf(profileId), ...adminTeamsOf(profileId)]),
      childNames(childrenOf(profileId)),
    ].filter(Boolean).join(' · ')
  }
  // Med ett lag valt i filtret: ekonomiansvarig just i det laget
  const isTreasurer = (profileId: string) =>
    teamId ? adminTeamsOf(profileId).includes(teamId) : adminTeamsOf(profileId).length > 0

  return (
    <div className="py-4 space-y-3">
      <TeamFilter value={teamId} onChange={onTeamChange} />

      {!ready ? (
        <div className="px-4">
          <ListSkeleton rows={4} />
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {pending.length > 0 && (
            <>
              <h3 className="text-[#A0A0A0] text-xs font-semibold uppercase tracking-wider px-1 pt-2">
                Väntar på koppling
              </h3>
              <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
                {pending.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setOpen(p)}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-[#1A1A1A]"
                  >
                    <UserRound size={16} className="text-[#8A8A8A] shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-white text-sm font-medium truncate">{displayName(p)}</span>
                      {(p.children_note || p.full_name) && (
                        <span className="block text-[#8A8A8A] text-xs truncate">
                          {p.children_note ? `Angav ”${p.children_note}”` : p.email}
                        </span>
                      )}
                    </span>
                    <span className="text-[#FFD700] text-xs font-medium shrink-0">Koppla</span>
                  </button>
                ))}
              </Card>
              <h3 className="text-[#A0A0A0] text-xs font-semibold uppercase tracking-wider px-1 pt-2">
                Användare
              </h3>
            </>
          )}

          {/* Huvudadmin hör till varje lag, så listan är aldrig tom */}
          <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
            {linked?.map((p) => (
              <button
                key={p.id}
                onClick={() => setOpen(p)}
                className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-[#1A1A1A]"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-white text-sm font-medium truncate">{displayName(p)}</span>
                  <span className="block text-[#8A8A8A] text-xs truncate">{summary(p.id) || p.email}</span>
                </span>
                {/* Under varandra, så att namnet inte trängs undan när någon har båda rollerna */}
                {(p.is_super_admin || isTreasurer(p.id)) && (
                  <span className="flex flex-col items-end gap-1 shrink-0">
                    {p.is_super_admin && <Badge variant="accent">Huvudadmin</Badge>}
                    {isTreasurer(p.id) && <Badge>Ekonomiansvarig</Badge>}
                  </span>
                )}
              </button>
            ))}
          </Card>
        </div>
      )}

      <BottomSheet isOpen={open !== null} onClose={() => setOpen(null)} title="Användare">
        {open && <UserForm key={open.id} profile={open} teamId={teamId} onDone={() => setOpen(null)} />}
      </BottomSheet>
    </div>
  )
}
