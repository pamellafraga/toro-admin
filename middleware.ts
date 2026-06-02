import { handleAuthMiddleware } from "@/lib/middleware/auth"
import { type NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  const redirect = handleAuthMiddleware(request)
  if (redirect) return redirect
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
