import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FABProps {
  onClick: () => void
  label?: string
  className?: string
}

export function FAB({ onClick, label = 'Lägg till', className }: FABProps) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={onClick}
      aria-label={label}
      className={cn(
        'fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-50 w-14 h-14 rounded-full bg-[#FFD700] text-[#0A0A0A] shadow-lg shadow-[#FFD700]/25 flex items-center justify-center active:scale-95 transition-transform',
        className,
      )}
    >
      <Plus size={28} strokeWidth={2.5} />
    </motion.button>
  )
}
