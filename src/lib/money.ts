const sek = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const sekCompact = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** 12345 öre → "123,45 kr" */
export function formatSek(ore: number): string {
  return sek.format(ore / 100)
}

/** Kort form till diagramaxlar – "12 tn kr" */
export function formatSekCompact(ore: number): string {
  return sekCompact.format(ore / 100)
}

/** "1 234,50" / "1234.5" / "1 234 kr" → öre, eller null om det inte är ett belopp */
export function parseSek(input: string): number | null {
  const cleaned = input.replace(/kr/gi, '').replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  return Math.round(Number(cleaned) * 100)
}

/** Öre → text i ett formulärfält – "1234,5" */
export function oreToInput(ore: number): string {
  return (ore / 100).toString().replace('.', ',')
}
