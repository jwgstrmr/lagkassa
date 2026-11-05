import { type ReactNode, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  showCloseButton?: boolean
  elevated?: boolean
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
  elevated = false,
}: BottomSheetProps) {
  const dragControls = useDragControls()
  const titleId = useId()

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Escape stänger bara det översta arket – bekräftelsen (elevated) fångar tangenten först
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (elevated) e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, elevated)
    return () => window.removeEventListener('keydown', onKey, elevated)
  }, [isOpen, elevated, onClose])

  // Portal till body – en förälder med backdrop-filter (TopBar) gör annars
  // fixed-positioneringen relativ till sig själv
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 ${elevated ? 'z-[90]' : 'z-[60]'} bg-black/60 backdrop-blur-sm`}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onClose()
            }}
            className={cn(
              `fixed bottom-0 left-0 right-0 ${elevated ? 'z-[90]' : 'z-[60]'} bg-[#111111] rounded-t-2xl max-h-[92dvh] flex flex-col`,
              className,
            )}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div
              className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-10 h-1 bg-[#333333] rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
              {title && (
                <h2 id={titleId} className="font-bold text-white text-lg">{title}</h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="ml-auto flex items-center justify-center w-8 h-8 text-[#8A8A8A] hover:text-white transition-colors"
                  aria-label="Stäng"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="overflow-y-auto overflow-x-hidden flex-1 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
