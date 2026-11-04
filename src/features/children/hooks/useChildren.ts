import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthContext } from '@/features/auth/components/AuthProvider'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { assertRows, useTeamMutation } from '@/features/teams/hooks/useTeamMutation'
import type { Child, ChildGuardian } from '@/types/database'

/**
 * Alla barn användaren får se, med lagen de är med i. Huvudadmin ser alla,
 * ekonomiansvariga barnen i sina lag och föräldrar sina egna (RLS).
 */
export function useAllChildren() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: queryKeys.children,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, name, deleted_at, created_at, teams:team_children(team_id)')
        .is('deleted_at', null)
        .order('name')
      if (error) throw error
      return (data as (Omit<Child, 'team_ids'> & { teams: { team_id: string }[] })[]).map(
        ({ teams, ...c }): Child => ({ ...c, team_ids: teams.map((t) => t.team_id) }),
      )
    },
  })
}

/** Barnen i det aktiva laget */
export function useChildren() {
  const { teamId } = useActiveTeam()
  const query = useAllChildren()
  return { ...query, data: query.data?.filter((c) => c.team_ids.includes(teamId)) }
}

export function useGuardians() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: queryKeys.guardians,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('child_guardians').select('child_id, profile_id')
      if (error) throw error
      return data as ChildGuardian[]
    },
  })
}

/** Inloggad användares barn i det aktiva laget – även admin kan vara förälder */
export function useMyChildren() {
  const { user } = useAuthContext()
  const { data: children = [], isLoading } = useChildren()
  const { data: guardians = [] } = useGuardians()
  const mine = children.filter((c) =>
    guardians.some((g) => g.child_id === c.id && g.profile_id === user?.id),
  )
  return { data: mine, isLoading }
}

// Föräldrar får tillgång till lag via barnen, så lagen kan ändras när barnen gör det
const childKeys = () => [queryKeys.children, queryKeys.guardians, queryKeys.memberships]

/** Nytt barn direkt i ett eller flera lag */
export function useCreateChild() {
  return useTeamMutation(
    async ({ name, teamIds }: { name: string; teamIds: string[] }) => {
      const { data, error } = await supabase.rpc('create_child', { p_name: name, p_team_ids: teamIds })
      if (error) throw error
      return data as string
    },
    { invalidate: childKeys, success: 'Barnet är tillagt' },
  )
}

export function useRenameChild() {
  return useTeamMutation(
    async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase.from('children').update({ name }).eq('id', id).select()
      if (error) throw error
      assertRows(data)
    },
    { invalidate: childKeys, success: 'Sparat' },
  )
}

export function useDeleteChild() {
  return useTeamMutation(
    async (id: string) => {
      const { data, error } = await supabase
        .from('children')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
      if (error) throw error
      assertRows(data)
    },
    { invalidate: childKeys, success: 'Barnet är borttaget', error: 'Kunde inte ta bort' },
  )
}

/** Lägger till och tar bort barnet ur lag */
export function useSetChildTeams() {
  return useTeamMutation(
    async ({ childId, add, remove }: { childId: string; add: string[]; remove: string[] }) => {
      if (remove.length) {
        const { error } = await supabase
          .from('team_children')
          .delete()
          .eq('child_id', childId)
          .in('team_id', remove)
        if (error) throw error
      }
      if (add.length) {
        const { error } = await supabase
          .from('team_children')
          .insert(add.map((team_id) => ({ team_id, child_id: childId })))
        if (error) throw error
      }
    },
    { invalidate: childKeys, success: 'Sparat' },
  )
}

/** Lägger till och tar bort vilka barn en förälder är kopplad till */
export function useSetGuardianChildren() {
  return useTeamMutation(
    async ({ profileId, add, remove }: { profileId: string; add: string[]; remove: string[] }) => {
      if (remove.length) {
        const { error } = await supabase
          .from('child_guardians')
          .delete()
          .eq('profile_id', profileId)
          .in('child_id', remove)
        if (error) throw error
      }
      if (add.length) {
        const { error } = await supabase
          .from('child_guardians')
          .insert(add.map((child_id) => ({ child_id, profile_id: profileId })))
        if (error) throw error
      }
    },
    { invalidate: childKeys, success: 'Sparat' },
  )
}
