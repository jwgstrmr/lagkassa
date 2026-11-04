import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { formatSek } from '@/lib/money'
import { transactionTitle } from '../lib/finance'
import type { Category, Child, Transaction } from '@/types/database'

export function SignedAmount({ kind, ore, className }: { kind: Transaction['kind']; ore: number; className?: string }) {
  return (
    <span
      className={cn(
        'tabular-nums font-semibold whitespace-nowrap',
        kind === 'income' ? 'text-[#22C55E]' : 'text-white',
        className,
      )}
    >
      {kind === 'income' ? '+' : '−'}{formatSek(ore)}
    </span>
  )
}

interface Props {
  transaction: Transaction
  category?: Category
  /** Föräldrar får bara sina egna barn, så andras barn visas inte */
  child?: Child
  onClick?: () => void
}

export function TransactionRow({ transaction: t, category, child, onClick }: Props) {
  const title = transactionTitle(t, category, child)
  const content = (
    <>
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: category?.color ?? '#666666' }}
      />
      <span className="flex-1 min-w-0">
        <span className="block text-white text-sm font-medium truncate">{title}</span>
        <span className="block text-[#666666] text-xs truncate">
          {format(parseISO(t.date), 'd MMM', { locale: sv })}
          {category && category.name !== title && ` · ${category.name}`}
          {child && child.name !== title && ` · ${child.name}`}
        </span>
      </span>
      <SignedAmount kind={t.kind} ore={t.amount_ore} className="text-sm" />
    </>
  )

  const className = 'flex items-center gap-3 w-full px-4 py-3 text-left'
  return onClick ? (
    <button onClick={onClick} className={cn(className, 'active:bg-[#1A1A1A]')}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  )
}
