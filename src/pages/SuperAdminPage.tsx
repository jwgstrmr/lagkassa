import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Tabs } from '@/components/ui/Tabs'
import { AllTeamsTab } from '@/features/admin/components/AllTeamsTab'
import { RegistryTab } from '@/features/admin/components/RegistryTab'
import { UsersTab } from '@/features/admin/components/UsersTab'

type Tab = 'teams' | 'children' | 'users'

const TABS: { value: Tab; label: string }[] = [
  { value: 'teams', label: 'Lag' },
  { value: 'children', label: 'Barn' },
  { value: 'users', label: 'Användare' },
]

/** Huvudadmin – alla lag, barnregistret och användarna */
export function SuperAdminPage() {
  const [tab, setTab] = useState<Tab>('teams')
  return (
    <div>
      <TopBar title="Huvudadmin" showBack />
      <Tabs value={tab} tabs={TABS} onChange={setTab} />
      {tab === 'teams' && <AllTeamsTab />}
      {tab === 'children' && <RegistryTab />}
      {tab === 'users' && <UsersTab />}
    </div>
  )
}
