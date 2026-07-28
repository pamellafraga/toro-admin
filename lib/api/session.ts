export const AUTH_COOKIE = "toro_auth"

export interface AuthSession {
  user: string
  displayName: string
  role: "admin" | "comercial"
  authenticated: boolean
}
