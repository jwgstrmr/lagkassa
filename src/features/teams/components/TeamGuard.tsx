import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { FullScreenSpinner } from '@/features/auth/components/AuthGuard'
import { useActiveTeam } from '../hooks/useTeams'

/** Sidor som kräver ett lag – utan lag hamnar man på lagsidan (där huvudadmin kan skapa ett) */
export function TeamGuard({ children }: { children: ReactNode }) {
  const { isLoading, team } = useActiveTeam()
  if (isLoading) return <FullScreenSpinner />
  if (!team) return <Navigate to="/lag" replace />
  return <>{children}</>
}

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin } = useActiveTeam()
  if (!isAdmin) return <Navigate to="/hem" replace />
  return <>{children}</>
}

export function SuperAdminGuard({ children }: { children: ReactNode }) {
  const { isSuperAdmin } = useActiveTeam()
  if (!isSuperAdmin) return <Navigate to="/hem" replace />
  return <>{children}</>
}
