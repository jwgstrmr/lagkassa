import { formatSek } from '@/lib/money'
import { useChartTheme } from '@/lib/chartTheme'
import type { Share } from '@/features/transactions/lib/finance'
import type { TransactionKind } from '@/types/database'

/** Rangordnade staplar med namn och belopp utskrivna – inget behöver läsas av på en skala */
export function ShareBars({ shares, kind }: { shares: Share[]; kind: TransactionKind }) {
  const c = useChartTheme()
  const max = Math.max(...shares.map((s) => s.amount), 1)
  const total = shares.reduce((sum, s) => sum + s.amount, 0)

  return (
    <ul className="space-y-3">
      {shares.map((s) => (
        <li key={s.id} title={`${s.name}: ${formatSek(s.amount)}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-white truncate">{s.name}</span>
            <span className="text-white tabular-nums shrink-0">
              {formatSek(s.amount)}
              <span className="text-[#8A8A8A] ml-2">{Math.round((s.amount / total) * 100)} %</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-r bg-transparent">
            <div
              className="h-full rounded-r"
              style={{ width: `${Math.max((s.amount / max) * 100, 1)}%`, backgroundColor: c[kind] }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
