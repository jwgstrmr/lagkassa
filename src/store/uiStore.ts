import { create } from 'zustand'

interface UIStore {
  confirmDialog: { open: boolean; title: string; message: string; onConfirm: () => void } | null
  openConfirm: (title: string, message: string, onConfirm: () => void) => void
  closeConfirm: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  confirmDialog: null,
  openConfirm: (title, message, onConfirm) => set({ confirmDialog: { open: true, title, message, onConfirm } }),
  closeConfirm: () => set({ confirmDialog: null }),
}))
