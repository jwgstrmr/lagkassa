import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { FullScreenSpinner } from '@/features/auth/components/AuthGuard'
import { FormMessage } from '@/features/auth/components/FormMessage'
import { useAuthContext } from '@/features/auth/components/AuthProvider'

/** Länken i återställningsmejlet loggar in – här väljs det nya lösenordet */
export function NewPasswordPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuthContext()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (authLoading) return <FullScreenSpinner />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Lösenordet måste vara minst 8 tecken')
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setError('Det gick inte att byta lösenord. Begär en ny länk och försök igen.')
    toast.success('Lösenordet är bytt')
    navigate('/hem', { replace: true })
  }

  return (
    <AuthLayout>
      {user ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <FormMessage tone="error">{error}</FormMessage>}
          <Input
            label="Nytt lösenord"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Minst 8 tecken"
            autoFocus
          />
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Spara lösenord
          </Button>
        </form>
      ) : (
        <>
          <FormMessage tone="error">Länken har gått ut eller redan använts.</FormMessage>
          <p className="text-center text-[#A0A0A0] text-sm mt-6">
            <Link to="/glomt-losenord" className="text-[#FFD700] font-medium">
              Skicka en ny länk
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  )
}
