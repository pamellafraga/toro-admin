"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { getLastRead } from "@/lib/chat-unread"

const FIXED_CHANNELS = ["general", "comercial"]

/**
 * Retorna o número de mensagens não lidas do Chat Interno para o usuário logado.
 * Considera: Geral, Comercial e todos os canais por pessoa (user:Nome), além de canais contato.
 * Usado na sidebar para exibir o badge (estilo WhatsApp).
 */
export function useChatUnreadCount(): number {
  const { profile, hasPermission } = useAuth()
  const supabase = createClient()
  const userId = profile?.id ?? ""
  const userName = profile?.name ?? ""

  const { data: count } = useSWR(
    profile && hasPermission("chat") ? ["chat-unread", userId, userName] : null,
    async () => {
      const lastRead = getLastRead(userId)
      const channels: string[] = [...FIXED_CHANNELS]

      const [usersRes, contactChannelsRes] = await Promise.all([
        fetch("/api/users").then((r) => (r.ok ? r.json() : [])).catch(() => []),
        supabase.rpc("get_chat_contact_channels").then(({ data }) =>
          Array.isArray(data) ? (data as { channel: string }[]).map((r) => r.channel).filter(Boolean) : []
        ),
      ])
      const teamNames = (usersRes as { display_name?: string }[]).map((u) => u.display_name || "").filter(Boolean)
      const fallbackNames = ["Stefanie", "Lisete", "Pamella", "Roberto"]
      const names = teamNames.length ? teamNames : fallbackNames
      names.forEach((name) => {
        if (name !== userName) channels.push(`user:${name}`)
      })
      contactChannelsRes.forEach((ch) => {
        if (!channels.includes(ch)) channels.push(ch)
      })

      let total = 0
      for (const channel of channels) {
        const since = lastRead[channel] ?? 0
        const { count: c } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("channel", channel)
          .neq("sender_id", userId)
          .gt("created_at", new Date(since).toISOString())
        total += c ?? 0
      }
      return total
    },
    { refreshInterval: 15000, revalidateOnFocus: true }
  )

  return typeof count === "number" ? count : 0
}
