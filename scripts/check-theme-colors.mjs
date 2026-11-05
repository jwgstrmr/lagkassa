// Ljust tema byter färger med en override per Tailwind-klass i src/index.css.
// En ny hårdkodad färg utan override blir oläslig i ljust tema – det här hittar dem.
// Körs av `npm run lint`.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Färger som fungerar på både mörk och ljus bakgrund – statusfärger och text på gula knappar
const BOTH_THEMES = new Set(['0A0A0A', '22C55E', 'EF4444', 'F97316', 'FFD700', 'F5C518', '3B82F6'])

const css = readFileSync('src/index.css', 'utf8')

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(path) ? [path] : []
  })
}

const escape = (cls) => cls.replace(/[[\]#:/]/g, (c) => `\\${c}`)
// Med opacitet, t.ex. bg-[#34D399]/15 – den behöver en egen override
const pattern = /(?:[a-z-]+:)?(?:text|bg|border|divide)-\[#([0-9A-Fa-f]{6})\](?:\/\d+)?/g

/** Exakt klassnamn – .bg-\[\#34D399\] får inte räknas som täckt av .bg-\[\#34D399\]\/15 */
function hasOverride(cls) {
  const needle = `.${escape(cls)}`
  for (let i = css.indexOf(needle); i !== -1; i = css.indexOf(needle, i + 1)) {
    if (/[\s:,{>]/.test(css[i + needle.length] ?? '')) return true
  }
  return false
}

const missing = new Map()
for (const file of files('src')) {
  for (const [cls, hex] of readFileSync(file, 'utf8').matchAll(pattern)) {
    if (BOTH_THEMES.has(hex.toUpperCase())) continue
    if (hasOverride(cls)) continue
    missing.set(cls, [...(missing.get(cls) ?? []), file])
  }
}

if (missing.size) {
  console.error('Färger utan override för ljust tema i src/index.css:')
  for (const [cls, where] of missing) console.error(`  ${cls}  (${[...new Set(where)].join(', ')})`)
  process.exit(1)
}
