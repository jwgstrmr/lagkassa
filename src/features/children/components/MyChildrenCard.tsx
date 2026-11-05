import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatSek } from '@/lib/money'
import { initials } from '@/lib/utils'
import { paidIn } from '@/features/campaigns/lib/sales'
import { useTransactions } from '@/features/transactions/hooks/useTransactions'
import { useMyChildren } from '../hooks/useChildren'

export function MyChildrenCard() {
  const { data: children } = useMyChildren()
  const { data: transactions = [] } = useTransactions()

  if (!children.length) return null

  return (
    <Card padding={false} className="overflow-hidden">
      <h2 className="text-white font-semibold px-4 pt-4 pb-2">
        {children.length === 1 ? 'Mitt barn' : 'Mina barn'}
      </h2>
      <div className="divide-y divide-[#222222]">
        {children.map((child) => (
          <Link
            key={child.id}
            to={`/barn/${child.id}`}
            className="flex items-center gap-3 px-4 py-3 active:bg-[#1A1A1A]"
          >
            <span className="w-9 h-9 rounded-full bg-[#FFD700]/15 flex items-center justify-center text-[#FFD700] text-xs font-bold shrink-0">
              {initials(child.name)}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-white text-sm font-medium truncate">{child.name}</span>
            </span>
            <span className="text-right shrink-0">
              <span className="block text-white text-sm font-semibold tabular-nums">
                {formatSek(paidIn(transactions, child.id))}
              </span>
              <span className="block text-[#8A8A8A] text-xs">inbetalt</span>
            </span>
            <ChevronRight size={16} className="text-[#8A8A8A]" />
          </Link>
        ))}
      </div>
    </Card>
  )
}
