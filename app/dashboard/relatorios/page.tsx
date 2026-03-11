"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Download, FileText, Users, Package, Shield } from "lucide-react"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type ReportType = "clients" | "contracts" | "seguradoras"

const REPORTS = [
  { type: "clients" as ReportType, label: "Relatorio de Clientes", icon: Users, description: "Lista completa de clientes com dados de contato e status" },
  { type: "contracts" as ReportType, label: "Relatorio de Contratacoes", icon: Package, description: "Todas as contratacoes com status de pagamento e valores" },
  { type: "seguradoras" as ReportType, label: "Relatório de Corretoras", icon: Shield, description: "Contatos de corretoras com status de prospecção e atribuições" },
]

export default function RelatoriosPage() {
  const supabase = createClient()
  const [generating, setGenerating] = useState<ReportType | null>(null)

  const generateCSV = async (type: ReportType) => {
    setGenerating(type)
    try {
      let csvContent = ""
      let filename = ""

      if (type === "clients") {
        const { data } = await supabase.from("clients").select("*").order("name")
        if (!data || data.length === 0) { toast.error("Nenhum dado para exportar"); return }
        csvContent = "Nome,Email,Telefone,CPF/CNPJ,Empresa,Cidade,Estado,Ativo,Cadastro\n"
        data.forEach(c => {
          csvContent += `"${c.name}","${c.email || ''}","${c.phone || ''}","${c.cpf_cnpj || ''}","${c.company_name || ''}","${c.city || ''}","${c.state || ''}","${c.is_active ? 'Sim' : 'Nao'}","${c.created_at}"\n`
        })
        filename = "clientes.csv"
      } else if (type === "contracts") {
        const { data } = await supabase.from("contracts").select("*, clients(name, cpf_cnpj), products(name)").order("created_at", { ascending: false })
        if (!data || data.length === 0) { toast.error("Nenhum dado para exportar"); return }
        csvContent = "Cliente,CPF/CNPJ,Produto,Status,Pagamento,Valor Mensal,Inicio,Fim\n"
        data.forEach(c => {
          csvContent += `"${c.clients?.name || ''}","${c.clients?.cpf_cnpj || ''}","${c.products?.name || ''}","${c.status}","${c.payment_status}","${c.monthly_value}","${c.start_date}","${c.end_date || ''}"\n`
        })
        filename = "contratacoes.csv"
      } else {
        const { data } = await supabase.from("seguradoras").select("*").order("name")
        if (!data || data.length === 0) { toast.error("Nenhum dado para exportar"); return }
        csvContent = "Nome,CNPJ,Telefone,Email,Cidade,Estado,Etapa,Atribuido a,Status Contato\n"
        data.forEach(s => {
          csvContent += `"${s.name}","${s.cnpj || ''}","${s.phone || ''}","${s.email || ''}","${s.city || ''}","${s.state || ''}","${s.kanban_column}","${s.assigned_name || ''}","${s.contact_status}"\n`
        })
        filename = "seguradoras.csv"
      }

      const BOM = "\uFEFF"
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
      toast.success(`${filename} exportado com sucesso!`)
    } catch {
      toast.error("Erro ao gerar relatorio")
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Relatorios</h2>
        <p className="text-sm text-muted-foreground mt-1">Exporte dados do sistema em formato CSV</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {REPORTS.map((report) => (
          <div key={report.type} className="glass rounded-xl p-6 flex flex-col gap-4 hover:glow-blue-sm transition-all">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <report.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{report.label}</h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{report.description}</p>
            <button
              onClick={() => generateCSV(report.type)}
              disabled={generating === report.type}
              className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              {generating === report.type ? "Gerando..." : "Exportar CSV"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
