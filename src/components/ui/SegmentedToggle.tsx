import { cn } from '@/lib/utils'

/** Ett val bland några få – som en rad knappar där en är vald */
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
          aria-pressed={value === o.value}
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
