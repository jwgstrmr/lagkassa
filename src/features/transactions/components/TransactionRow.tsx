import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatSek } from '@/lib/money'
import { shortDate } from '@/lib/date'
import { transactionTitle } from '../lib/finance'
import { KIND_TEXT } from '../lib/colors'
import type { Child, Transaction } from '@/types/database'

export function SignedAmount({ kind, ore, className }: { kind: Transaction['kind']; ore: number; className?: string }) {
  return (
    <span
      className={cn(
        'tabular-nums font-semibold whitespace-nowrap',
        KIND_TEXT[kind],
        className,
      )}
    >
      {kind === 'income' ? '+' : '−'}{formatSek(ore)}
    </span>
  )
}

interface Props {
  transaction: Transaction
  /** Föräldrar får bara sina egna barn, så andras barn visas inte */
  child?: Child
  /** I Kassan blandas raderna med händelser, som har en ikon – då får intäkter och utgifter också en */
  icon?: boolean
  onClick?: () => void
}

export function TransactionRow({ transaction: t, child, icon, onClick }: Props) {
  const title = transactionTitle(t, child)
  const Icon = t.kind === 'income' ? ArrowDownLeft : ArrowUpRight
  const content = (
    <>
      {/* Pilen är glesare än händelsens kalender – större men med samma linjetjocklek och bredd i raden */}
      {icon && <Icon size={18} strokeWidth={1.5} className="text-[#A0A0A0] shrink-0 -mx-1" />}
      <span className="flex-1 min-w-0">
        <span className="block text-white text-sm font-medium truncate">{title}</span>
        <span className="block text-[#8A8A8A] text-xs truncate">
          {shortDate(t.date)}
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
