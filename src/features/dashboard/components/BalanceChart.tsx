import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import { formatSek, formatSekCompact } from '@/lib/money'
import { useChartTheme } from '@/lib/chartTheme'

interface Point {
  date: string
  balance: number
}

interface TooltipProps {
  active?: boolean
  payload?: { payload: Point & { t: number } }[]
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="bg-[#222222] border border-[#333333] rounded-lg px-3 py-2 shadow-lg">
      <p className="text-[#A0A0A0] text-xs">{format(parseISO(p.date), 'd MMM yyyy', { locale: sv })}</p>
      <p className="text-white text-sm font-semibold tabular-nums">{formatSek(p.balance)}</p>
    </div>
  )
}

/** Saldot över tid – en serie, trappsteg eftersom saldot står still mellan rörelserna */
export function BalanceChart({ points }: { points: Point[] }) {
  const c = useChartTheme()
  const data = points.map((p) => ({ ...p, t: parseISO(p.date).getTime() }))
  // Över ett årsskifte säger månaden ensam inte vilket år det är
  const severalYears = points.length > 1 && points[0].date.slice(0, 4) !== points[points.length - 1].date.slice(0, 4)

  return (
    <div className="h-48 -ml-2" role="img" aria-label="Saldo över tid">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={c.grid} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(t: number) => format(t, severalYears ? 'MMM yyyy' : 'MMM', { locale: sv })}
            stroke={c.axis}
            tick={{ fill: c.muted, fontSize: 11 }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={formatSekCompact}
            stroke="none"
            tick={{ fill: c.muted, fontSize: 11 }}
            width={64}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: c.muted, strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Area
            type="stepAfter"
            dataKey="balance"
            stroke={c.series}
            strokeWidth={2}
            fill={c.seriesFill}
            activeDot={{ r: 4, stroke: c.surface, strokeWidth: 2, fill: c.series }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
