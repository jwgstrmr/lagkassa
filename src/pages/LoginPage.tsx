import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { useAuthContext } from '@/features/auth/components/AuthProvider'
import { returnTo } from '@/features/auth/components/AuthGuard'
import { FormMessage } from '@/features/auth/components/FormMessage'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthContext()
  const next = returnTo(location.state)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user) return <Navigate to={next} replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError('Felaktig e-postadress eller lösenord')
    else navigate(next, { replace: true })
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <Input
          label="E-postadress"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="Lösenord"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
        <div className="text-right -mt-2">
          <Link to="/glomt-losenord" className="text-[#A0A0A0] text-sm">
            Glömt lösenord?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Logga in
        </Button>
      </form>

      <p className="text-center text-[#A0A0A0] text-sm mt-6">
        Inget konto?{' '}
        <Link to="/registrera" state={location.state} className="text-[#FFD700] font-medium">
          Registrera dig
        </Link>
      </p>
    </AuthLayout>
  )
}
