import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { pluralize } from '@/lib/utils'
import { useTeamStore } from '@/store/teamStore'
import { useActiveTeam, useCreateTeam } from '@/features/teams/hooks/useTeams'
import { useAllChildren } from '@/features/children/hooks/useChildren'
import { useProfiles, useTeamAdmins } from '../hooks/useUsers'
import { displayName } from '../lib/diff'

/** Alla lag – tryck på ett lag för att administrera det */
export function AllTeamsTab() {
  const navigate = useNavigate()
  const { memberships } = useActiveTeam()
  const { data: children = [] } = useAllChildren()
  const { data: admins = [] } = useTeamAdmins()
  const { data: profiles = [] } = useProfiles()
  const setActiveTeam = useTeamStore((s) => s.setActiveTeam)
  const createTeam = useCreateTeam()
  const [name, setName] = useState('')

  function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    createTeam.mutate(name.trim(), { onSuccess: () => setName('') })
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <form onSubmit={create} className="flex gap-2 items-end">
          <div className="flex-1">
            <Input label="Nytt lag" value={name} onChange={(e) => setName(e.target.value)} placeholder="Flickor 2018" />
          </div>
          <Button type="submit" loading={createTeam.isPending} disabled={!name.trim()} className="h-[50px]">
            Skapa
          </Button>
        </form>
      </Card>

      <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
        {memberships.map(({ team }) => {
          const players = children.filter((c) => c.team_ids.includes(team.id)).length
          const adminNames = admins
            .filter((a) => a.team_id === team.id)
            .map((a) => displayName(profiles.find((p) => p.id === a.profile_id)))
            .join(', ')
          return (
            <button
              key={team.id}
              onClick={() => {
                setActiveTeam(team.id)
                navigate('/admin')
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-[#1A1A1A]"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-white text-sm font-medium truncate">{team.name}</span>
                <span className="block text-[#666666] text-xs truncate">
                  {pluralize(players, 'spelare', 'spelare')}
                  {adminNames && ` · ${adminNames}`}
                </span>
              </span>
              <ChevronRight size={16} className="text-[#666666] shrink-0" />
            </button>
          )
        })}
      </Card>
    </div>
  )
}
