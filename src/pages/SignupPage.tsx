import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { useAuthContext } from '@/features/auth/components/AuthProvider'

export function SignupPage() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user) return <Navigate to="/hem" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Lösenordet måste vara minst 8 tecken')

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    setLoading(false)

    if (error) {
      setError(error.message === 'User already registered'
        ? 'Den e-postadressen är redan registrerad'
        : 'Det gick inte att skapa konto. Försök igen.')
    } else if (!data.session) {
      setError('Kolla din e-post och bekräfta kontot, logga sedan in.')
    } else {
      navigate('/hem')
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl">
            {error}
          </div>
        )}
        <Input
          label="Namn"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
          placeholder="Anna Svensson"
        />
        <Input
          label="E-postadress"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="din@email.se"
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

      <p className="text-center text-[#A0A0A0] text-sm mt-6">
        Har du redan konto?{' '}
        <Link to="/login" className="text-[#FFD700] font-medium">
          Logga in
        </Link>
      </p>
    </AuthLayout>
  )
}
