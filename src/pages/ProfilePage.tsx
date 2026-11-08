import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ChevronRight, LogOut, Moon, Sun, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { TopBar } from '@/components/layout/TopBar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { initials } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useThemeStore } from '@/store/themeStore'
import { useAuthContext } from '@/features/auth/components/AuthProvider'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { usePendingProfiles } from '@/features/admin/hooks/useUsers'

export function ProfilePage() {
  const navigate = useNavigate()
  const { profile, signOut, refreshProfile } = useAuthContext()
  const { team, isAdmin, isSuperAdmin, memberships } = useActiveTeam()
  const { theme, toggleTheme } = useThemeStore()
  const { data: pending } = usePendingProfiles()

  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [saving, setSaving] = useState(false)

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null })
      .eq('id', profile.id)
    setSaving(false)
    if (error) return toast.error('Kunde inte spara profil')
    await refreshProfile()
    toast.success('Profil sparad')
    setEditing(false)
  }

  return (
    <div className="pb-8">
      <TopBar title="Profil" showBack />

      <div className="p-4 space-y-4">
        <button
          onClick={() => {
            setFullName(profile?.full_name ?? '')
            setEditing(true)
          }}
          disabled={editing}
          className="flex w-full items-center gap-4 bg-[#161616] rounded-xl p-4 border border-[#222222] text-left active:bg-[#1A1A1A]"
        >
          <div className="w-16 h-16 rounded-full bg-[#FFD700]/15 flex items-center justify-center shrink-0">
            <span className="text-[#FFD700] font-bold text-xl">{initials(profile?.full_name)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-lg truncate">{profile?.full_name ?? 'Okänt namn'}</p>
            <p className="text-[#A0A0A0] text-sm truncate">{profile?.email}</p>
            {team && (
              <p className="text-[#8A8A8A] text-xs mt-0.5">
                {isSuperAdmin ? 'Huvudadmin' : isAdmin ? 'Ekonomiansvarig' : 'Förälder'} · {team.name}
              </p>
            )}
          </div>
          {!editing && <ChevronRight size={16} className="ml-auto text-[#8A8A8A] shrink-0" />}
        </button>

        {editing && (
          <div className="bg-[#161616] rounded-xl p-4 border border-[#222222] space-y-4">
            <Input label="Namn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setEditing(false)}>
                Avbryt
              </Button>
              <Button className="flex-1" loading={saving} onClick={saveProfile}>
                Spara
              </Button>
            </div>
          </div>
        )}

        <div className="bg-[#161616] rounded-xl border border-[#222222] overflow-hidden">
          {isSuperAdmin && (
            <button
              onClick={() => navigate('/huvudadmin', { state: pending.length ? { tab: 'users' } : undefined })}
              className="flex items-center gap-3 w-full px-4 py-3 text-white text-sm border-b border-[#222222] active:bg-[#1A1A1A]"
            >
              <Building2 size={16} className="text-[#A0A0A0]" />
              <span className="flex-1 text-left">Huvudadmin</span>
              {pending.length > 0 && <Badge variant="danger">{pending.length} väntar</Badge>}
              <ChevronRight size={16} className="text-[#8A8A8A]" />
            </button>
          )}
          {memberships.length > 1 && (
            <button
              onClick={() => navigate('/lag')}
              className="flex items-center gap-3 w-full px-4 py-3 text-white text-sm border-b border-[#222222] active:bg-[#1A1A1A]"
            >
              <Users size={16} className="text-[#A0A0A0]" />
              <span className="flex-1 text-left">Byt lag</span>
              <ChevronRight size={16} className="text-[#8A8A8A]" />
            </button>
          )}
          <Switch
            checked={theme === 'light'}
            onChange={toggleTheme}
            className="justify-between px-4 py-3 border-b border-[#222222]"
            label={
              <>
                {theme === 'dark'
                  ? <Moon size={16} className="text-[#A0A0A0]" />
                  : <Sun size={16} className="text-[#A0A0A0]" />
                }
                Ljust tema
              </>
            }
          />
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-4 py-3 text-[#EF4444] text-sm font-medium active:bg-[#1A1A1A]"
          >
            <LogOut size={16} />
            Logga ut
          </button>
        </div>
      </div>
    </div>
  )
}
