export type TeamRole = 'admin' | 'parent'
export type TransactionKind = 'income' | 'expense'

export interface Profile {
  id: string
  full_name: string | null
  email: string
  /** Ser och administrerar alla lag */
  is_super_admin: boolean
  created_at: string
}

export interface Team {
  id: string
  name: string
  opening_balance_ore: number
  opening_date: string | null
  created_at: string
}

export interface TeamMembership {
  team_id: string
  role: TeamRole
  team: Team
}

/** Ekonomiansvarig i ett lag */
export interface TeamAdmin {
  team_id: string
  profile_id: string
}

/** Barn att koppla och lag att bli ekonomiansvarig i när e-postadressen registreras */
export interface Invite {
  id: string
  email: string
  child_ids: string[]
  admin_team_ids: string[]
  created_at: string
}

export interface Child {
  id: string
  name: string
  deleted_at: string | null
  created_at: string
  /** Lagen barnet är med i – bara de man har behörighet att se */
  team_ids: string[]
}

export interface ChildGuardian {
  child_id: string
  profile_id: string
}

/**
 * Försäljning – barnen betalar in det de sålt för. Avgift – fast belopp per barn.
 * Jobb – barnen jobbar och laget får en ersättning per barn. Övrigt – ingen uppföljning
 */
export type CampaignType = 'sale' | 'fee' | 'job' | 'other'

export interface Campaign {
  id: string
  team_id: string
  name: string
  type: CampaignType
  /** Avgift: vad varje barn ska betala. Försäljning: valfritt minimum. Jobb: valfri ersättning per barn */
  amount_per_child_ore: number | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
}

/** Barn som ska betala till en händelse */
export interface CampaignParticipant {
  campaign_id: string
  child_id: string
}

export interface Transaction {
  id: string
  team_id: string
  date: string
  kind: TransactionKind
  amount_ore: number
  campaign_id: string | null
  /** Barnet en intäkt eller utgift i en händelse gäller */
  child_id: string | null
  /** Postens namn – valfritt i en händelse, där händelsen och barnet säger det mesta */
  description: string | null
  created_by: string | null
  created_at: string
}
