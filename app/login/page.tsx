"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Eye, EyeOff, Loader2, Lock, User, ArrowRight } from "lucide-react"

function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const resetSuccess = searchParams.get("reset") === "ok"

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem("toro_remember")
      if (saved) {
        const { login, pass } = JSON.parse(saved)
        if (login) setUsername(login)
        if (pass) setPassword(pass)
        setRememberMe(true)
      }
    } catch {
      // ignore
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Credenciais inválidas")
        setLoading(false)
        return
      }

      if (rememberMe) {
        localStorage.setItem("toro_remember", JSON.stringify({ login: username.trim(), pass: password }))
      } else {
        localStorage.removeItem("toro_remember")
      }

      localStorage.setItem(
        "toro_auth",
        JSON.stringify({
          user: data.user ?? username.trim(),
          displayName: data.displayName ?? data.user ?? username.trim(),
          role: data.role ?? "admin",
          authenticated: true,
        })
      )

      router.push("/dashboard")
    } catch {
      setError("Erro ao conectar ao servidor")
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#101010]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(227,219,204,0.08),transparent_60%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E3DBCC]/30 to-transparent" />

      <div
        className={`relative z-10 w-full max-w-[420px] px-5 transition-all duration-700 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        <div className="overflow-hidden rounded-3xl border border-[#E3DBCC]/20 bg-[#FDFCF8] shadow-2xl">
          <div className="relative px-8 py-10 sm:px-10 sm:py-12">
            <div className="mb-10 flex flex-col items-center gap-3">
              <Image
                src="/logo.png"
                alt="Toro"
                width={200}
                height={65}
                className="object-contain"
                priority
              />
              <p className="text-xs tracking-[0.25em] uppercase text-[#5c5c5c]">Painel Administrativo</p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="username" className="text-xs font-semibold tracking-wider uppercase text-[#5c5c5c]">
                  Login
                </label>
                <div className="group relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a] transition-colors group-focus-within:text-[#101010]" />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Digite seu login"
                    required
                    autoComplete="username"
                    className="h-12 w-full rounded-xl border border-[#E3DBCC] bg-[#F3F0E9]/50 pl-11 pr-4 text-sm font-medium text-[#101010] placeholder:text-[#9a9a9a] transition-all focus:border-[#101010]/30 focus:bg-[#F3F0E9] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-xs font-semibold tracking-wider uppercase text-[#5c5c5c]">
                  Senha
                </label>
                <div className="group relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a] transition-colors group-focus-within:text-[#101010]" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                    className="h-12 w-full rounded-xl border border-[#E3DBCC] bg-[#F3F0E9]/50 pl-11 pr-12 text-sm font-medium text-[#101010] placeholder:text-[#9a9a9a] transition-all focus:border-[#101010]/30 focus:bg-[#F3F0E9] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9a9a9a] transition-colors hover:text-[#101010]"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className="group flex items-center gap-3"
                >
                  <div
                    className={`relative h-5 w-9 rounded-full transition-all duration-300 ${
                      rememberMe ? "bg-[#101010]" : "bg-[#E3DBCC]"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all duration-300 shadow-sm ${
                        rememberMe ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </div>
                  <span className="text-xs font-medium text-[#5c5c5c] transition-colors group-hover:text-[#101010]">
                    Lembrar-me
                  </span>
                </button>
                <a
                  href="/login/forgot-password"
                  className="text-xs font-medium text-[#101010] hover:underline transition-colors"
                >
                  Esqueci minha senha
                </a>
              </div>

              {resetSuccess && (
                <div className="flex items-center gap-3 rounded-xl border border-[#E3DBCC] bg-[#F3F0E9] px-4 py-3">
                  <div className="h-2 w-2 flex-shrink-0 rounded-full bg-[#101010]" />
                  <p className="text-sm text-[#101010]">Senha alterada com sucesso. Faça login com a nova senha.</p>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                  <div className="h-2 w-2 flex-shrink-0 rounded-full bg-red-400 animate-pulse" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative mt-2 h-12 w-full overflow-hidden rounded-xl bg-[#101010] font-semibold text-[#FDFCF8] shadow-lg transition-all hover:bg-[#2a2a2a] disabled:opacity-50"
              >
                <div className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <span>Acessar Painel</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </div>
              </button>
            </form>

            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#E3DBCC] to-transparent" />
              <p className="text-[11px] tracking-wider text-[#9a9a9a]">
                {'Toro \u00A9 2026 \u2014 Moda Fitness'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#101010]">
          <Loader2 className="h-8 w-8 animate-spin text-[#E3DBCC]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
