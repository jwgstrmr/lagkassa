import { Chip } from '@/components/ui/Chip'

/** Flerval bland barn eller lag */
export function MultiPicker({ label, options, selected, onChange }: {
  label: string
  options: { id: string; name: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  if (!options.length) return null
  return (
    <div className="space-y-1.5">
      <span className="block text-[#A0A0A0] text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((c) => {
          const active = selected.includes(c.id)
          return (
            <Chip
              key={c.id}
              active={active}
              onClick={() => onChange(active ? selected.filter((id) => id !== c.id) : [...selected, c.id])}
            >
              {c.name}
            </Chip>
          )
        })}
      </div>
    </div>
  )
}
