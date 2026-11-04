import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthContext } from '@/features/auth/components/AuthProvider'
import { useTeamStore } from '@/store/teamStore'
import type { Team, TeamMembership, TeamRole } from '@/types/database'

/** Lagen användaren har tillgång till – föräldrar via sina barn, huvudadmin alla */
export function useMemberships() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: queryKeys.memberships,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_teams')
      if (error) throw error
      return (data as (Team & { role: TeamRole })[]).map(
        ({ role, ...team }): TeamMembership => ({ team_id: team.id, role, team }),
      )
    },
  })
}

/** Det valda laget – faller tillbaka på första laget om det sparade inte längre finns */
export function useActiveTeam() {
  const { profile } = useAuthContext()
  const { data: memberships, isLoading } = useMemberships()
  const activeTeamId = useTeamStore((s) => s.activeTeamId)
  const membership =
    memberships?.find((m) => m.team_id === activeTeamId) ?? memberships?.[0] ?? null
  return {
    isLoading,
    memberships: memberships ?? [],
    team: membership?.team ?? null,
    teamId: membership?.team_id ?? '',
    role: membership?.role ?? null,
    isAdmin: membership?.role === 'admin',
    isSuperAdmin: !!profile?.is_super_admin,
  }
}

export function useCreateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.rpc('create_team', { p_name: name })
      if (error) throw error
      return data as string
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.memberships })
      toast.success('Laget är skapat')
    },
    onError: () => toast.error('Kunde inte skapa laget'),
  })
}

export function useUpdateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Omit<Team, 'id'>> & { id: string }) => {
      const { data, error } = await supabase.from('teams').update(patch).eq('id', id).select()
      if (error) throw error
      if (!data?.length) throw new Error('Ingen behörighet')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.memberships })
      toast.success('Sparat')
    },
    onError: () => toast.error('Kunde inte spara'),
  })
}
