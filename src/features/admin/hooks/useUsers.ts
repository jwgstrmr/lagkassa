import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useTeamMutation } from '@/features/teams/hooks/useTeamMutation'
import { useAllChildren, useLiveGuardians } from '@/features/children/hooks/useChildren'
import type { Profile, TeamAdmin } from '@/types/database'

/** Huvudadmin ser alla, ekonomiansvariga föräldrarna till sina barn (RLS) */
export function useProfiles() {
  const { isAdmin, isSuperAdmin } = useActiveTeam()
  return useQuery({
    queryKey: queryKeys.profiles,
    enabled: isAdmin || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*')
      if (error) throw error
      return (data as Profile[]).sort((a, b) =>
        (a.full_name || a.email).localeCompare(b.full_name || b.email, 'sv'),
      )
    },
  })
}

export function useTeamAdmins() {
  const { isSuperAdmin } = useActiveTeam()
  return useQuery({
    queryKey: queryKeys.teamAdmins,
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from('team_members').select('team_id, profile_id')
      if (error) throw error
      return data as TeamAdmin[]
    },
  })
}

/**
 * Konton som inte kommer in i appen: varken huvudadmin, ekonomiansvarig eller förälder till ett
 * barn som är med i ett lag (som is_team_member). ready är false tills allt det bygger på är hämtat –
 * innan dess går det inte att säga vem som är kopplad.
 */
export function usePendingProfiles() {
  const { data: profiles } = useProfiles()
  const { data: admins } = useTeamAdmins()
  const { data: guardians } = useLiveGuardians()
  const { data: children } = useAllChildren()
  if (!profiles || !admins || !guardians || !children) return { data: [] as Profile[], ready: false }

  const inATeam = new Set(children.filter((c) => c.team_ids.length).map((c) => c.id))
  const pending = profiles.filter(
    (p) =>
      !p.is_super_admin &&
      !admins.some((a) => a.profile_id === p.id) &&
      !guardians.some((g) => g.profile_id === p.id && inATeam.has(g.child_id)),
  )
  return { data: pending, ready: true }
}

const userKeys = () => [queryKeys.profiles, queryKeys.teamAdmins, queryKeys.guardians, queryKeys.memberships]

/**
 * Kontot tas bort helt – kopplingar till barn och lag följer med, bokförda poster står kvar.
 * Försvinner ur listan direkt, så att ett nytt tryck inte hinner öppna det innan listan lästs om.
 */
export function useDeleteUser() {
  const qc = useQueryClient()
  return useTeamMutation(
    async (profileId: string) => {
      const { error } = await supabase.rpc('delete_user', { p_profile_id: profileId })
      if (error) throw error
      qc.setQueryData<Profile[]>(queryKeys.profiles, (old) => old?.filter((p) => p.id !== profileId))
    },
    { invalidate: userKeys, success: 'Kontot är borttaget', error: 'Kunde inte ta bort kontot' },
  )
}

export function useSetSuperAdmin() {
  return useTeamMutation(
    async ({ profileId, value }: { profileId: string; value: boolean }) => {
      const { error } = await supabase.rpc('set_super_admin', { p_profile_id: profileId, p_value: value })
      if (error) throw error
    },
    { invalidate: userKeys },
  )
}

/** Lägger till och tar bort lag där användaren är ekonomiansvarig */
export function useSetAdminTeams() {
  return useTeamMutation(
    async ({ profileId, add, remove }: { profileId: string; add: string[]; remove: string[] }) => {
      if (remove.length) {
        const { error } = await supabase
          .from('team_members')
          .delete()
          .eq('profile_id', profileId)
          .in('team_id', remove)
        if (error) throw error
      }
      if (add.length) {
        const { error } = await supabase
          .from('team_members')
          .insert(add.map((team_id) => ({ team_id, profile_id: profileId, role: 'admin' })))
        if (error) throw error
      }
    },
    { invalidate: userKeys },
  )
}
