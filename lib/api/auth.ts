import type { NextRequest, NextResponse } from "next/server"
import { AUTH_COOKIE, type AuthSession } from "@/lib/api/session"

export { AUTH_COOKIE, type AuthSession } from "@/lib/api/session"
export { hashPassword } from "@/lib/api/password"

export function parseAuthCookie(request: NextRequest): AuthSession | null {
  try {
    const cookie = request.cookies.get(AUTH_COOKIE)?.value
    if (!cookie) return null
    const parsed = JSON.parse(cookie)
    if (!(parsed.authenticated || parsed.user)) return null
    const roleRaw = String(parsed.role ?? "").trim().toLowerCase()
    const role: AuthSession["role"] =
      roleRaw === "comercial" ? "comercial" : "admin"

    return {
      user: parsed.user ?? "",
      displayName: parsed.displayName ?? parsed.user ?? "",
      role,
      authenticated: true,
    }
  } catch {
    return null
  }
}

export function isAuthenticated(request: NextRequest): boolean {
  return parseAuthCookie(request) !== null
}

export function isAdmin(request: NextRequest): boolean {
  return parseAuthCookie(request)?.role === "admin"
}

export function setAuthCookie(response: NextResponse, session: Omit<AuthSession, "authenticated">): void {
  const payload: AuthSession = { ...session, authenticated: true }
  response.cookies.set({
    name: AUTH_COOKIE,
    value: JSON.stringify(payload),
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  })
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set({
    name: AUTH_COOKIE,
    value: "",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  })
}
