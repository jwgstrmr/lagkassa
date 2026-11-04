import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  theme: 'dark' | 'light'
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        document.documentElement.classList.toggle('light', next === 'light')
        set({ theme: next })
      },
    }),
    { name: 'lagkassa-theme' },
  ),
)

export function initTheme() {
  const stored = localStorage.getItem('lagkassa-theme')
  try {
    const parsed = stored ? JSON.parse(stored) : null
    if (parsed?.state?.theme === 'light') {
      document.documentElement.classList.add('light')
    }
  } catch {
    // Trasigt sparat tema – standardtemat gäller
  }
}
