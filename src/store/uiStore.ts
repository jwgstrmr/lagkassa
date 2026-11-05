import { create } from 'zustand'

interface ConfirmState {
  open: boolean
  title: string
  message: string
  /** Knappen säger vad som händer – nästan alltid en borttagning */
  confirmLabel: string
  onConfirm: () => void
}

interface UIStore {
  confirmDialog: ConfirmState | null
  openConfirm: (title: string, message: string, onConfirm: () => void, confirmLabel?: string) => void
  closeConfirm: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  confirmDialog: null,
  openConfirm: (title, message, onConfirm, confirmLabel = 'Ta bort') =>
    set({ confirmDialog: { open: true, title, message, confirmLabel, onConfirm } }),
  // Innehållet ligger kvar medan arket glider ut
  closeConfirm: () => set((s) => ({ confirmDialog: s.confirmDialog && { ...s.confirmDialog, open: false } })),
}))
