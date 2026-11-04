import { useThemeStore } from '@/store/themeStore'

/** Färger för kategorier i fast ordning – nya kategorier tar nästa lediga */
export const CATEGORY_COLORS = [
  '#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767',
]

const dark = {
  series: '#3987e5',
  seriesFill: 'rgba(57, 135, 229, 0.14)',
  grid: '#2c2c2a',
  axis: '#383835',
  muted: '#898781',
  surface: '#161616',
}

const light = {
  series: '#2a78d6',
  seriesFill: 'rgba(42, 120, 214, 0.12)',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  surface: '#FFFFFF',
}

/** SVG-attribut följer inte css-klasserna för ljust tema, så diagrammen väljer färger här */
export function useChartTheme() {
  const theme = useThemeStore((s) => s.theme)
  return theme === 'light' ? light : dark
}
