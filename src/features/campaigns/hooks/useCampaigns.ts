import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { assertRows, useTeamMutation } from '@/features/teams/hooks/useTeamMutation'
import type { Campaign, CampaignParticipant } from '@/types/database'

export function useCampaigns() {
  const { teamId } = useActiveTeam()
  return useQuery({
    queryKey: queryKeys.team.campaigns(teamId),
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('team_id', teamId)
        .order('start_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Campaign[]
    },
  })
}

export interface CampaignInput {
  id?: string
  name: string
  category_id: string | null
  amount_per_child_ore: number | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  /** Barnen som ska betala – tomt när händelsen saknar belopp per barn */
  participant_ids: string[]
}

/** Barnen som ska betala till lagets händelser – föräldrar får bara sina egna barn (RLS) */
export function useCampaignParticipants() {
  const { teamId } = useActiveTeam()
  return useQuery({
    queryKey: queryKeys.team.participants(teamId),
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_participants')
        .select('campaign_id, child_id, campaigns!inner(team_id)')
        .eq('campaigns.team_id', teamId)
      if (error) throw error
      return data.map(({ campaign_id, child_id }): CampaignParticipant => ({ campaign_id, child_id }))
    },
  })
}

async function setParticipants(campaignId: string, childIds: string[]) {
  let remove = supabase.from('campaign_participants').delete().eq('campaign_id', campaignId)
  if (childIds.length) remove = remove.not('child_id', 'in', `(${childIds.join(',')})`)
  const { error } = await remove
  if (error) throw error
  if (childIds.length) {
    const { error } = await supabase
      .from('campaign_participants')
      .upsert(
        childIds.map((child_id) => ({ campaign_id: campaignId, child_id })),
        { onConflict: 'campaign_id,child_id', ignoreDuplicates: true },
      )
    if (error) throw error
  }
}

export function useSaveCampaign() {
  return useTeamMutation(
    async ({ id, participant_ids, ...fields }: CampaignInput, teamId) => {
      let campaignId = id
      if (campaignId) {
        const { data, error } = await supabase.from('campaigns').update(fields).eq('id', campaignId).select()
        if (error) throw error
        assertRows(data)
      } else {
        const { data, error } = await supabase
          .from('campaigns')
          .insert({ ...fields, team_id: teamId })
          .select('id')
          .single()
        if (error) throw error
        campaignId = data.id as string
      }
      await setParticipants(campaignId, participant_ids)
      return campaignId
    },
    {
      invalidate: (t) => [
        queryKeys.team.campaigns(t),
        queryKeys.team.participants(t),
        queryKeys.team.transactions(t),
      ],
      success: 'Sparat',
    },
  )
}

export function useDeleteCampaign() {
  return useTeamMutation(
    async (id: string) => {
      const { data, error } = await supabase.from('campaigns').delete().eq('id', id).select()
      if (error) throw error
      assertRows(data)
    },
    {
      invalidate: (t) => [queryKeys.team.campaigns(t), queryKeys.team.participants(t), queryKeys.team.transactions(t)],
      success: 'Händelsen är borttagen',
      error: 'Kunde inte ta bort',
    },
  )
}
