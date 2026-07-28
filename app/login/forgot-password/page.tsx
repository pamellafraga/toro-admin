"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { User, Lock, Loader2, ArrowLeft, KeyRound } from "lucide-react"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [username, setUsername] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")
    const trimmed = username.trim()
    if (!trimmed) {
      setError("Informe o usuário.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Erro ao enviar código.")
        setLoading(false)
        return
      }
      setUsername(trimmed)
      setMessage(data.message ?? "Se o usuário estiver cadastrado, você receberá o código em instantes.")
      setStep(2)
    } catch {
      setError("Erro de conexão. Tente novamente.")
    }
    setLoading(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!code.trim()) {
      setError("Informe o código recebido por e-mail.")
      return
    }
    if (newPassword.length < 6) {
      setError("A nova senha deve ter no mínimo 6 caracteres.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          code: code.trim(),
          newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Erro ao redefinir senha.")
        setLoading(false)
        return
      }
      router.push("/login?reset=ok")
    } catch {
      setError("Erro de conexão. Tente novamente.")
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#101010]">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: "url('/images/login-gym-bg.png')" }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-[#101010]/70" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#101010]/40 via-transparent to-[#101010]/85" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[420px] px-5">
        <div className="overflow-hidden rounded-3xl border border-[#E3DBCC]/25 bg-[#FDFCF8]/95 shadow-2xl backdrop-blur-sm">
          <div className="px-8 py-10 sm:px-10 sm:py-12">
            <div className="mb-8 flex justify-center">
              <Image
                src="/logo.png"
                alt="Toro"
                width={180}
                height={58}
                className="object-contain"
                priority
              />
            </div>

            <div className="mb-6 flex items-center gap-2 text-[#5c5c5c]">
              <KeyRound className="h-5 w-5 text-[#101010]" />
              <h1 className="text-lg font-semibold text-[#101010]">
                {step === 1 ? "Esqueci minha senha" : "Código e nova senha"}
              </h1>
            </div>

            {step === 1 ? (
              <form onSubmit={handleSendCode} className="flex flex-col gap-5">
                <p className="text-sm text-[#94a3b8]">
                  Informe o usuário (login) do painel. Enviaremos um código de verificação para você alterar a senha.
                </p>
                <div className="flex flex-col gap-2">
                  <label htmlFor="username" className="text-xs font-semibold tracking-wider uppercase text-[#94a3b8]">
                    Usuário
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#475569]" />
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ex.: Roberto"
                      autoComplete="username"
                      className="h-12 w-full rounded-xl border border-[#E3DBCC] bg-[#F3F0E9]/50 pl-11 pr-4 text-sm text-[#101010] placeholder:text-[#9a9a9a] focus:border-[#101010]/30 focus:outline-none"
                    />
                  </div>
                </div>
                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-[#101010] font-semibold text-[#FDFCF8] shadow-lg hover:bg-[#2a2a2a] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar código por e-mail"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
                {message && (
                  <div className="rounded-xl border border-[#E3DBCC] bg-[#F3F0E9] px-4 py-3 text-sm text-[#101010]">
                    {message}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label htmlFor="code" className="text-xs font-semibold tracking-wider uppercase text-[#94a3b8]">
                    Código recebido por e-mail
                  </label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="h-12 w-full rounded-xl border border-[#E3DBCC] bg-[#F3F0E9]/50 px-4 text-center text-lg tracking-[0.4em] text-[#101010] placeholder:text-[#9a9a9a] focus:border-[#101010]/30 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="newPassword" className="text-xs font-semibold tracking-wider uppercase text-[#94a3b8]">
                    Nova senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#475569]" />
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      className="h-12 w-full rounded-xl border border-[#E3DBCC] bg-[#F3F0E9]/50 pl-11 pr-4 text-sm text-[#101010] placeholder:text-[#9a9a9a] focus:border-[#101010]/30 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="confirmPassword" className="text-xs font-semibold tracking-wider uppercase text-[#94a3b8]">
                    Confirmar nova senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#475569]" />
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="h-12 w-full rounded-xl border border-[#E3DBCC] bg-[#F3F0E9]/50 pl-11 pr-4 text-sm text-[#101010] placeholder:text-[#9a9a9a] focus:border-[#101010]/30 focus:outline-none"
                    />
                  </div>
                </div>
                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-[#101010] font-semibold text-[#FDFCF8] shadow-lg hover:bg-[#2a2a2a] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redefinir senha"}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(""); setCode(""); setNewPassword(""); setConfirmPassword(""); }}
                  className="text-sm text-[#101010] hover:underline"
                >
                  Usar outro usuário
                </button>
              </form>
            )}

            <div className="mt-8 flex justify-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
