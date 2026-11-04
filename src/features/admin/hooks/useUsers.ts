import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useTeamMutation } from '@/features/teams/hooks/useTeamMutation'
import type { Invite, Profile, TeamAdmin } from '@/types/database'

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
  const { isAdmin, isSuperAdmin } = useActiveTeam()
  return useQuery({
    queryKey: queryKeys.teamAdmins,
    enabled: isAdmin || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from('team_members').select('team_id, profile_id')
      if (error) throw error
      return data as TeamAdmin[]
    },
  })
}

export function useInvites() {
  const { isAdmin, isSuperAdmin } = useActiveTeam()
  return useQuery({
    queryKey: queryKeys.invites,
    enabled: isAdmin || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from('invites').select('*').order('email')
      if (error) throw error
      return data as Invite[]
    },
  })
}

const userKeys = () => [
  queryKeys.profiles,
  queryKeys.teamAdmins,
  queryKeys.invites,
  queryKeys.guardians,
  queryKeys.memberships,
]

/**
 * Kopplar barn (och för huvudadmin: lag som ekonomiansvarig) till en e-postadress.
 * Utan konto sparas inbjudan – en ekonomiansvarig ersätter bara sina egna barn i den.
 */
export function useInviteUser() {
  return useTeamMutation(
    async ({ email, childIds, adminTeamIds = [] }: { email: string; childIds: string[]; adminTeamIds?: string[] }) => {
      const { data, error } = await supabase.rpc('invite_user', {
        p_email: email,
        p_child_ids: childIds,
        p_admin_team_ids: adminTeamIds,
      })
      if (error) throw error
      return data as 'added' | 'invited'
    },
    { invalidate: userKeys, error: 'Kunde inte bjuda in' },
  )
}

export function useDeleteInvite() {
  return useTeamMutation(
    async (id: string) => {
      const { error } = await supabase.from('invites').delete().eq('id', id)
      if (error) throw error
    },
    { invalidate: userKeys, success: 'Inbjudan borttagen', error: 'Kunde inte ta bort' },
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
