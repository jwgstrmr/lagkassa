import { Outlet } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { BottomNav } from './BottomNav'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function AppShell() {
  const isOnline = useOnlineStatus()

  return (
    <div className="flex flex-col h-dvh bg-[#0A0A0A] overflow-hidden">
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-[#F97316]/15 border-b border-[#F97316]/30 px-4 py-2 text-[#F97316] text-sm">
          <WifiOff size={14} />
          <span>Ingen internetanslutning</span>
        </div>
      )}
      <main className="flex-1 overflow-y-auto overscroll-contain pb-32">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
