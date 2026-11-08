import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { Tabs } from '@/components/ui/Tabs'
import { AllTeamsTab } from '@/features/admin/components/AllTeamsTab'
import { RegistryTab } from '@/features/admin/components/RegistryTab'
import { UsersTab } from '@/features/admin/components/UsersTab'

type Tab = 'teams' | 'children' | 'users'

const TABS: { value: Tab; label: string }[] = [
  { value: 'teams', label: 'Lag' },
  { value: 'children', label: 'Spelare' },
  { value: 'users', label: 'Användare' },
]

/** Huvudadmin – lagen, spelarregistret och användarna. Allt det här sköts här, inte per lag */
export function SuperAdminPage() {
  const navigate = useNavigate()
  const { pathname, state } = useLocation()
  // Profilen skickar hit med fliken Användare när konton väntar på att kopplas
  const saved = state as { tab?: Tab; teamId?: string | null } | null
  const [tab, setTab] = useState<Tab>(saved?.tab ?? 'teams')
  // Samma lag i Spelare och Användare när man byter flik
  const [teamId, setTeamId] = useState<string | null>(saved?.teamId ?? null)

  // Flik och filter sparas i historiken – tillbaka från profilen eller efter omladdning hamnar man där man var
  useEffect(() => {
    navigate(pathname, { replace: true, state: { tab, teamId } })
  }, [navigate, pathname, tab, teamId])

  return (
    <div>
      <TopBar title="Huvudadmin" showBack />
      <Tabs value={tab} tabs={TABS} onChange={setTab} />
      {tab === 'teams' && <AllTeamsTab />}
      {tab === 'children' && <RegistryTab teamId={teamId} onTeamChange={setTeamId} />}
      {tab === 'users' && <UsersTab teamId={teamId} onTeamChange={setTeamId} />}
    </div>
  )
}
