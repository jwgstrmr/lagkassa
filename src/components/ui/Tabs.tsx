import { cn } from '@/lib/utils'

interface TabsProps<T extends string> {
  value: T
  tabs: { value: T; label: string }[]
  onChange: (value: T) => void
}

/**
 * Flikrad direkt under sidhuvudet – byter område på sidan. Filter inom området är Chip.
 * Varje flik är en tredjedel bred, så att flikarna hamnar på samma ställe oavsett hur många de är.
 */
export function Tabs<T extends string>({ value, tabs, onChange }: TabsProps<T>) {
  return (
    <div role="tablist" className="flex border-b border-[#222222]">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative flex-1 max-w-[33.333%] h-11 text-sm font-medium transition-colors',
            value === tab.value ? 'text-[#FFD700]' : 'text-[#A0A0A0]',
          )}
        >
          {tab.label}
          {value === tab.value && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-[#FFD700]" />}
        </button>
      ))}
    </div>
  )
}
