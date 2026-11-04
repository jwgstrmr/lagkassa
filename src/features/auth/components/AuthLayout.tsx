import type { ReactNode } from 'react'
import { Wallet } from 'lucide-react'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0A0A0A] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-[#FFD700]/15 flex items-center justify-center mx-auto mb-4">
            <Wallet size={40} className="text-[#FFD700]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Lagkassan</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
