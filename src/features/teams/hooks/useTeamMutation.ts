import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { queryKeys } from '@/lib/queryKeys'
import { useActiveTeam } from './useTeams'

interface Options {
  /** Nycklar som ska läsas om när ändringen gått igenom */
  invalidate: (teamId: string) => QueryKey[]
  success?: string
  error?: string
}

const NO_ACCESS = 'Ingen behörighet'

/** Begriplig förklaring till de vanligaste felen – övriga syns bara i konsolen */
function reason(err: Error): string | null {
  const msg = err.message ?? ''
  if (!navigator.onLine || /failed to fetch|network/i.test(msg)) return 'ingen internetanslutning'
  if (msg === NO_ACCESS || /row-level security|permission denied|not allowed/i.test(msg)) return 'du saknar behörighet'
  return null
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
      const why = reason(err)
      toast.error(why ? `${error} – ${why}` : error)
    },
    onSettled: () => {
      for (const key of invalidate(teamId)) qc.invalidateQueries({ queryKey: key })
      // Nästan allt kan ändra vem som saknar inbetalningar
      qc.invalidateQueries({ queryKey: queryKeys.openDues })
    },
  })
}

/** RLS nekar utan fel – en uppdatering som inte träffar någon rad saknar behörighet */
export function assertRows<T>(data: T[] | null): T[] {
  if (!data?.length) throw new Error(NO_ACCESS)
  return data
}
