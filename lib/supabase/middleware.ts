import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check for local auth
  const authCookie = request.cookies.get('toro_auth')?.value
  const hasLocalAuth = authCookie ? JSON.parse(authCookie).authenticated : false

  // Redirect unauthenticated users to login
  if (
    request.nextUrl.pathname.startsWith('/dashboard') &&
    !user &&
    !hasLocalAuth
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login
  if (
    request.nextUrl.pathname === '/login' &&
    (user || hasLocalAuth)
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Redirect root to dashboard or login
  if (request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = (user || hasLocalAuth) ? '/dashboard' : '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
