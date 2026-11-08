import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { useAuthContext } from '@/features/auth/components/AuthProvider'
import { FullScreenSpinner } from '@/features/auth/components/AuthGuard'
import { useCreateTeam, useMemberships } from '@/features/teams/hooks/useTeams'
import { useTeamStore } from '@/store/teamStore'

/** Nytt konto som admin ännu inte kopplat till ett barn – barnets namn kan rättas här */
function WaitingForLink() {
  const { profile, refreshProfile } = useAuthContext()
  const saved = profile?.children_note ?? ''
  const [note, setNote] = useState(saved)
  const [saving, setSaving] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ children_note: note.trim() || null })
      .eq('id', profile.id)
    setSaving(false)
    if (error) return toast.error('Kunde inte spara')
    await refreshProfile()
    toast.success('Sparat')
  }

  return (
    <Card className="space-y-4">
      <div className="text-center">
        <p className="text-white font-medium">Ditt konto väntar på att kopplas till laget</p>
        <p className="text-[#A0A0A0] text-sm mt-1">
          Så fort ditt konto är kopplat till ditt barn kommer du in i appen.
        </p>
      </div>
      <form onSubmit={save} className="space-y-3">
        <Input
          label="Ditt barns namn"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          autoComplete="off"
        />
        {note.trim() !== saved && (
          <Button type="submit" className="w-full" loading={saving}>
            Spara
          </Button>
        )}
      </form>
    </Card>
  )
}

/** Välj lag – visas också för den som ännu inte är med i något lag */
export function TeamsPage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuthContext()
  const { data: memberships = [], isLoading } = useMemberships()
  const setActiveTeam = useTeamStore((s) => s.setActiveTeam)
  const createTeam = useCreateTeam()
  const [name, setName] = useState('')

  if (isLoading) return <FullScreenSpinner />
  // Inget att välja – t.ex. när ett väntande konto precis blivit kopplat
  if (memberships.length === 1 && !profile?.is_super_admin) return <Navigate to="/hem" replace />

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
                  <span className="block text-[#8A8A8A] text-xs">
                    {m.role === 'admin' ? 'Ekonomiansvarig' : 'Förälder'}
                  </span>
                </span>
                <ChevronRight size={16} className="text-[#8A8A8A]" />
              </button>
            ))}
          </Card>
        ) : profile?.is_super_admin ? (
          <Card className="text-center">
            <p className="text-white font-medium">Det finns inga lag än</p>
          </Card>
        ) : (
          <WaitingForLink />
        )}

        {profile?.is_super_admin && (
          <Card>
            <form onSubmit={create} className="space-y-3">
              <Input label="Nytt lag" value={name} onChange={(e) => setName(e.target.value)} />
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
