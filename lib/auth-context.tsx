"use client"

import { createContext, useContext, useEffect, useMemo, useCallback, useState, useRef, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Profile, Permission, UserRole } from "@/lib/types"
import { ROLE_PERMISSIONS } from "@/lib/types"
import { userHasChamadosAccess } from "@/lib/chamados-access"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  hasPermission: (permission: Permission) => boolean
  isAdmin: boolean
  isComercial: boolean
  /** Nome do comercial para filtrar "meus clientes" / "minhas vendas" (ex.: Lisete, Stefanie) */
  comercialDisplayName: string | null
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  hasPermission: () => true,
  isAdmin: true,
  isComercial: false,
  comercialDisplayName: null,
  refreshProfile: async () => {},
})

const ADMIN_PROFILE: Profile = {
  id: "local-admin",
  name: "Admin",
  role: "admin",
  is_active: true,
  permissions: ["home", "chamados", "produtos", "estoque", "clientes", "seguradoras", "financeiro", "relatorios", "notificacoes", "atividades", "usuarios", "admin"] as Permission[],
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as Profile

function isLocallyAuthenticated(): boolean {
  try {
    // Checar localStorage
    const localAuth = localStorage.getItem("toro_auth")
    if (localAuth) {
      const parsed = JSON.parse(localAuth)
      if (parsed.authenticated || parsed.user) return true
    }
  } catch {}
  try {
    // Checar cookie
    if (document.cookie.includes("toro_auth=")) return true
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

    // Verificar autenticação local (cookie ou localStorage com payload do login)
    if (isLocallyAuthenticated()) {
      isLocalAuth.current = true
      let displayName = "Admin"
      let role: UserRole = "admin"
      let loginUsername = ""
      try {
        let parsed: { user?: string; displayName?: string; role?: string } = {}
        const raw = localStorage.getItem("toro_auth")
        if (raw) {
          try {
            parsed = JSON.parse(raw)
          } catch {}
        }
        if (!parsed.role && typeof document !== "undefined") {
          const cookieMatch = document.cookie.match(/toro_auth=([^;]+)/)
          if (cookieMatch) {
            try {
              const decoded = decodeURIComponent(cookieMatch[1].trim())
              parsed = JSON.parse(decoded)
            } catch {}
          }
        }
        if (parsed.displayName) displayName = parsed.displayName
        else if (parsed.user) displayName = parsed.user
        if (parsed.user) loginUsername = parsed.user
        if (parsed.role === "comercial" || parsed.role === "admin") role = parsed.role
      } catch {}

      let permissions = [...(ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.admin)] as Permission[]
      if (userHasChamadosAccess(displayName, loginUsername) && !permissions.includes("chamados")) {
        const homeIdx = permissions.indexOf("home")
        if (homeIdx >= 0) permissions.splice(homeIdx + 1, 0, "chamados")
        else permissions.unshift("chamados")
      }
      const profileData: Profile = {
        ...ADMIN_PROFILE,
        id: role === "comercial" ? `comercial-${displayName}` : "local-admin",
        name: displayName,
        role,
        permissions: permissions as Profile["permissions"],
      }
      setProfile(profileData)
      setLoading(false)
      return
    }

    // Sem auth local: tentar Supabase
    const init = async () => {
      try {
        const { data } = await sb.auth.getSession()
        const sessionUser = data?.session?.user ?? null
        setUser(sessionUser)
        if (sessionUser) {
          const meta = sessionUser.user_metadata as { name?: string } | undefined
          const fromEmail = sessionUser.email?.split("@")[0] || "Admin"
          const displayName = meta?.name?.trim() || fromEmail
          let perms = [...ROLE_PERMISSIONS.admin] as Permission[]
          if (userHasChamadosAccess(displayName, fromEmail) && !perms.includes("chamados")) {
            const hi = perms.indexOf("home")
            if (hi >= 0) perms.splice(hi + 1, 0, "chamados")
            else perms.unshift("chamados")
          }
          const adminProfile = {
            ...ADMIN_PROFILE,
            name: displayName,
            id: sessionUser.id,
            permissions: perms as Profile["permissions"],
          }
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
          const meta = newUser.user_metadata as { name?: string } | undefined
          const fromEmail = newUser.email?.split("@")[0] || "Admin"
          const displayName = meta?.name?.trim() || fromEmail
          let perms = [...ROLE_PERMISSIONS.admin] as Permission[]
          if (userHasChamadosAccess(displayName, fromEmail) && !perms.includes("chamados")) {
            const hi = perms.indexOf("home")
            if (hi >= 0) perms.splice(hi + 1, 0, "chamados")
            else perms.unshift("chamados")
          }
          const adminProfile = {
            ...ADMIN_PROFILE,
            name: displayName,
            id: newUser.id,
            permissions: perms as Profile["permissions"],
          }
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

  const role = (profile?.role ?? "admin") as UserRole
  const isAdmin = role === "admin"
  const isComercial = role === "comercial"
  const permissions = (profile?.permissions ??
    ROLE_PERMISSIONS[role] ??
    ROLE_PERMISSIONS.admin) as Permission[]
  const hasPermission = useCallback(
    (permission: Permission) => permissions.includes(permission),
    [permissions]
  )
  const comercialDisplayName = isComercial && profile?.name ? profile.name : null

  const refreshProfile = async () => {}

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      hasPermission,
      isAdmin,
      isComercial,
      comercialDisplayName,
      refreshProfile,
    }),
    [user, profile, loading, hasPermission, isAdmin, isComercial, comercialDisplayName]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
