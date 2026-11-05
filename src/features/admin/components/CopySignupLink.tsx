import { Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'

/** Det skickas inga mejl – länken till registreringen delas själv */
export function CopySignupLink() {
  async function copy() {
    const url = `${window.location.origin}/registrera`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Länken är kopierad')
    } catch {
      toast(url)
    }
  }

  return (
    <Button variant="secondary" onClick={copy}>
      <Link2 size={18} className="mr-1" /> Kopiera länk
    </Button>
  )
}
