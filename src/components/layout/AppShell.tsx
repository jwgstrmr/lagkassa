import type { CSSProperties } from 'react'
import { Outlet } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { BottomNav } from './BottomNav'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function AppShell() {
  const isOnline = useOnlineStatus()

  return (
    // Utan anslutning ligger raden överst och tar statusfältets plats i stället för sidhuvudet
    <div
      className="flex flex-col h-dvh bg-[#0A0A0A] overflow-hidden"
      style={{ '--top-inset': isOnline ? 'env(safe-area-inset-top)' : '0px' } as CSSProperties}
    >
      {!isOnline && (
        <div
          className="flex items-center justify-center gap-2 bg-[#F97316]/15 border-b border-[#F97316]/30 px-4 py-2 text-[#F97316] text-sm"
          style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
        >
          <WifiOff size={14} />
          <span>Ingen internetanslutning</span>
        </div>
      )}
      {/* Plats för FAB:en ovanför menyn, så att sista radens belopp inte hamnar under den */}
      <main className="flex-1 overflow-y-auto overscroll-contain pb-[calc(9.5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
