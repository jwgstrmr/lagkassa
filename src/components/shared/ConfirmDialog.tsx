import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/store/uiStore'

export function ConfirmDialog() {
  const { confirmDialog, closeConfirm } = useUIStore()

  if (!confirmDialog) return null

  return (
    <BottomSheet
      isOpen={confirmDialog.open}
      onClose={closeConfirm}
      title={confirmDialog.title}
      elevated
    >
      <div className="px-4 pb-8 space-y-4">
        <p className="text-[#A0A0A0] text-sm leading-relaxed">{confirmDialog.message}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={closeConfirm} className="flex-1">
            Avbryt
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              confirmDialog.onConfirm()
              closeConfirm()
            }}
            className="flex-1"
          >
            Bekräfta
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
