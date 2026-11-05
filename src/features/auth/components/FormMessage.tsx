import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Fel i rött, lyckat (t.ex. "kolla din e-post") i grönt */
export function FormMessage({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'text-sm p-3 rounded-xl border',
        tone === 'error'
          ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
          : 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]',
      )}
    >
      {children}
    </div>
  )
}
