"use client"

import { formatCpf } from "@/lib/format/br"

const devInputClass =
  "w-full h-10 rounded-lg border-2 border-primary/50 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
const devLabelClass = "text-xs font-medium text-zinc-400 mb-1 block"

interface Props {
  customerType?: "empresa" | "profissional_liberal"
  empresa: string
  setEmpresa: (v: string) => void
  usuario: string
  setUsuario: (v: string) => void
  senha: string
  setSenha: (v: string) => void
}

export function LiticaProDeveloperCredentialsBlock({
  customerType = "empresa",
  empresa,
  setEmpresa,
  usuario,
  setUsuario,
  senha,
  setSenha,
}: Props) {
  const isProfissional = customerType === "profissional_liberal"

  return (
    <div className="rounded-xl bg-zinc-950 p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold text-sky-100 uppercase tracking-wide">Dados do Desenvolvedor</p>
        <p className="text-[10px] text-zinc-400 mt-0.5">
          Credenciais de login do cliente na plataforma LiticaPro — visível apenas para administradores.
        </p>
      </div>

      <div>
        <label className={devLabelClass}>{isProfissional ? "CPF" : "Empresa"}</label>
        <input
          className={devInputClass}
          value={empresa}
          onChange={(e) => setEmpresa(isProfissional ? formatCpf(e.target.value) : e.target.value)}
          placeholder={isProfissional ? "000.000.000-00" : "Ex.: VERDANT ENGENHARIA LTDA"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={devLabelClass}>Usuário</label>
          <input
            className={devInputClass}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value.toUpperCase())}
            placeholder="Ex.: GUILHERME MEIRELES"
          />
        </div>
        <div>
          <label className={devLabelClass}>Senha</label>
          <input
            className={devInputClass}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Ex.: verdant2017"
          />
        </div>
      </div>
    </div>
  )
}
