import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { useAuthContext } from '@/features/auth/components/AuthProvider'
import { FullScreenSpinner } from '@/features/auth/components/AuthGuard'
import { useCreateTeam, useMemberships } from '@/features/teams/hooks/useTeams'
import { useTeamStore } from '@/store/teamStore'

/** Välj lag – visas också för den som ännu inte är med i något lag */
export function TeamsPage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuthContext()
  const { data: memberships = [], isLoading } = useMemberships()
  const setActiveTeam = useTeamStore((s) => s.setActiveTeam)
  const createTeam = useCreateTeam()
  const [name, setName] = useState('')

  if (isLoading) return <FullScreenSpinner />

  function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    createTeam.mutate(name.trim(), {
      onSuccess: (id) => {
        setActiveTeam(id)
        navigate('/hem', { replace: true })
      },
    })
  }

  return (
    <AuthLayout>
      <div className="space-y-4">
        {memberships.length > 0 ? (
          <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
            {memberships.map((m) => (
              <button
                key={m.team_id}
                onClick={() => {
                  setActiveTeam(m.team_id)
                  navigate('/hem', { replace: true })
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-[#1A1A1A]"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-white font-medium truncate">{m.team.name}</span>
                  <span className="block text-[#666666] text-xs">
                    {m.role === 'admin' ? 'Ekonomiansvarig' : 'Förälder'}
                  </span>
                </span>
                <ChevronRight size={16} className="text-[#666666]" />
              </button>
            ))}
          </Card>
        ) : (
          <Card className="text-center">
            <p className="text-white font-medium">Du är inte med i något lag än</p>
            <p className="text-[#A0A0A0] text-sm mt-1">
              Lagets ekonomiansvarig kan bjuda in {profile?.email ?? 'dig'}.
            </p>
          </Card>
        )}

        {profile?.is_super_admin && (
          <Card>
            <form onSubmit={create} className="space-y-3">
              <Input label="Nytt lag" value={name} onChange={(e) => setName(e.target.value)} placeholder="Flickor 2017" />
              <Button type="submit" className="w-full" loading={createTeam.isPending} disabled={!name.trim()}>
                Skapa lag
              </Button>
            </form>
          </Card>
        )}

        <button
          onClick={signOut}
          className="flex items-center justify-center gap-2 w-full py-3 text-[#A0A0A0] text-sm"
        >
          <LogOut size={16} /> Logga ut
        </button>
      </div>
    </AuthLayout>
  )
}
