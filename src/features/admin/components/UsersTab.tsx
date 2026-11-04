import { useState } from 'react'
import { Mail, Trash2, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { Switch } from '@/components/ui/Switch'
import { useUIStore } from '@/store/uiStore'
import { useAuthContext } from '@/features/auth/components/AuthProvider'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useAllChildren, useGuardians, useSetGuardianChildren } from '@/features/children/hooks/useChildren'
import {
  useDeleteInvite,
  useInvites,
  useInviteUser,
  useProfiles,
  useSetAdminTeams,
  useSetSuperAdmin,
  useTeamAdmins,
} from '../hooks/useUsers'
import { diff, displayName } from '../lib/diff'
import { MultiPicker } from './pickers'
import { CopySignupLink } from './CopySignupLink'
import type { Invite, Profile } from '@/types/database'

function UserForm({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const { user } = useAuthContext()
  const { memberships } = useActiveTeam()
  const { data: children = [] } = useAllChildren()
  const { data: guardians = [] } = useGuardians()
  const { data: admins = [] } = useTeamAdmins()
  const setSuper = useSetSuperAdmin()
  const setAdminTeams = useSetAdminTeams()
  const setGuardians = useSetGuardianChildren()

  const currentTeams = admins.filter((a) => a.profile_id === profile.id).map((a) => a.team_id)
  const currentChildren = guardians.filter((g) => g.profile_id === profile.id).map((g) => g.child_id)
  const [isSuper, setIsSuper] = useState(profile.is_super_admin)
  const [teamIds, setTeamIds] = useState(currentTeams)
  const [childIds, setChildIds] = useState(currentChildren)
  const isSelf = profile.id === user?.id
  const busy = setSuper.isPending || setAdminTeams.isPending || setGuardians.isPending

  async function save() {
    try {
      if (isSuper !== profile.is_super_admin) await setSuper.mutateAsync({ profileId: profile.id, value: isSuper })
      const teams = diff(currentTeams, teamIds)
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
        {profile.full_name && <p className="text-[#666666] text-sm">{profile.email}</p>}
      </div>
      {!isSelf && (
        <Switch
          checked={isSuper}
          onChange={setIsSuper}
          label="Huvudadmin"
          className="justify-between bg-[#161616] border border-[#222222] rounded-xl px-4 py-3"
        />
      )}
      {!isSuper && (
        <MultiPicker
          label="Ekonomiansvarig i"
          options={memberships.map((m) => m.team)}
          selected={teamIds}
          onChange={setTeamIds}
        />
      )}
      <MultiPicker label="Förälder till" options={children} selected={childIds} onChange={setChildIds} />
      <Button className="w-full" onClick={save} loading={busy}>
        Spara
      </Button>
    </div>
  )
}

function InviteForm({ invite, onDone }: { invite?: Invite; onDone: () => void }) {
  const { memberships } = useActiveTeam()
  const { data: children = [] } = useAllChildren()
  const inviteUser = useInviteUser()
  const deleteInvite = useDeleteInvite()
  const openConfirm = useUIStore((s) => s.openConfirm)
  const [email, setEmail] = useState(invite?.email ?? '')
  const [teamIds, setTeamIds] = useState(invite?.admin_team_ids ?? [])
  const [childIds, setChildIds] = useState(invite?.child_ids ?? [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return toast.error('Ange en e-postadress')
    inviteUser.mutate(
      { email: email.trim(), childIds, adminTeamIds: teamIds },
      {
        onSuccess: (result) => {
          toast.success(result === 'added' ? 'Användaren är uppdaterad' : 'Inbjudan sparad')
          onDone()
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="px-4 pb-6 space-y-4">
      <Input
        label="E-postadress"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={!!invite}
        autoFocus={!invite}
        placeholder="namn@exempel.se"
      />
      <MultiPicker
        label="Ekonomiansvarig i"
        options={memberships.map((m) => m.team)}
        selected={teamIds}
        onChange={setTeamIds}
      />
      <MultiPicker label="Förälder till" options={children} selected={childIds} onChange={setChildIds} />
      <div className="flex gap-2 pt-2">
        {invite && (
          <Button
            type="button"
            variant="danger"
            aria-label="Ta bort inbjudan"
            onClick={() =>
              openConfirm('Ta bort inbjudan', `Inbjudan till ${invite.email} tas bort.`, () =>
                deleteInvite.mutate(invite.id, { onSuccess: onDone }),
              )
            }
          >
            <Trash2 size={18} />
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1"
          loading={inviteUser.isPending}
          disabled={!teamIds.length && !childIds.length}
        >
          {invite ? 'Spara' : 'Bjud in'}
        </Button>
      </div>
    </form>
  )
}

type Sheet = { type: 'user'; profile: Profile } | { type: 'invite'; invite?: Invite }

/** Alla användare – huvudadmin, ekonomiansvar och barn */
export function UsersTab() {
  const { memberships } = useActiveTeam()
  const { data: profiles, isLoading } = useProfiles()
  const { data: admins = [] } = useTeamAdmins()
  const { data: guardians = [] } = useGuardians()
  const { data: children = [] } = useAllChildren()
  const { data: invites = [] } = useInvites()
  const [sheet, setSheet] = useState<Sheet | null>(null)

  const teamNames = (ids: string[]) =>
    memberships.filter((m) => ids.includes(m.team_id)).map((m) => m.team.name).join(', ')
  const childNames = (ids: string[]) =>
    children.filter((c) => ids.includes(c.id)).map((c) => c.name).join(', ')

  function summary(adminTeamIds: string[], childIds: string[]) {
    return [
      adminTeamIds.length ? `Ekonomiansvarig: ${teamNames(adminTeamIds)}` : '',
      childNames(childIds),
    ].filter(Boolean).join(' · ')
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setSheet({ type: 'invite' })}>
          <UserPlus size={18} className="mr-1" /> Bjud in
        </Button>
        <CopySignupLink />
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : (
        <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
          {profiles?.map((p) => {
            const info = summary(
              admins.filter((a) => a.profile_id === p.id).map((a) => a.team_id),
              guardians.filter((g) => g.profile_id === p.id).map((g) => g.child_id),
            )
            return (
              <button
                key={p.id}
                onClick={() => setSheet({ type: 'user', profile: p })}
                className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-[#1A1A1A]"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-white text-sm font-medium truncate">{displayName(p)}</span>
                  <span className="block text-[#666666] text-xs truncate">{info || p.email}</span>
                </span>
                {p.is_super_admin && <Badge variant="accent">Huvudadmin</Badge>}
              </button>
            )
          })}
        </Card>
      )}

      {invites.length > 0 && (
        <>
          <h3 className="text-[#A0A0A0] text-xs font-semibold uppercase tracking-wider px-1 pt-2">
            Väntar på registrering
          </h3>
          <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
            {invites.map((inv) => (
              <button
                key={inv.id}
                onClick={() => setSheet({ type: 'invite', invite: inv })}
                className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-[#1A1A1A]"
              >
                <Mail size={16} className="text-[#666666] shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-white text-sm truncate">{inv.email}</span>
                  <span className="block text-[#666666] text-xs truncate">
                    {summary(inv.admin_team_ids, inv.child_ids)}
                  </span>
                </span>
              </button>
            ))}
          </Card>
        </>
      )}

      <BottomSheet
        isOpen={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet?.type === 'user' ? 'Användare' : sheet?.invite ? 'Inbjudan' : 'Bjud in'}
      >
        {sheet?.type === 'user' && (
          <UserForm key={sheet.profile.id} profile={sheet.profile} onDone={() => setSheet(null)} />
        )}
        {sheet?.type === 'invite' && (
          <InviteForm key={sheet.invite?.id ?? 'new'} invite={sheet.invite} onDone={() => setSheet(null)} />
        )}
      </BottomSheet>
    </div>
  )
}
