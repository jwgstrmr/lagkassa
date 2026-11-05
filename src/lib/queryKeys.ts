export const queryKeys = {
  memberships: ['memberships'] as const,
  // Barn, föräldrar och användare går över lagen
  children: ['children'] as const,
  guardians: ['guardians'] as const,
  profiles: ['profiles'] as const,
  teamAdmins: ['team-admins'] as const,
  invites: ['invites'] as const,
  // Saknade inbetalningar i alla lag man är ekonomiansvarig för
  openDues: ['open-dues'] as const,
  // Vilket lag en händelse hör till – för länkar till ett annat av ens lag
  campaignTeam: (campaignId: string) => ['campaign-team', campaignId] as const,
  team: {
    all: (teamId: string) => ['team', teamId] as const,
    transactions: (teamId: string) => ['team', teamId, 'transactions'] as const,
    campaigns: (teamId: string) => ['team', teamId, 'campaigns'] as const,
    participants: (teamId: string) => ['team', teamId, 'participants'] as const,
  },
}
