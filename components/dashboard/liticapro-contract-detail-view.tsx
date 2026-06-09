"use client"

import { Building2, FileText, Mail, MapPin, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCnaeEntries } from "@/lib/liticapro/cnae"
import { LiticaProLinkedCnpjsSection } from "@/components/dashboard/liticapro-linked-cnpjs-section"
import { getPrimaryLinkedCompany } from "@/lib/liticapro/linked-company-display"
import type { CnpjGovData } from "@/lib/liticapro/types"
import type { LiticaProWelcomeEmailInfo } from "@/lib/liticapro/welcome-email-display"
import { LiticaProWelcomeEmailBadge } from "@/components/dashboard/liticapro-welcome-email-badge"

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  const isEmpty = value === null || value === undefined || value === ""
  const content = isEmpty ? "—" : value
  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none mb-1">
        {label}
      </p>
      <div className={cn("text-sm text-foreground leading-snug break-words", mono && "font-mono text-[13px]")}>
        {content}
      </div>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof Building2
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-w-0 h-full">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-primary/20">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">{title}</h4>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function StatusBadge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "sky" | "emerald" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        variant === "sky" && "bg-sky-500/15 text-sky-600 dark:text-sky-400",
        variant === "emerald" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        variant === "default" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  )
}

export interface LiticaProContractDetailViewProps {
  clientName: string
  cpfCnpj: string
  customerType: "empresa" | "profissional_liberal"
  responsibleName: string
  email: string
  phone: string
  zipCode: string
  address: string
  number: string
  district: string
  city: string
  state: string
  businessSegment: string
  statesOfInterest: string[]
  gov: CnpjGovData | null
  linkedCnpjs?: Array<Record<string, unknown>>
  cadastroLabel: string
  trialEndLabel: string
  productStatusLabel: string
  paymentLabel: string
  origemCaptacao: string
  contatoLabel: string
  notes: string
  devEmpresa?: string
  devUsuario?: string
  devSenha?: string
  showDev?: boolean
  welcomeEmail?: LiticaProWelcomeEmailInfo
  onResendWelcomeEmail?: () => void
  resendingWelcomeEmail?: boolean
  onEdit: () => void
  onClose: () => void
}

export function LiticaProContractDetailView({
  clientName,
  cpfCnpj,
  customerType,
  responsibleName,
  email,
  phone,
  zipCode,
  address,
  number,
  district,
  city,
  state,
  businessSegment,
  statesOfInterest,
  gov,
  linkedCnpjs = [],
  cadastroLabel,
  trialEndLabel,
  productStatusLabel,
  paymentLabel,
  origemCaptacao,
  contatoLabel,
  notes,
  devEmpresa,
  devUsuario,
  devSenha,
  showDev,
  welcomeEmail,
  onResendWelcomeEmail,
  resendingWelcomeEmail,
  onEdit,
  onClose,
}: LiticaProContractDetailViewProps) {
  const cnaes = getCnaeEntries(gov)
  const modalidade = customerType === "profissional_liberal" ? "Profissional liberal" : "Empresa"
  const primaryLinked = getPrimaryLinkedCompany({
    customer_type: customerType,
    linked_cnpjs: linkedCnpjs,
  })
  const cidadeUf = [city, state].filter(Boolean).join(" / ") || "—"
  const logradouro =
    address && !address.includes(district) && district
      ? [address, number !== "SN" && number ? number : null].filter(Boolean).join(", ")
      : address || "—"

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 pb-1 border-b border-border">
        <div className="min-w-0 space-y-2">
          <h3 className="text-xl font-semibold text-foreground leading-tight">{clientName || "—"}</h3>
          <div className="flex flex-wrap items-center gap-2">
            {customerType === "empresa" && responsibleName ? (
              <span className="text-sm text-muted-foreground">{responsibleName}</span>
            ) : null}
            <StatusBadge variant="sky">{productStatusLabel}</StatusBadge>
            <StatusBadge>{paymentLabel}</StatusBadge>
            {trialEndLabel !== "—" ? (
              <StatusBadge variant="default">Teste até {trialEndLabel}</StatusBadge>
            ) : null}
            {welcomeEmail?.sent && welcomeEmail.sentAtLabel ? (
              <StatusBadge variant="emerald">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  E-mail enviado
                </span>
              </StatusBadge>
            ) : welcomeEmail?.provisioned ? (
              <StatusBadge variant="default">E-mail pendente</StatusBadge>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Bloco principal — 3 colunas iguais */}
      <div className="rounded-xl border border-border bg-muted/15 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border">
          <div className="p-4">
            <Panel title="Identificação" icon={Building2}>
              <InfoRow
                label={customerType === "profissional_liberal" ? "CPF" : "CNPJ"}
                value={cpfCnpj}
                mono
              />
              {customerType === "profissional_liberal" ? (
                <>
                  <InfoRow label="Empresa vinculada" value={primaryLinked?.razaoSocial} />
                  <InfoRow label="CNPJ vinculado" value={primaryLinked?.cnpjFormatted} mono />
                </>
              ) : null}
              <InfoRow label="Modalidade" value={modalidade} />
              {customerType === "empresa" ? (
                <InfoRow label="Responsável" value={responsibleName} />
              ) : null}
              <InfoRow label="E-mail" value={email} />
              <InfoRow label="Telefone" value={phone} />
            </Panel>
          </div>

          <div className="p-4">
            <Panel title="Endereço" icon={MapPin}>
              <InfoRow label="CEP" value={zipCode} mono />
              <InfoRow label="Logradouro" value={logradouro} />
              {district ? <InfoRow label="Bairro" value={district} /> : null}
              <InfoRow label="Cidade / UF" value={cidadeUf} />
              <InfoRow
                label="Estados de interesse"
                value={
                  statesOfInterest.length ? (
                    <span className="inline-flex flex-wrap gap-1">
                      {statesOfInterest.map((uf) => (
                        <span key={uf} className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                          {uf}
                        </span>
                      ))}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </Panel>
          </div>

          <div className="p-4">
            <Panel title="Contrato" icon={FileText}>
              <InfoRow label="Cadastro" value={cadastroLabel} />
              <InfoRow label="Fim do teste" value={trialEndLabel} />
              <InfoRow label="Produto" value={productStatusLabel} />
              <InfoRow label="Pagamento" value={paymentLabel} />
              <InfoRow label="Origem" value={origemCaptacao} />
              <InfoRow label="Contato" value={<StatusBadge variant="emerald">{contatoLabel}</StatusBadge>} />
              <InfoRow
                label="E-mail de acesso"
                value={
                  welcomeEmail ? (
                    <div className="space-y-1">
                      <LiticaProWelcomeEmailBadge
                        info={welcomeEmail}
                        onResend={onResendWelcomeEmail}
                        resending={resendingWelcomeEmail}
                      />
                      {welcomeEmail.sent && welcomeEmail.channelLabel ? (
                        <p className="text-[11px] text-muted-foreground">Canal: {welcomeEmail.channelLabel}</p>
                      ) : null}
                      {welcomeEmail.provisionedAtLabel ? (
                        <p className="text-[11px] text-muted-foreground">
                          Ferramenta configurada em {welcomeEmail.provisionedAtLabel}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    "—"
                  )
                }
              />
            </Panel>
          </div>
        </div>
      </div>

      {customerType === "profissional_liberal" ? (
        <div className="rounded-xl border border-border bg-muted/10 p-4">
          <LiticaProLinkedCnpjsSection linkedCnpjs={linkedCnpjs} readOnly />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(180px,240px)] gap-4 rounded-xl border border-border bg-muted/10 p-4">
          <div>
            <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-2">CNAEs da Receita Federal</p>
            {cnaes.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {cnaes.map((cnae) => (
                  <span
                    key={`${cnae.tipo}-${cnae.codigo}-${cnae.descricao}`}
                    className={cn(
                      "inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px] leading-tight border",
                      cnae.tipo === "principal"
                        ? "bg-primary/10 text-foreground border-primary/20"
                        : "bg-background text-muted-foreground border-border",
                    )}
                    title={cnae.descricao}
                  >
                    <span
                      className={cn(
                        "shrink-0 rounded px-1 text-[9px] font-bold uppercase",
                        cnae.tipo === "principal" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {cnae.tipo === "principal" ? "Principal" : "Sec."}
                    </span>
                    <span>
                      {cnae.codigo ? `${cnae.codigo} — ` : ""}
                      {cnae.descricao || "—"}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="xl:border-l xl:border-border xl:pl-4">
            <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-2">Ramo de atuação</p>
            <p className="text-sm font-medium text-foreground">{businessSegment || "—"}</p>
          </div>
        </div>
      )}

      {notes.trim() ? (
        <div className="rounded-xl border border-border bg-muted/10 px-4 py-3">
          <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-1">Observações</p>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{notes}</p>
        </div>
      ) : null}

      {showDev && (devEmpresa || devUsuario || devSenha) ? (
        <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-sky-100 mb-3 font-light">Dados do desenvolvedor</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1 font-light">
                {customerType === "profissional_liberal" ? "CPF" : "Empresa"}
              </p>
              <p className="text-sm text-white/90 break-words font-light">{devEmpresa || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1 font-light">Usuário</p>
              <p className="text-sm text-white/90 break-words font-light">{devUsuario || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1 font-light">Senha</p>
              <p className="text-sm text-white/90 break-words font-mono font-light">{devSenha || "—"}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
