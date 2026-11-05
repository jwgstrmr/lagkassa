import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { useTeamStore } from '@/store/teamStore'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { assertRows, useTeamMutation } from '@/features/teams/hooks/useTeamMutation'
import type { Campaign, CampaignParticipant, CampaignType } from '@/types/database'

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

/**
 * En delad länk kan gå till en händelse i ett annat av ens lag – då byts laget dit.
 * Sant medan det pågår, så att sidan inte hinner visa att händelsen saknas.
 */
export function useSwitchToCampaignTeam(campaignId: string, missing: boolean): boolean {
  const { teamId, memberships } = useActiveTeam()
  const setActiveTeam = useTeamStore((s) => s.setActiveTeam)
  const { data: owner, isLoading } = useQuery({
    queryKey: queryKeys.campaignTeam(campaignId),
    enabled: missing && !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase.from('campaigns').select('team_id').eq('id', campaignId).maybeSingle()
      // En trasig länk är inget att larma om – sidan visar att händelsen inte finns
      if (error) return null
      return (data?.team_id as string | undefined) ?? null
    },
  })
  const other = missing && !!owner && owner !== teamId && memberships.some((m) => m.team_id === owner)

  useEffect(() => {
    if (other && owner) setActiveTeam(owner)
  }, [other, owner, setActiveTeam])

  return missing && (isLoading || other)
}

export interface CampaignInput {
  id?: string
  name: string
  type: CampaignType
  amount_per_child_ore: number | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  /** Barnen som ska betala in – tomt för typen Övrigt */
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

export interface OpenDue {
  team_id: string
  team_name: string
  campaign_id: string
  campaign_name: string
  child_id: string
  child_name: string
  expected_ore: number | null
  paid_ore: number
}

/** Barn som inte betalat klart, i alla lag där man är ekonomiansvarig */
export function useOpenDues() {
  const { isAdmin } = useActiveTeam()
  return useQuery({
    queryKey: queryKeys.openDues,
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('open_dues')
      if (error) throw error
      return data as OpenDue[]
    },
  })
}
