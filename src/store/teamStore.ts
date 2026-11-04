import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TeamStore {
  activeTeamId: string | null
  setActiveTeam: (id: string | null) => void
}

export const useTeamStore = create<TeamStore>()(
  persist(
    (set) => ({
      activeTeamId: null,
      setActiveTeam: (id) => set({ activeTeamId: id }),
    }),
    { name: 'lagkassa-team' },
  ),
)
