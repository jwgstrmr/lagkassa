import { Chip } from '@/components/ui/Chip'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { matchChildren } from '../lib/match'
import type { Child } from '@/types/database'

const toggle = (selected: string[], id: string) =>
  selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]

/** Flerval bland barn eller lag */
export function MultiPicker({ label, options, selected, onChange }: {
  label?: string
  options: { id: string; name: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  if (!options.length) return null
  return (
    <div className="space-y-1.5">
      {label && <span className="block text-[#A0A0A0] text-sm font-medium">{label}</span>}
      <div className="flex flex-wrap gap-2">
        {options.map((c) => (
          <Chip key={c.id} active={selected.includes(c.id)} onClick={() => onChange(toggle(selected, c.id))}>
            {c.name}
          </Chip>
        ))}
      </div>
    </div>
  )
}

/**
 * Barn att koppla en förälder till, lag för lag – som spelarnas lag, fast från andra hållet.
 * Ett barn i flera lag står under vart och ett och väljs i alla på en gång.
 */
export function ChildrenByTeamPicker({ label, options, selected, onChange, firstTeamId }: {
  label: string
  options: Child[]
  selected: string[]
  onChange: (ids: string[]) => void
  /** Laget som är valt i filtret står först */
  firstTeamId?: string | null
}) {
  const { memberships } = useActiveTeam()
  const teamIds = memberships.map((m) => m.team_id)
  const ordered = [
    ...memberships.filter((m) => m.team_id === firstTeamId),
    ...memberships.filter((m) => m.team_id !== firstTeamId),
  ]
  const groups = [
    ...ordered.map((m) => ({
      key: m.team_id,
      name: m.team.name,
      kids: options.filter((c) => c.team_ids.includes(m.team_id)),
    })),
    { key: 'none', name: 'Utan lag', kids: options.filter((c) => !c.team_ids.some((id) => teamIds.includes(id))) },
  ].filter((g) => g.kids.length)

  // Ett enda lag behöver ingen rubrik
  if (groups.length < 2) return <MultiPicker label={label} options={options} selected={selected} onChange={onChange} />

  return (
    <div className="space-y-3">
      <span className="block text-[#A0A0A0] text-sm font-medium">{label}</span>
      {groups.map((g) => (
        <div key={g.key} className="space-y-1.5">
          <span className="block text-[#8A8A8A] text-xs">{g.name}</span>
          <div className="flex flex-wrap gap-2">
            {g.kids.map((c) => (
              <Chip key={c.id} active={selected.includes(c.id)} onClick={() => onChange(toggle(selected, c.id))}>
                {c.name}
              </Chip>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Lagfilter överst i huvudadmins listor – visas bara när det finns flera lag */
export function TeamFilter({ value, onChange }: { value: string | null; onChange: (teamId: string | null) => void }) {
  const { memberships } = useActiveTeam()
  if (memberships.length < 2) return null
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4">
      <Chip active={value === null} onClick={() => onChange(null)}>Alla</Chip>
      {memberships.map((m) => (
        <Chip key={m.team_id} active={value === m.team_id} onClick={() => onChange(m.team_id)}>
          {m.team.name}
        </Chip>
      ))}
    </div>
  )
}

/**
 * Vad användaren skrev om barnet vid registreringen – bara en hjälp att hitta rätt barn.
 * Det är barnen i registret som kopplas. Anroparen skickar null när texten inte behövs längre.
 */
export function ChildrenNote({ note, options, selected, onChange }: {
  note: string | null
  /** Barnen i registret som kan väljas. detail är t.ex. barnets lag */
  options: { id: string; name: string; detail?: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  if (!note) return null
  const matches = matchChildren(note, options)
  return (
    <div className="bg-[#161616] border border-[#222222] rounded-xl px-4 py-3 space-y-2">
      <div>
        <span className="block text-[#8A8A8A] text-xs">Angivet vid registreringen</span>
        <span className="block text-white text-sm break-words">”{note}”</span>
      </div>
      {matches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {matches.map((c) => (
            <Chip
              key={c.id}
              active={selected.includes(c.id)}
              className="max-w-full"
              onClick={() => onChange(toggle(selected, c.id))}
            >
              <span className="truncate">
                {c.name}
                {c.detail && <span className="font-normal opacity-75"> · {c.detail}</span>}
              </span>
            </Chip>
          ))}
        </div>
      )}
    </div>
  )
}
