"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Profile, Permission } from "@/lib/types"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  hasPermission: (permission: Permission) => boolean
  isAdmin: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  hasPermission: () => true,
  isAdmin: true,
  refreshProfile: async () => {},
})

const ADMIN_PROFILE: Profile = {
  id: "local-admin",
  name: "Admin",
  role: "admin",
  is_active: true,
  permissions: ["home", "produtos", "clientes", "seguradoras", "financeiro", "chat", "relatorios", "notificacoes", "atividades", "usuarios", "admin"] as Permission[],
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as Profile

function isLocallyAuthenticated(): boolean {
  try {
    // Checar localStorage
    const localAuth = localStorage.getItem("xpress_auth")
    if (localAuth) {
      const parsed = JSON.parse(localAuth)
      if (parsed.authenticated || parsed.user) return true
    }
  } catch {}
  try {
    // Checar cookie
    if (document.cookie.includes("xpress_auth=")) return true
  } catch {}
  return false
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const isLocalAuth = useRef(false)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const sb = supabaseRef.current

    // Verificar autenticação local PRIMEIRO
    if (isLocallyAuthenticated()) {
      isLocalAuth.current = true
      let username = "Admin"
      try {
        const raw = localStorage.getItem("xpress_auth")
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed.user) username = parsed.user
        }
      } catch {}

      const adminProfile = { ...ADMIN_PROFILE, name: username }
      setProfile(adminProfile)
      setLoading(false)

      // Não inicializar Supabase listener para não sobrescrever
      return
    }

    // Sem auth local: tentar Supabase
    const init = async () => {
      try {
        const { data } = await sb.auth.getSession()
        const sessionUser = data?.session?.user ?? null
        setUser(sessionUser)
        if (sessionUser) {
          // Tratar qualquer usuário Supabase como admin nesta aplicação
          const adminProfile = { ...ADMIN_PROFILE, name: sessionUser.email?.split("@")[0] || "Admin", id: sessionUser.id }
          setProfile(adminProfile)
        }
      } catch {}
      setLoading(false)
    }

    init()

    const { data: { subscription } } = sb.auth.onAuthStateChange(
      (event, session) => {
        if (isLocalAuth.current) return // ignorar se auth local ativo
        const newUser = session?.user ?? null
        setUser(newUser)
        if (newUser) {
          const adminProfile = { ...ADMIN_PROFILE, name: newUser.email?.split("@")[0] || "Admin", id: newUser.id }
          setProfile(adminProfile)
        } else {
          setProfile(null)
        }
      }
    )

    // Timeout de segurança
    const timeout = setTimeout(() => setLoading(false), 2000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const isAdmin = true // todos os usuários autenticados são admin

  const hasPermission = () => true // todos os itens visíveis para usuários autenticados

  const refreshProfile = async () => {}

  return (
    <AuthContext.Provider value={{ user, profile, loading, hasPermission, isAdmin, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
