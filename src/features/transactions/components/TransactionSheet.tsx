import { BottomSheet } from '@/components/ui/BottomSheet'
import type { Transaction } from '@/types/database'
import { TransactionForm } from './TransactionForm'

/** Ny eller ändrad fristående intäkt eller utgift */
export function TransactionSheet({ editing, onClose }: { editing: Transaction | 'new' | null; onClose: () => void }) {
  return (
    <BottomSheet
      isOpen={editing !== null}
      onClose={onClose}
      title={editing === 'new' ? 'Ny intäkt eller utgift' : 'Ändra'}
    >
      {editing !== null && (
        <TransactionForm
          key={editing === 'new' ? 'new' : editing.id}
          transaction={editing === 'new' ? undefined : editing}
          onDone={onClose}
        />
      )}
    </BottomSheet>
  )
}
