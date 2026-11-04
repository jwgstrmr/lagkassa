import { cn } from '@/lib/utils'
import { Chip } from '@/components/ui/Chip'

export function SegmentedToggle<T extends string>({ value, options, onChange }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-2 p-1 bg-[#161616] rounded-xl border border-[#222222]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'h-10 rounded-lg text-sm font-semibold transition-colors',
            value === o.value ? 'bg-[#FFD700] text-[#0A0A0A]' : 'text-[#A0A0A0]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

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
