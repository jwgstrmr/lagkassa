import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Texten är en etikett – ett tryck på den växlar också */
  label?: ReactNode
  disabled?: boolean
  /** T.ex. för att låta en hel listrad vara tryckyta */
  className?: string
}

export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <label className={cn('flex items-center gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
      {label && <span className="flex items-center gap-3 text-white text-sm">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 rounded-full transition-colors',
          checked ? 'bg-[#FFD700]' : 'bg-[#333333]',
        )}
      >
        <span
          className={cn(
            'absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </label>
  )
}
