import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { useAuthContext } from '@/features/auth/components/AuthProvider'
import { returnTo } from '@/features/auth/components/AuthGuard'
import { FormMessage } from '@/features/auth/components/FormMessage'

export function SignupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthContext()
  const next = returnTo(location.state)
  const [fullName, setFullName] = useState('')
  const [childrenNote, setChildrenNote] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmSent, setConfirmSent] = useState(false)

  if (user) return <Navigate to={next} replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Lösenordet måste vara minst 8 tecken')

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, children_note: childrenNote.trim() } },
    })
    setLoading(false)

    if (error) {
      setError(error.message === 'User already registered'
        ? 'Den e-postadressen är redan registrerad'
        : 'Det gick inte att skapa konto. Försök igen.')
    } else if (!data.session) {
      setConfirmSent(true)
    } else {
      navigate(next, { replace: true })
    }
  }

  return (
    <AuthLayout>
      {confirmSent ? (
        <FormMessage tone="success">Kolla din e-post och bekräfta kontot, logga sedan in.</FormMessage>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <FormMessage tone="error">{error}</FormMessage>}
          <Input
            label="Namn"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />
          <Input
            label="Ditt barns namn"
            value={childrenNote}
            onChange={(e) => setChildrenNote(e.target.value)}
            maxLength={200}
            autoComplete="off"
          />
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
            autoComplete="new-password"
            placeholder="Minst 8 tecken"
          />
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Skapa konto
          </Button>
        </form>
      )}

      <p className="text-center text-[#A0A0A0] text-sm mt-6">
        Har du redan konto?{' '}
        <Link to="/login" state={location.state} className="text-[#FFD700] font-medium">
          Logga in
        </Link>
      </p>
    </AuthLayout>
  )
}
