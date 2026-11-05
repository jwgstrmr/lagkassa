import { useState } from 'react'
import { Mail, Trash2, UserPlus, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { useUIStore } from '@/store/uiStore'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useAuthContext } from '@/features/auth/components/AuthProvider'
import { useChildren, useGuardians, useSetGuardianChildren } from '@/features/children/hooks/useChildren'
import { useInvites, useInviteUser, useProfiles, useTeamAdmins } from '../hooks/useUsers'
import { diff, displayName } from '../lib/diff'
import { MultiPicker } from './pickers'
import { CopySignupLink } from './CopySignupLink'
import type { Invite, Profile } from '@/types/database'

/** Bara lagets barn kan väljas – kopplingar till barn i andra lag lämnas orörda */
function ParentForm({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const { data: children = [] } = useChildren()
  const { data: guardians = [] } = useGuardians()
  const setGuardians = useSetGuardianChildren()
  const teamChildIds = children.map((c) => c.id)
  const current = guardians
    .filter((g) => g.profile_id === profile.id && teamChildIds.includes(g.child_id))
    .map((g) => g.child_id)
  const [selected, setSelected] = useState(current)

  return (
    <div className="px-4 pb-6 space-y-4">
      <div>
        <p className="text-white font-medium">{displayName(profile)}</p>
        {profile.full_name && <p className="text-[#8A8A8A] text-sm">{profile.email}</p>}
      </div>
      <MultiPicker label="Barn i laget" options={children} selected={selected} onChange={setSelected} />
      <Button
        className="w-full"
        loading={setGuardians.isPending}
        onClick={() => setGuardians.mutate({ profileId: profile.id, ...diff(current, selected) }, { onSuccess: onDone })}
      >
        Spara
      </Button>
    </div>
  )
}

function InviteParentForm({ invite, onDone }: { invite?: Invite; onDone: () => void }) {
  const { isSuperAdmin } = useActiveTeam()
  const { data: children = [] } = useChildren()
  const { data: invites = [] } = useInvites()
  const inviteUser = useInviteUser()
  const openConfirm = useUIStore((s) => s.openConfirm)
  const teamChildIds = children.map((c) => c.id)
  const [email, setEmail] = useState(invite?.email ?? '')
  const [selected, setSelected] = useState(invite?.child_ids.filter((id) => teamChildIds.includes(id)) ?? [])

  function send(childIds: string[]) {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return toast.error('Ange en e-postadress')
    // Barn i andra lag och lag som ekonomiansvarig ska stå kvar i inbjudan
    const existing = invite ?? invites.find((i) => i.email === email.trim().toLowerCase())
    const otherChildren = existing?.child_ids.filter((id) => !teamChildIds.includes(id)) ?? []
    inviteUser.mutate(
      {
        email: email.trim(),
        childIds: [...otherChildren, ...childIds],
        adminTeamIds: isSuperAdmin ? existing?.admin_team_ids : undefined,
      },
      {
        onSuccess: (result) => {
          toast.success(!childIds.length ? 'Inbjudan borttagen' : result === 'added' ? 'Kopplad till barnen' : 'Inbjudan sparad')
          onDone()
        },
      },
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        send(selected)
      }}
      className="px-4 pb-6 space-y-4"
    >
      <Input
        label="E-postadress"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={!!invite}
        autoFocus={!invite}
        placeholder="forälder@exempel.se"
      />
      <MultiPicker label="Barn i laget" options={children} selected={selected} onChange={setSelected} />
      <div className="flex gap-2 pt-2">
        {invite && (
          <Button
            type="button"
            variant="danger"
            aria-label="Ta bort inbjudan"
            onClick={() => openConfirm('Ta bort inbjudan', `Inbjudan till ${invite.email} tas bort från laget.`, () => send([]))}
          >
            <Trash2 size={18} />
          </Button>
        )}
        <Button type="submit" className="flex-1" loading={inviteUser.isPending} disabled={!selected.length}>
          {invite ? 'Spara' : 'Bjud in'}
        </Button>
      </div>
    </form>
  )
}

type Sheet = { type: 'parent'; profile: Profile } | { type: 'invite'; invite?: Invite }

export function ParentsTab() {
  const { teamId } = useActiveTeam()
  const { user } = useAuthContext()
  const { data: children = [], isLoading } = useChildren()
  const { data: guardians = [] } = useGuardians()
  const { data: profiles = [] } = useProfiles()
  const { data: admins = [] } = useTeamAdmins()
  const { data: invites = [] } = useInvites()
  const [sheet, setSheet] = useState<Sheet | null>(null)

  const teamChildIds = children.map((c) => c.id)
  const childNames = (ids: string[]) =>
    children.filter((c) => ids.includes(c.id)).map((c) => c.name).join(', ')
  const childrenOf = (profileId: string) =>
    guardians.filter((g) => g.profile_id === profileId && teamChildIds.includes(g.child_id)).map((g) => g.child_id)

  const parents = profiles.filter((p) => childrenOf(p.id).length > 0)
  const teamAdmins = profiles.filter((p) => admins.some((a) => a.team_id === teamId && a.profile_id === p.id))
  const teamInvites = invites.filter((i) => i.child_ids.some((id) => teamChildIds.includes(id)))
  // T.ex. en förälder som registrerat sig med en annan adress än inbjudan
  const unlinked = profiles.filter(
    (p) =>
      p.id !== user?.id &&
      !p.is_super_admin &&
      !guardians.some((g) => g.profile_id === p.id) &&
      !admins.some((a) => a.profile_id === p.id),
  )

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setSheet({ type: 'invite' })}>
          <UserPlus size={18} className="mr-1" /> Bjud in förälder
        </Button>
        <CopySignupLink />
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : parents.length > 0 && (
        <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
          {parents.map((p) => (
            <button
              key={p.id}
              onClick={() => setSheet({ type: 'parent', profile: p })}
              className="block w-full px-4 py-3 text-left active:bg-[#1A1A1A]"
            >
              <span className="block text-white text-sm font-medium truncate">{displayName(p)}</span>
              <span className="block text-[#8A8A8A] text-xs truncate">{childNames(childrenOf(p.id))}</span>
            </button>
          ))}
        </Card>
      )}

      {unlinked.length > 0 && (
        <>
          <h3 className="text-[#A0A0A0] text-xs font-semibold uppercase tracking-wider px-1 pt-2">
            Konton utan lag
          </h3>
          <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
            {unlinked.map((p) => (
              <button
                key={p.id}
                onClick={() => setSheet({ type: 'parent', profile: p })}
                className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-[#1A1A1A]"
              >
                <UserRound size={16} className="text-[#8A8A8A] shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-white text-sm truncate">{displayName(p)}</span>
                  {p.full_name && <span className="block text-[#8A8A8A] text-xs truncate">{p.email}</span>}
                </span>
                <span className="text-[#FFD700] text-xs font-medium shrink-0">Koppla barn</span>
              </button>
            ))}
          </Card>
        </>
      )}

      {teamInvites.length > 0 && (
        <>
          <h3 className="text-[#A0A0A0] text-xs font-semibold uppercase tracking-wider px-1 pt-2">
            Väntar på registrering
          </h3>
          <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
            {teamInvites.map((inv) => (
              <button
                key={inv.id}
                onClick={() => setSheet({ type: 'invite', invite: inv })}
                className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-[#1A1A1A]"
              >
                <Mail size={16} className="text-[#8A8A8A] shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-white text-sm truncate">{inv.email}</span>
                  <span className="block text-[#8A8A8A] text-xs truncate">{childNames(inv.child_ids)}</span>
                </span>
              </button>
            ))}
          </Card>
        </>
      )}

      {teamAdmins.length > 0 && (
        <>
          <h3 className="text-[#A0A0A0] text-xs font-semibold uppercase tracking-wider px-1 pt-2">
            Ekonomiansvariga
          </h3>
          <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
            {teamAdmins.map((p) => (
              <div key={p.id} className="px-4 py-3">
                <span className="block text-white text-sm truncate">{displayName(p)}</span>
                {p.full_name && <span className="block text-[#8A8A8A] text-xs truncate">{p.email}</span>}
              </div>
            ))}
          </Card>
        </>
      )}

      <BottomSheet
        isOpen={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet?.type === 'parent' ? 'Förälder' : sheet?.invite ? 'Inbjudan' : 'Bjud in förälder'}
      >
        {sheet?.type === 'parent' && (
          <ParentForm key={sheet.profile.id} profile={sheet.profile} onDone={() => setSheet(null)} />
        )}
        {sheet?.type === 'invite' && (
          <InviteParentForm key={sheet.invite?.id ?? 'new'} invite={sheet.invite} onDone={() => setSheet(null)} />
        )}
      </BottomSheet>
    </div>
  )
}
