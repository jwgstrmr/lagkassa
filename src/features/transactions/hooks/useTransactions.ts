import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { assertRows, useTeamMutation } from '@/features/teams/hooks/useTeamMutation'
import type { Category, Transaction, TransactionKind } from '@/types/database'

export function useCategories() {
  const { teamId } = useActiveTeam()
  return useQuery({
    queryKey: queryKeys.team.categories(teamId),
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('team_id', teamId)
        .order('sort_order')
        .order('name')
      if (error) throw error
      return data as Category[]
    },
  })
}

export function useSaveCategory() {
  return useTeamMutation(
    async (
      { id, ...fields }: { id?: string; name: string; color: string; sort_order?: number },
      teamId,
    ) => {
      if (id) {
        const { data, error } = await supabase.from('categories').update(fields).eq('id', id).select()
        if (error) throw error
        assertRows(data)
      } else {
        const { error } = await supabase.from('categories').insert({ ...fields, team_id: teamId })
        if (error) throw error
      }
    },
    { invalidate: (t) => [queryKeys.team.categories(t)], success: 'Sparat' },
  )
}

export function useDeleteCategory() {
  return useTeamMutation(
    async (id: string) => {
      const { data, error } = await supabase.from('categories').delete().eq('id', id).select()
      if (error) throw error
      assertRows(data)
    },
    {
      invalidate: (t) => [queryKeys.team.categories(t), queryKeys.team.campaigns(t), queryKeys.team.transactions(t)],
      success: 'Kategorin är borttagen',
      error: 'Kunde inte ta bort',
    },
  )
}

/** Alla lagets transaktioner, senaste först – ett lag har inte fler än att de ryms i en hämtning */
export function useTransactions() {
  const { teamId } = useActiveTeam()
  return useQuery({
    queryKey: queryKeys.team.transactions(teamId),
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('team_id', teamId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Transaction[]
    },
  })
}

export interface TransactionInput {
  id?: string
  date: string
  kind: TransactionKind
  amount_ore: number
  category_id: string | null
  campaign_id: string | null
  child_id: string | null
}

export function useSaveTransaction() {
  return useTeamMutation(
    async ({ id, ...fields }: TransactionInput, teamId) => {
      if (id) {
        const { data, error } = await supabase.from('transactions').update(fields).eq('id', id).select()
        if (error) throw error
        assertRows(data)
      } else {
        const { error } = await supabase.from('transactions').insert({ ...fields, team_id: teamId })
        if (error) throw error
      }
    },
    { invalidate: (t) => [queryKeys.team.transactions(t)], success: 'Sparat' },
  )
}

/** Flera nya transaktioner i ett anrop – t.ex. samma belopp för flera barn i en händelse */
export function useAddTransactions() {
  return useTeamMutation(
    async (rows: Omit<TransactionInput, 'id'>[], teamId) => {
      const { error } = await supabase.from('transactions').insert(rows.map((r) => ({ ...r, team_id: teamId })))
      if (error) throw error
    },
    { invalidate: (t) => [queryKeys.team.transactions(t)], success: 'Sparat' },
  )
}

export function useDeleteTransaction() {
  return useTeamMutation(
    async (id: string) => {
      const { data, error } = await supabase.from('transactions').delete().eq('id', id).select()
      if (error) throw error
      assertRows(data)
    },
    { invalidate: (t) => [queryKeys.team.transactions(t)], success: 'Borttagen', error: 'Kunde inte ta bort' },
  )
}
