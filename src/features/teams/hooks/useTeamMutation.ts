import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useActiveTeam } from './useTeams'

interface Options {
  /** Nycklar som ska läsas om när ändringen gått igenom */
  invalidate: (teamId: string) => QueryKey[]
  success?: string
  error?: string
}

/** Skrivning inom det aktiva laget – läser om berörd data och visar toast */
export function useTeamMutation<TVars, TResult = unknown>(
  fn: (vars: TVars, teamId: string) => Promise<TResult>,
  { invalidate, success, error = 'Kunde inte spara' }: Options,
) {
  const qc = useQueryClient()
  const { teamId } = useActiveTeam()
  return useMutation({
    mutationFn: (vars: TVars) => fn(vars, teamId),
    onSuccess: () => {
      // Samma text ersätter förra toasten – flera sparningar i följd ger en
      if (success) toast.success(success, { id: success })
    },
    onError: (err) => {
      console.error(err)
      toast.error(err.message ? `${error}: ${err.message}` : error)
    },
    onSettled: () => {
      for (const key of invalidate(teamId)) qc.invalidateQueries({ queryKey: key })
    },
  })
}

/** RLS nekar utan fel – en uppdatering som inte träffar någon rad saknar behörighet */
export function assertRows<T>(data: T[] | null): T[] {
  if (!data?.length) throw new Error('Ingen behörighet')
  return data
}
