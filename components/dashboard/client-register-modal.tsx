"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Building2, Loader2, Save, User } from "lucide-react"
import { formatCep } from "@/lib/format/br"
import { ORIGEM_CAPTACAO_OPCOES, origemCaptacaoForComercial } from "@/lib/constants/origem-captacao"
import { STATUS_LEAD_OPTIONS } from "@/lib/clients/status-lead"

const inputClass =
  "w-full h-8 rounded-lg border-2 border-primary/50 bg-background px-2.5 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
const labelClass = "text-[11px] font-medium text-muted-foreground mb-0.5 block"
const sectionClass = "space-y-2"
const sectionTitleClass = "text-[11px] font-semibold text-primary uppercase tracking-wide"

export type ClientCustomerType = "empresa" | "profissional_liberal"

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={sectionClass}>
      <p className={sectionTitleClass}>{title}</p>
      {children}
    </section>
  )
}

export interface NewClientFormState {
  customer_type: ClientCustomerType | ""
  name: string
  email: string
  phone: string
  cpf_cnpj: string
  company_name: string
  address: string
  number: string
  district: string
  city: string
  state: string
  zip_code: string
  notes: string
  origem_captacao: string
  status_lead: string
}

const STATUS_COMERCIAL_FORM = STATUS_LEAD_OPTIONS

function getOpcoesOrigem(isComercial: boolean, comercialDisplayName: string | null) {
  if (isComercial && comercialDisplayName) {
    const auto = origemCaptacaoForComercial(comercialDisplayName)
    return [
      { value: "", label: "Em branco" },
      { value: auto, label: auto },
    ]
  }
  return [
    { value: "", label: "—" },
    ...ORIGEM_CAPTACAO_OPCOES.map((opt) => ({ value: opt, label: opt })),
  ]
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  saving?: boolean
  form: NewClientFormState
  setForm: React.Dispatch<React.SetStateAction<NewClientFormState>>
  formatCpfCnpj: (value: string) => string
  formatPhone: (value: string) => string
  isComercial: boolean
  comercialDisplayName: string | null
}

export function ClientRegisterModal({
  open,
  onClose,
  onSubmit,
  saving = false,
  form,
  setForm,
  formatCpfCnpj,
  formatPhone,
  isComercial,
  comercialDisplayName,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1)

  useEffect(() => {
    if (!open) {
      setStep(1)
      return
    }
    if (form.customer_type) setStep(2)
  }, [open, form.customer_type])

  useEffect(() => {
    if (!open || !isComercial || !comercialDisplayName) return
    const auto = origemCaptacaoForComercial(comercialDisplayName)
    setForm((prev) => (prev.origem_captacao ? prev : { ...prev, origem_captacao: auto }))
  }, [open, isComercial, comercialDisplayName, setForm])

  const handleCepBlur = async () => {
    const raw = form.zip_code.replace(/\D/g, "")
    if (raw.length !== 8) return
    try {
      const res = await fetch(`/api/geo/cep?value=${encodeURIComponent(raw)}`)
      const data = await res.json()
      if (!res.ok) return
      setForm((prev) => ({
        ...prev,
        zip_code: data.cep ? formatCep(data.cep) : prev.zip_code,
        city: data.city || prev.city,
        state: (data.state || prev.state || "").toUpperCase(),
        district: data.district || prev.district,
        address: data.street || prev.address,
      }))
    } catch {
      // ignora
    }
  }

  const selectType = (type: ClientCustomerType) => {
    setForm((prev) => ({ ...prev, customer_type: type }))
    setStep(2)
  }

  const handleClose = () => {
    setStep(1)
    onClose()
  }

  if (!open) return null

  const origemOpcoes = getOpcoesOrigem(isComercial, comercialDisplayName)
  const isEmpresa = form.customer_type === "empresa"
  const isProfLiberal = form.customer_type === "profissional_liberal"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
      <div className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl bg-background border border-border p-4 shadow-xl">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Novo cliente</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {step === 1
                ? "Selecione o tipo de cadastro para continuar."
                : "Cadastro geral de contato — use Produtos → LiticaPro para registrar teste grátis ou assinatura."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
          >
            Fechar
          </button>
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => selectType("empresa")}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <Building2 className="h-10 w-10 text-primary" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Empresa</p>
                <p className="text-xs text-muted-foreground mt-1">CNPJ, razão social e endereço</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => selectType("profissional_liberal")}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <User className="h-10 w-10 text-primary" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Profissional Liberal</p>
                <p className="text-xs text-muted-foreground mt-1">Nome completo — CPF e e-mail opcionais</p>
              </div>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setStep(1)
                setForm((prev) => ({ ...prev, customer_type: "" }))
              }}
              className="text-xs text-primary hover:underline"
            >
              ← Voltar ao tipo de cadastro
            </button>

            <FormSection title="Identificação">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="col-span-2 lg:col-span-1">
                  <label className={labelClass}>
                    {isEmpresa ? "Razão social *" : "Nome completo *"}
                  </label>
                  <input
                    className={inputClass}
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder={isEmpresa ? "Razão social da empresa" : "Nome completo do profissional"}
                  />
                </div>
                <div>
                  <label className={labelClass}>{isEmpresa ? "CNPJ" : "CPF (opcional)"}</label>
                  <input
                    className={inputClass}
                    value={form.cpf_cnpj}
                    onChange={(e) => setForm((p) => ({ ...p, cpf_cnpj: formatCpfCnpj(e.target.value) }))}
                    placeholder={isEmpresa ? "00.000.000/0000-00" : "000.000.000-00"}
                  />
                </div>
                {isEmpresa && (
                  <div>
                    <label className={labelClass}>Nome fantasia</label>
                    <input
                      className={inputClass}
                      value={form.company_name}
                      onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </FormSection>

            <FormSection title="Contato">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>
                    E-mail{isProfLiberal ? " (opcional)" : ""}
                  </label>
                  <input
                    type={isProfLiberal ? "text" : "email"}
                    inputMode={isProfLiberal ? "email" : undefined}
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder={isProfLiberal ? "Opcional" : undefined}
                  />
                </div>
                <div>
                  <label className={labelClass}>Telefone / WhatsApp</label>
                  <input
                    className={inputClass}
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
                  />
                </div>
              </div>
            </FormSection>

            {isEmpresa && (
              <FormSection title="Endereço">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>CEP</label>
                    <input
                      className={inputClass}
                      value={form.zip_code}
                      onChange={(e) => setForm((p) => ({ ...p, zip_code: formatCep(e.target.value) }))}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Logradouro</label>
                    <input
                      className={inputClass}
                      value={form.address}
                      onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Número</label>
                    <input
                      className={inputClass}
                      value={form.number}
                      onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Bairro</label>
                    <input
                      className={inputClass}
                      value={form.district}
                      onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Cidade / UF</label>
                    <div className="flex gap-2">
                      <input
                        className={inputClass}
                        placeholder="Cidade"
                        value={form.city}
                        onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                      />
                      <input
                        className={`w-16 shrink-0 ${inputClass}`}
                        placeholder="UF"
                        maxLength={2}
                        value={form.state}
                        onChange={(e) => setForm((p) => ({ ...p, state: e.target.value.toUpperCase() }))}
                      />
                    </div>
                  </div>
                </div>
              </FormSection>
            )}

            <FormSection title="Comercial">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Origem de captação</label>
                  <select
                    className={inputClass}
                    value={form.origem_captacao}
                    onChange={(e) => setForm((p) => ({ ...p, origem_captacao: e.target.value }))}
                  >
                    {origemOpcoes.map((opt) => (
                      <option key={opt.value || "blank"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status de contato</label>
                  <select
                    className={inputClass}
                    value={form.status_lead}
                    onChange={(e) => setForm((p) => ({ ...p, status_lead: e.target.value }))}
                  >
                    {STATUS_COMERCIAL_FORM.map((opt) => (
                      <option key={opt.id || "blank"} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </FormSection>

            <FormSection title="Observações">
              <textarea
                rows={2}
                className={`${inputClass} h-auto py-1.5 resize-none`}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notas sobre o contato"
              />
            </FormSection>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                disabled={saving}
                onClick={onSubmit}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar cliente
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
