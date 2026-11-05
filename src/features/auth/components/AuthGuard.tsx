import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from './AuthProvider'

export function FullScreenSpinner() {
  return (
    <div className="min-h-dvh bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthContext()
  const location = useLocation()

  if (loading) return <FullScreenSpinner />
  // Efter inloggningen går man vidare dit länken pekade, t.ex. en delad händelse
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />

  return <>{children}</>
}

/** Dit man ska efter inloggning eller registrering */
// eslint-disable-next-line react-refresh/only-export-components
export function returnTo(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from
  return typeof from === 'string' && from.startsWith('/') ? from : '/hem'
}
