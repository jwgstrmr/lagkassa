import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-[#A0A0A0] text-sm font-medium">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-[#161616] border text-white rounded-xl px-4 py-3 text-base placeholder:text-[#8A8A8A] focus:outline-none transition-colors',
            error
              ? 'border-[#EF4444] focus:border-[#EF4444]'
              : 'border-[#333333] focus:border-[#FFD700]',
            className,
          )}
          {...props}
        />
        {error && <p className="text-[#EF4444] text-xs">{error}</p>}
        {hint && !error && <p className="text-[#8A8A8A] text-xs">{hint}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'
