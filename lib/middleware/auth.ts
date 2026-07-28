import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIE } from "@/lib/api/session"

function hasLocalAuth(request: NextRequest): boolean {
  try {
    const cookie = request.cookies.get(AUTH_COOKIE)?.value
    if (!cookie) return false
    const parsed = JSON.parse(cookie)
    return !!(parsed.authenticated || parsed.user)
  } catch {
    return false
  }
}

/** Middleware de autenticação baseado em cookie (PostgreSQL / login local). */
export function handleAuthMiddleware(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl
  const authenticated = hasLocalAuth(request)

  if (pathname === "/dashboard/chat") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith("/dashboard") && !authenticated) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (pathname === "/login" && authenticated) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone()
    url.pathname = authenticated ? "/dashboard" : "/login"
    return NextResponse.redirect(url)
  }

  return null
}
