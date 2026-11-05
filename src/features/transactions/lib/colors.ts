import type { TransactionKind } from '@/types/database'

// Intäkter mintgröna, utgifter korallröda – mjukare än statusfärgerna för betalt och fel.
// Ljust tema byter till mörkare nyanser i index.css

export const KIND_TEXT: Record<TransactionKind, string> = {
  income: 'text-[#34D399]',
  expense: 'text-[#FB7185]',
}
