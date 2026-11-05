import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-[#A0A0A0] text-sm font-medium">{label}</label>
        )}
        <textarea
          ref={ref}
          rows={3}
          className={cn(
            'w-full bg-[#161616] border text-white rounded-xl px-4 py-3 text-base placeholder:text-[#8A8A8A] focus:outline-none transition-colors resize-none',
            error
              ? 'border-[#EF4444] focus:border-[#EF4444]'
              : 'border-[#333333] focus:border-[#FFD700]',
            className,
          )}
          {...props}
        />
        {error && <p className="text-[#EF4444] text-xs">{error}</p>}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'
