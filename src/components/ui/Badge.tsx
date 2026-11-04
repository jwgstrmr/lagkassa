import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'accent' | 'success' | 'danger' | 'warning'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-[#222222] text-[#A0A0A0]',
  accent: 'bg-[#FFD700]/15 text-[#FFD700]',
  success: 'bg-[#22C55E]/15 text-[#22C55E]',
  danger: 'bg-[#EF4444]/15 text-[#EF4444]',
  warning: 'bg-[#F97316]/15 text-[#F97316]',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
