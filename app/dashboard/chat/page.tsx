"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { Send, MessageCircle, Hash } from "lucide-react"
import useSWR from "swr"
import type { ChatMessage } from "@/lib/types"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { setLastReadNow, setLastRead, getLastRead } from "@/lib/chat-unread"

const FIXED_CHANNELS = [
  { id: "general", label: "Geral" },
  { id: "comercial", label: "Comercial" },
] as const

const USER_CHANNEL_PREFIX = "user:"
const CONTACT_CHANNEL_PREFIX = "contact:"

function isUserChannel(channelId: string): boolean {
  return channelId.startsWith(USER_CHANNEL_PREFIX)
}

function userChannelLabel(channelId: string): string {
  return channelId.startsWith(USER_CHANNEL_PREFIX) ? channelId.slice(USER_CHANNEL_PREFIX.length) : channelId
}

function parseContactChannelId(channelId: string): { contact: string; person: string } | null {
  if (!channelId.startsWith(CONTACT_CHANNEL_PREFIX)) return null
  const rest = channelId.slice(CONTACT_CHANNEL_PREFIX.length)
  const lastColon = rest.lastIndexOf(":")
  if (lastColon === -1) return null
  return {
    contact: rest.slice(0, lastColon).trim(),
    person: rest.slice(lastColon + 1).trim(),
  }
}

function contactChannelLabel(channelId: string): string {
  const parsed = parseContactChannelId(channelId)
  if (!parsed) return channelId
  return `${parsed.contact} ↔ ${parsed.person}`
}

export default function ChatPage() {
  const supabase = createClient()
  const { profile } = useAuth()
  const [message, setMessage] = useState("")
  const [channel, setChannel] = useState("general")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: contactChannels } = useSWR("chat-contact-channels", async () => {
    const { data } = await supabase.rpc("get_chat_contact_channels")
    if (!Array.isArray(data)) return []
    return (data as { channel: string }[]).map((r) => r.channel).filter(Boolean)
  }, { refreshInterval: 10000 })

  const contactChannelsList = (contactChannels ?? []).sort()

  const { data: teamNames } = useSWR("chat-team-names", async () => {
    const res = await fetch("/api/users")
    if (!res.ok) return ["Stefanie", "Lisete", "Pamella", "Roberto"]
    const users = await res.json()
    const names = (users as { display_name?: string }[]).map((u) => u.display_name || "").filter(Boolean)
    return names.length ? names : ["Stefanie", "Lisete", "Pamella", "Roberto"]
  })

  const userChannels = (teamNames ?? [])
    .filter((name) => name !== profile?.name)
    .map((name) => ({ id: `${USER_CHANNEL_PREFIX}${name}`, label: name }))

  const { data: messages, mutate } = useSWR(`chat-${channel}`, async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("channel", channel)
      .order("created_at", { ascending: true })
      .limit(100)
    return (data || []) as ChatMessage[]
  }, { refreshInterval: 3000 })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (profile?.id) setLastReadNow(profile.id, channel)
  }, [profile?.id, channel])

  useEffect(() => {
    if (!profile?.id || !messages?.length) return
    const last = messages[messages.length - 1]
    const ts = new Date(last.created_at).getTime()
    const current = getLastRead(profile.id)[channel] ?? 0
    if (ts > current) setLastRead(profile.id, channel, ts)
  }, [profile?.id, channel, messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !profile) return

    await supabase.from("chat_messages").insert({
      sender_id: profile.id,
      sender_name: profile.name,
      message: message.trim(),
      channel,
    })

    setMessage("")
    mutate()
  }

  const currentChannelLabel =
    FIXED_CHANNELS.find((c) => c.id === channel)?.label ??
    (isUserChannel(channel) ? userChannelLabel(channel) : contactChannelLabel(channel))

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar: Canais */}
      <div className="glass rounded-xl w-56 shrink-0 p-3 flex flex-col gap-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
          Canais
        </p>
        {FIXED_CHANNELS.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setChannel(ch.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all text-left w-full",
              channel === ch.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Hash className="h-4 w-4 shrink-0" />
            {ch.label}
          </button>
        ))}
        {userChannels.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mt-3 mb-1">
              Pessoas
            </p>
            {userChannels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setChannel(ch.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all text-left w-full",
                  channel === ch.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">{ch.label}</span>
              </button>
            ))}
          </>
        )}
        {contactChannelsList.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mt-3 mb-1">
              Contatos avulsos
            </p>
            {contactChannelsList.map((channelId) => (
              <button
                key={channelId}
                onClick={() => setChannel(channelId)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all text-left w-full truncate",
                  channel === channelId
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                title={contactChannelLabel(channelId)}
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">{contactChannelLabel(channelId)}</span>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col glass rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3 bg-secondary/30">
          <Hash className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">{currentChannelLabel}</span>
          <span className="text-xs text-muted-foreground ml-2">
            {messages?.length ?? 0} mensagens
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages && messages.length > 0 ? (
            messages.map((msg) => {
              const isOwn = msg.sender_id === profile?.id
              return (
                <div
                  key={msg.id}
                  className={cn("flex gap-3 max-w-[80%]", isOwn && "ml-auto flex-row-reverse")}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isOwn ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    )}
                  >
                    {(msg.sender_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div
                    className={cn(
                      "rounded-xl px-4 py-2.5",
                      isOwn ? "bg-primary/10 border border-primary/20" : "bg-secondary"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-foreground">
                        {msg.sender_name ?? "Sistema"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma mensagem neste canal</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {channel.startsWith(CONTACT_CHANNEL_PREFIX)
                  ? "Envie a primeira mensagem para iniciar a conversa."
                  : "Seja o primeiro a enviar uma mensagem!"}
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="border-t border-border p-4">
          <div className="flex gap-3">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Mensagem em #${currentChannelLabel}...`}
              className="flex-1 h-10 rounded-lg border border-border bg-secondary px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!message.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
