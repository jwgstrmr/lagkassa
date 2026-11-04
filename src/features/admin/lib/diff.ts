/** Vad som ska läggas till och tas bort för att gå från before till after */
export function diff(before: string[], after: string[]) {
  return {
    add: after.filter((id) => !before.includes(id)),
    remove: before.filter((id) => !after.includes(id)),
  }
}

export function displayName(p: { full_name: string | null; email: string } | undefined) {
  return p?.full_name || p?.email || 'Okänd'
}
