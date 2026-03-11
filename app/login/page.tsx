"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Eye, EyeOff, Loader2, Lock, User, ArrowRight } from "lucide-react"

/* ── Floating particle canvas ── */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)

    const particles: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = []
    const count = 80

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
        o: Math.random() * 0.5 + 0.1,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(14, 165, 233, ${p.o})`
        ctx.fill()

        // connect nearby
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]
          const dx = p.x - q.x
          const dy = p.y - q.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.strokeStyle = `rgba(14, 165, 233, ${0.06 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animationId = requestAnimationFrame(draw)
    }

    draw()

    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0"
      aria-hidden="true"
    />
  )
}

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Load saved credentials on mount
  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem("xpress_remember")
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
      // Chamar API de login
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Credenciais inválidas")
        setLoading(false)
        return
      }

      // Save or clear credentials based on "remember me"
      if (rememberMe) {
        localStorage.setItem("xpress_remember", JSON.stringify({ login: username.trim(), pass: password }))
      } else {
        localStorage.removeItem("xpress_remember")
      }

      // Store login session in localStorage too
      localStorage.setItem("xpress_auth", JSON.stringify({ user: username.trim(), authenticated: true }))

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (err) {
      setError("Erro ao conectar ao servidor")
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020817]">
      {/* ── Animated background layers ── */}
      <ParticleField />

      {/* Radial gradient core glow */}
      <div className="pointer-events-none absolute z-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent opacity-40 left-1/2 top-1/2" />

      {/* Horizontal scan-line at top */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-0 h-px bg-gradient-to-r from-transparent via-[#0ea5e9]/30 to-transparent" />
      {/* Horizontal scan-line at bottom */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 h-px bg-gradient-to-r from-transparent via-[#0ea5e9]/20 to-transparent" />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-sky-500/5 to-transparent" />

      {/* Floating orbs */}
      <div className="pointer-events-none absolute left-[15%] top-[20%] z-0 h-2 w-2 animate-pulse rounded-full bg-sky-500/40 shadow-[0_0_20px_rgba(14,165,233,0.4)]" />
      <div className="pointer-events-none absolute right-[20%] top-[30%] z-0 h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
      <div className="pointer-events-none absolute left-[25%] bottom-[35%] z-0 h-1 w-1 animate-pulse rounded-full bg-sky-500/25 shadow-[0_0_12px_rgba(14,165,233,0.25)]" />
      <div className="pointer-events-none absolute right-[12%] bottom-[25%] z-0 h-2.5 w-2.5 animate-pulse rounded-full bg-sky-500/20 shadow-[0_0_25px_rgba(14,165,233,0.2)]" />
      <div className="pointer-events-none absolute left-[50%] top-[12%] z-0 h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500/20 shadow-[0_0_18px_rgba(6,182,212,0.2)]" />

      {/* ── Main card ── */}
      <div
        className={`relative z-10 w-full max-w-[420px] px-5 transition-all duration-700 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        {/* Card outer glow ring */}
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-[#0ea5e9]/25 via-[#0ea5e9]/5 to-[#0ea5e9]/10 blur-sm" />

        <div
          className="relative overflow-hidden rounded-3xl border border-sky-500/15 bg-gradient-to-br from-slate-950 to-slate-900 shadow-2xl"
        >
          {/* Inner top accent line */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#0ea5e9]/40 to-transparent" />

          {/* Corner accents */}
          <div className="absolute top-0 left-0 h-8 w-px bg-gradient-to-b from-[#0ea5e9]/40 to-transparent" />
          <div className="absolute top-0 left-0 h-px w-8 bg-gradient-to-r from-[#0ea5e9]/40 to-transparent" />
          <div className="absolute top-0 right-0 h-8 w-px bg-gradient-to-b from-[#0ea5e9]/40 to-transparent" />
          <div className="absolute top-0 right-0 h-px w-8 bg-gradient-to-l from-[#0ea5e9]/40 to-transparent" />
          <div className="absolute bottom-0 left-0 h-8 w-px bg-gradient-to-t from-[#0ea5e9]/20 to-transparent" />
          <div className="absolute bottom-0 left-0 h-px w-8 bg-gradient-to-r from-[#0ea5e9]/20 to-transparent" />
          <div className="absolute bottom-0 right-0 h-8 w-px bg-gradient-to-t from-[#0ea5e9]/20 to-transparent" />
          <div className="absolute bottom-0 right-0 h-px w-8 bg-gradient-to-l from-[#0ea5e9]/20 to-transparent" />

          <div className="relative px-8 py-10 sm:px-10 sm:py-12">
            {/* Logo area */}
            <div className="mb-10 flex flex-col items-center gap-3">
              <div className="relative">
                {/* Logo glow */}
                <div className="absolute -inset-4 rounded-full bg-[#0ea5e9]/5 blur-2xl" />
                <Image
                  src="/images/logo.png"
                  alt="Xpress Solutions"
                  width={200}
                  height={65}
                  className="relative object-contain drop-shadow-[0_0_20px_rgba(14,165,233,0.3)]"
                  priority
                />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#0ea5e9]/30" />
                <span className="text-xs font-medium tracking-[0.25em] uppercase text-[#0ea5e9]/60">
                  Painel Administrativo
                </span>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#0ea5e9]/30" />
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              {/* Login field */}
              <div className="flex flex-col gap-2">
                <label htmlFor="username" className="text-xs font-semibold tracking-wider uppercase text-[#94a3b8]">
                  Login
                </label>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-0 rounded-xl border border-[#0ea5e9]/0 transition-all duration-300 group-focus-within:border-[#0ea5e9]/30 group-focus-within:shadow-[0_0_15px_rgba(14,165,233,0.1)]" />
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#475569] transition-colors group-focus-within:text-[#0ea5e9]" />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Digite seu login"
                    required
                    autoComplete="username"
                    className="h-12 w-full rounded-xl border border-[#1e3a5f]/60 bg-[#070e20]/80 pl-11 pr-4 text-sm font-medium text-[#e2e8f0] placeholder:text-[#475569] transition-all focus:border-[#0ea5e9]/40 focus:bg-[#0a1128] focus:outline-none"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-xs font-semibold tracking-wider uppercase text-[#94a3b8]">
                  Senha
                </label>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-0 rounded-xl border border-[#0ea5e9]/0 transition-all duration-300 group-focus-within:border-[#0ea5e9]/30 group-focus-within:shadow-[0_0_15px_rgba(14,165,233,0.1)]" />
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#475569] transition-colors group-focus-within:text-[#0ea5e9]" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                    className="h-12 w-full rounded-xl border border-[#1e3a5f]/60 bg-[#070e20]/80 pl-11 pr-12 text-sm font-medium text-[#e2e8f0] placeholder:text-[#475569] transition-all focus:border-[#0ea5e9]/40 focus:bg-[#0a1128] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#475569] transition-colors hover:text-[#e2e8f0]"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me toggle */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className="group flex items-center gap-3"
                >
                  <div
                    className={`relative h-5 w-9 rounded-full transition-all duration-300 ${
                      rememberMe
                        ? "bg-[#0ea5e9] shadow-[0_0_10px_rgba(14,165,233,0.3)]"
                        : "bg-[#1e3a5f]/60"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all duration-300 shadow-sm ${
                        rememberMe ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </div>
                  <span className="text-xs font-medium text-[#94a3b8] transition-colors group-hover:text-[#e2e8f0]">
                    Lembrar-me
                  </span>
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                  <div className="h-2 w-2 flex-shrink-0 rounded-full bg-red-400 animate-pulse" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative mt-2 h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
              >
                {/* Button shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
                <div className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <span>Acessar Dashboard</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#1e3a5f]/50 to-transparent" />
              <p className="text-[11px] tracking-wider text-[#475569]">
                {'Xpress Solutions \u00A9 2026 \u2014 Todos os direitos reservados'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
