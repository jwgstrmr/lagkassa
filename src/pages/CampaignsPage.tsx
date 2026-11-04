import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { FAB } from '@/components/layout/FAB'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'
import { useCampaigns } from '@/features/campaigns/hooks/useCampaigns'
import { CampaignCard } from '@/features/campaigns/components/CampaignCard'
import { CampaignForm } from '@/features/campaigns/components/CampaignForm'
import { isEnded } from '@/features/campaigns/lib/format'

export function CampaignsPage() {
  const navigate = useNavigate()
  const { isAdmin } = useActiveTeam()
  const { data: campaigns, isLoading } = useCampaigns()
  const [creating, setCreating] = useState(false)

  const groups = [
    { title: 'Pågående', list: campaigns?.filter((c) => !isEnded(c)) ?? [] },
    { title: 'Avslutade', list: campaigns?.filter(isEnded) ?? [] },
  ].filter((g) => g.list.length > 0)

  return (
    <div>
      <TopBar title="Händelser" />

      {isLoading ? (
        <ListSkeleton />
      ) : !campaigns?.length ? (
        <EmptyState
          icon={CalendarDays}
          title="Inga händelser än"
          actionLabel={isAdmin ? 'Ny händelse' : undefined}
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="p-4 space-y-4">
          {groups.map((g) => (
            <section key={g.title}>
              <h2 className="text-[#A0A0A0] text-xs font-semibold uppercase tracking-wider px-1 mb-2">
                {g.title}
              </h2>
              <div className="space-y-2">
                {g.list.map((c) => <CampaignCard key={c.id} campaign={c} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      {isAdmin && <FAB onClick={() => setCreating(true)} label="Ny händelse" />}

      <BottomSheet isOpen={creating} onClose={() => setCreating(false)} title="Ny händelse">
        {creating && (
          <CampaignForm
            onDone={(id) => {
              setCreating(false)
              if (id) navigate(`/handelser/${id}`)
            }}
          />
        )}
      </BottomSheet>
    </div>
  )
}
