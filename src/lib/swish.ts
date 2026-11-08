// Swish tillåter bara de här tecknen i meddelandet, och högst 50
const MESSAGE_CHARS = /[^a-zA-ZåäöÅÄÖ0-9:;.,?!()\-" ]/g

/**
 * Öppnar Swish i telefonen med mottagare, belopp och meddelande ifyllda. Beloppet går att
 * ändra, t.ex. när barnet sålt för mer än minimum. I en dator gör länken ingenting.
 */
export function swishUrl(number: string, amountOre: number | null, message: string): string {
  const data = {
    version: 1,
    payee: { value: number.replace(/[^\d+]/g, '') },
    ...(amountOre && amountOre > 0 ? { amount: { value: amountOre / 100, editable: true } } : {}),
    message: { value: message.replace(MESSAGE_CHARS, '').replace(/\s+/g, ' ').trim().slice(0, 50), editable: true },
  }
  return `swish://payment?data=${encodeURIComponent(JSON.stringify(data))}`
}
