export const queryKeys = {
  memberships: ['memberships'] as const,
  // Barn, föräldrar och användare går över lagen
  children: ['children'] as const,
  guardians: ['guardians'] as const,
  profiles: ['profiles'] as const,
  teamAdmins: ['team-admins'] as const,
  invites: ['invites'] as const,
  team: {
    all: (teamId: string) => ['team', teamId] as const,
    categories: (teamId: string) => ['team', teamId, 'categories'] as const,
    transactions: (teamId: string) => ['team', teamId, 'transactions'] as const,
    campaigns: (teamId: string) => ['team', teamId, 'campaigns'] as const,
    participants: (teamId: string) => ['team', teamId, 'participants'] as const,
  },
}
