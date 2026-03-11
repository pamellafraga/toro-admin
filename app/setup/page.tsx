"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SetupPage() {
  const [result, setResult] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  // Auto-execute on mount
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/setup-admin", { method: "POST" })
        const data = await res.json()
        console.log("[v0] Setup result:", data)
        if (data.error) {
          setResult("Erro: " + data.error)
        } else {
          setResult(data.message || "Admin criado!")
          setSuccess(true)
        }
      } catch (err) {
        setResult("Erro de conexao: " + String(err))
      }
      setLoading(false)
    }
    run()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020817] p-8">
      <div className="w-full max-w-md rounded-2xl border border-[#1e3a5f] bg-[#0a1128] p-8 text-center">
        <h1 className="mb-4 text-xl font-bold text-[#e2e8f0]">
          Setup - Xpress Solutions
        </h1>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0ea5e9] border-t-transparent" />
            <p className="text-sm text-[#94a3b8]">Criando usuario admin...</p>
          </div>
        )}

        {!loading && success && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-semibold text-emerald-400">{result}</p>
            <div className="mt-2 rounded-lg border border-[#1e3a5f] bg-[#050a18] p-4 text-left text-sm">
              <p className="text-[#94a3b8]">Login: <span className="font-mono font-bold text-[#e2e8f0]">admin</span></p>
              <p className="text-[#94a3b8]">Senha: <span className="font-mono font-bold text-[#e2e8f0]">{'Blg/101029'}</span></p>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="mt-2 w-full rounded-xl bg-[#0ea5e9] px-6 py-3 font-semibold text-white transition-all hover:bg-[#0284c7]"
            >
              Ir para Login
            </button>
          </div>
        )}

        {!loading && !success && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm text-red-300">{result}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 rounded-xl bg-[#1e3a5f] px-6 py-3 font-semibold text-[#e2e8f0] transition-all hover:bg-[#2a4a6f]"
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
