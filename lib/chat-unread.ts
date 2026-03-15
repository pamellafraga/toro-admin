/**
 * Contagem de mensagens não lidas do Chat Interno (estilo WhatsApp).
 * Usa localStorage para "última vez que leu" por canal; mensagens de outros após isso = não lidas.
 */

export const CHAT_CHANNELS = ["general", "comercial"] as const

const STORAGE_KEY = "xpress_chat_lastread"

export type ChannelId = (typeof CHAT_CHANNELS)[number]

export function getLastRead(userId: string): Record<string, number> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`)
    if (!raw) return {}
    const o = JSON.parse(raw) as Record<string, number>
    return typeof o === "object" && o !== null ? o : {}
  } catch {
    return {}
  }
}

export function setLastRead(userId: string, channel: string, timestamp: number): void {
  if (typeof window === "undefined") return
  try {
    const prev = getLastRead(userId)
    const next = { ...prev, [channel]: timestamp }
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(next))
  } catch {}
}

export function setLastReadNow(userId: string, channel: string): void {
  setLastRead(userId, channel, Date.now())
}
