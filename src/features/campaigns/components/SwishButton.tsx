import { swishUrl } from '@/lib/swish'
import { useActiveTeam } from '@/features/teams/hooks/useTeams'

/** Öppnar Swish med lagets nummer, beloppet och vad det gäller – syns bara när laget har ett nummer */
export function SwishButton({ amountOre, message }: { amountOre: number | null; message: string }) {
  const { team } = useActiveTeam()
  if (!team?.swish_number) return null
  return (
    <a
      href={swishUrl(team.swish_number, amountOre, message)}
      className="inline-flex items-center h-8 px-3 rounded-full bg-[#FFD700] text-[#0A0A0A] text-xs font-semibold shrink-0 active:scale-95 transition-transform"
    >
      Swisha
    </a>
  )
}
