import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className, children, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-[#A0A0A0] text-sm font-medium">{label}</label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full bg-[#161616] border border-[#333333] text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#FFD700] transition-colors',
            className,
          )}
          {...props}
        >
          {children}
        </select>
      </div>
    )
  },
)
Select.displayName = 'Select'
