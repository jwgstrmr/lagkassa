import type { ReactNode } from 'react'

/** Klubbskölden ovanför namnet – som appens ikon */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0A0A0A] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/icons/vaksala.png" alt="" className="h-24 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Lagkassan</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
