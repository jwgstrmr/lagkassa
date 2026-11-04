import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
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

  if (loading) return <FullScreenSpinner />
  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}
