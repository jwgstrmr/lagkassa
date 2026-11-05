import { type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  color?: string
}

export function Chip({ active, color, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex items-center px-3 h-8 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 border',
        active && !color
          ? 'bg-[#FFD700] text-[#0A0A0A] border-[#FFD700]'
          : !active
          ? 'bg-[#222222] text-[#A0A0A0] border-[#333333] hover:border-[#555555]'
          : '',
        className,
      )}
      style={
        color && active
          ? { backgroundColor: `${color}40`, color, borderColor: color }
          : color && !active
          ? { borderColor: `${color}40`, color }
          : undefined
      }
      {...props}
    >
      {children}
    </button>
  )
}
