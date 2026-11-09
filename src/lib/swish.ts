// Swish tar bara emot de här tecknen i meddelandet, och högst 50
const MESSAGE_CHAR = /[a-zA-ZåäöÅÄÖ0-9!?(),.\-:; ]/

/** Håller meddelandet till Swish teckenregler: tankstreck blir -, é blir e och annat blir mellanslag */
function swishMessage(text: string): string {
  const chars = Array.from(text.replace(/[‐-―−]/g, '-'), (ch) => {
    if (MESSAGE_CHAR.test(ch)) return ch
    const base = ch.normalize('NFD')[0]
    return /[a-zA-Z]/.test(base) ? base : ' '
  })
  return chars.join('').replace(/\s+/g, ' ').trim().slice(0, 50).trim()
}

/** Mobilnummer skrivs med landskod (070… → 4670…), företagsnummer (123…, 90…) som de är */
function swishPayee(number: string): string {
  const digits = number.replace(/\D/g, '').replace(/^00/, '')
  return digits.startsWith('0') ? `46${digits.slice(1)}` : digits
}

/**
 * Öppnar Swish i telefonen med mottagare, belopp och meddelande ifyllda, i det format Swish
 * dokumenterar för sina QR-koder. I en dator öppnas Swish webbsida i stället.
 */
export function swishUrl(number: string, amountOre: number | null, message: string): string {
  const params = [`sw=${swishPayee(number)}`]
  if (amountOre && amountOre > 0) params.push(`amt=${(amountOre / 100).toFixed(2)}`)
  const msg = swishMessage(message)
  if (msg) params.push(`msg=${encodeURIComponent(msg)}`)
  return `https://app.swish.nu/1/p/sw/?${params.join('&')}`
}
