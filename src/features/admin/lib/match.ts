/** Ord utan skiftläge och accenter – "Åsa Öberg" och "asa oberg" ska mötas */
function words(text: string) {
  return text
    .toLocaleLowerCase('sv')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1)
}

/**
 * Barnen vars namn liknar det användaren skrev vid registreringen – flest gemensamma ord först.
 * Syskon med samma efternamn kommer med, så fritexten kan nämna flera barn.
 */
export function matchChildren<T extends { name: string }>(note: string | null, children: T[], limit = 6): T[] {
  const wanted = new Set(words(note ?? ''))
  if (!wanted.size) return []
  return children
    .map((child) => ({ child, score: words(child.name).filter((w) => wanted.has(w)).length }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.child.name.localeCompare(b.child.name, 'sv'))
    .slice(0, limit)
    .map((m) => m.child)
}
