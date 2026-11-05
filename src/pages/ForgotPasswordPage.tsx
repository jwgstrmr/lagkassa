import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { FormMessage } from '@/features/auth/components/FormMessage'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nytt-losenord`,
    })
    setLoading(false)
    if (error) setError('Det gick inte att skicka mejlet. Försök igen om en stund.')
    else setSent(true)
  }

  return (
    <AuthLayout>
      {sent ? (
        <FormMessage tone="success">
          Om det finns ett konto för {email.trim()} har vi skickat en länk dit. Följ länken för att välja ett nytt lösenord.
        </FormMessage>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <FormMessage tone="error">{error}</FormMessage>}
          <Input
            label="E-postadress"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="din@email.se"
            autoFocus
          />
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Skicka länk
          </Button>
        </form>
      )}

      <p className="text-center text-[#A0A0A0] text-sm mt-6">
        <Link to="/login" className="text-[#FFD700] font-medium">
          Tillbaka till inloggningen
        </Link>
      </p>
    </AuthLayout>
  )
}
