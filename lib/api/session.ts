export const AUTH_COOKIE = "xpress_auth"

export interface AuthSession {
  user: string
  displayName: string
  role: "admin" | "comercial"
  authenticated: boolean
}
