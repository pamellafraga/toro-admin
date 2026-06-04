"use client"

import { useState, useEffect, useCallback, type ReactNode } from "react"
import { Building2, User, Loader2, Plus, Trash2, Search, Link2 } from "lucide-react"
import type { Client } from "@/lib/types"
import { isPlaceholderCpfCnpj } from "@/lib/clients/cpf-cnpj-display"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { formatCep, formatCnpj, formatCpf, formatPhone } from "@/lib/format/br"
import { suggestDeveloperUsername, readDeveloperCredentialsFromLiticaProData } from "@/lib/liticapro/developer-credentials"
import { ORIGEM_CAPTACAO_OPCOES, origemCaptacaoForComercial } from "@/lib/constants/origem-captacao"
import { getOrigemCaptacaoFormOptions } from "@/lib/clients/comercial-client-guard"
import { LiticaProDeveloperCredentialsBlock } from "@/components/dashboard/liticapro-developer-credentials-block"
import { LiticaProCnaeAndRamoSection, LiticaProCnaeAndRamoCompact } from "@/components/dashboard/liticapro-cnae-section"
import { LiticaProStatesSelector } from "@/components/dashboard/liticapro-states-selector"
import type { CnpjGovData } from "@/lib/liticapro/types"

type CustomerType = "empresa" | "profissional_liberal" | null

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** Contato da listagem — pré-preenche e vincula no cadastro */
  initialClient?: Client | null
}

const inputClass =
  "w-full h-8 rounded-lg border-2 border-primary/50 bg-background px-2.5 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
const labelClass = "text-[11px] font-medium text-muted-foreground mb-0.5 block"
const sectionClass = "space-y-2"
const sectionTitleClass = "text-[11px] font-semibold text-primary uppercase tracking-wide"

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={sectionClass}>
      <p className={sectionTitleClass}>{title}</p>
      {children}
    </section>
  )
}

function applyGovToCompanyFields(gov: CnpjGovData, setters: {
  setCompanyLegalName: (v: string) => void
  setCompanyTradeName: (v: string) => void
  setCompanyZip: (v: string) => void
  setCompanyAddress: (v: string) => void
  setCompanyNumber: (v: string) => void
  setCompanyDistrict: (v: string) => void
  setCompanyCity: (v: string) => void
  setCompanyState: (v: string) => void
}) {
  setters.setCompanyLegalName(gov.razao_social)
  setters.setCompanyTradeName(gov.nome_fantasia ?? "")
  setters.setCompanyZip(gov.cep ? formatCep(gov.cep) : "")
  setters.setCompanyAddress(gov.logradouro ?? "")
  setters.setCompanyNumber(gov.numero ?? "")
  setters.setCompanyDistrict(gov.bairro ?? "")
  setters.setCompanyCity(gov.municipio ?? "")
  setters.setCompanyState(gov.uf ?? "")
}

function buildCompanyGovPayload(
  base: CnpjGovData | null,
  cnpjDigits: string,
  fields: {
    companyLegalName: string
    companyTradeName: string
    companyZip: string
    companyAddress: string
    companyNumber: string
    companyDistrict: string
    companyCity: string
    companyState: string
  },
): CnpjGovData {
  return {
    cnpj: cnpjDigits,
    razao_social: fields.companyLegalName.trim(),
    nome_fantasia: fields.companyTradeName.trim() || null,
    logradouro: fields.companyAddress.trim() || null,
    numero: fields.companyNumber.trim() || null,
    bairro: fields.companyDistrict.trim() || null,
    municipio: fields.companyCity.trim() || null,
    uf: fields.companyState.trim() || null,
    cep: fields.companyZip.replace(/\D/g, "") || null,
    cnae_fiscal: base?.cnae_fiscal ?? null,
    cnae_fiscal_descricao: base?.cnae_fiscal_descricao ?? null,
    cnaes_secundarios: base?.cnaes_secundarios ?? [],
    descricao_situacao_cadastral: base?.descricao_situacao_cadastral ?? null,
  }
}

export function LiticaProRegisterModal({ open, onClose, onSuccess, initialClient }: Props) {
  const { isAdmin, isComercial, comercialDisplayName } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [customerType, setCustomerType] = useState<CustomerType>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingCnpj, setLoadingCnpj] = useState(false)

  // Empresa
  const [cnpj, setCnpj] = useState("")
  const [companyGov, setCompanyGov] = useState<CnpjGovData | null>(null)
  const [companyLegalName, setCompanyLegalName] = useState("")
  const [companyTradeName, setCompanyTradeName] = useState("")
  const [companyZip, setCompanyZip] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")
  const [companyNumber, setCompanyNumber] = useState("")
  const [companyDistrict, setCompanyDistrict] = useState("")
  const [companyCity, setCompanyCity] = useState("")
  const [companyState, setCompanyState] = useState("")
  const [responsibleName, setResponsibleName] = useState("")
  const [businessSegment, setBusinessSegment] = useState("")

  // Profissional liberal
  const [cpf, setCpf] = useState("")
  const [fullName, setFullName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [linkedCnpjs, setLinkedCnpjs] = useState<Array<{ cnpj: string; gov: CnpjGovData | null; razaoSocial: string; segment: string }>>([
    { cnpj: "", gov: null, razaoSocial: "", segment: "" },
  ])
  const [billingZip, setBillingZip] = useState("")
  const [billingAddress, setBillingAddress] = useState("")
  const [billingNumber, setBillingNumber] = useState("")
  const [billingDistrict, setBillingDistrict] = useState("")
  const [billingCity, setBillingCity] = useState("")
  const [billingState, setBillingState] = useState("")

  // Comum
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [linkedClient, setLinkedClient] = useState<Client | null>(null)
  const [lookingUpContact, setLookingUpContact] = useState(false)
  const [statesOfInterest, setStatesOfInterest] = useState<string[]>([])
  const [origemCaptacao, setOrigemCaptacao] = useState("")

  // Dados do desenvolvedor (somente admin)
  const [devEmpresa, setDevEmpresa] = useState("")
  const [devUsuario, setDevUsuario] = useState("")
  const [devSenha, setDevSenha] = useState("")

  const clearCompanyFields = () => {
    setCompanyLegalName("")
    setCompanyTradeName("")
    setCompanyZip("")
    setCompanyAddress("")
    setCompanyNumber("")
    setCompanyDistrict("")
    setCompanyCity("")
    setCompanyState("")
  }

  const fillCompanyFromGov = (gov: CnpjGovData) => {
    setCompanyGov(gov)
    applyGovToCompanyFields(gov, {
      setCompanyLegalName,
      setCompanyTradeName,
      setCompanyZip,
      setCompanyAddress,
      setCompanyNumber,
      setCompanyDistrict,
      setCompanyCity,
      setCompanyState,
    })
    if (isAdmin) {
      setDevEmpresa((prev) => (prev.trim() ? prev : gov.razao_social))
    }
  }

  const reset = () => {
    setStep(1)
    setCustomerType(null)
    setError(null)
    setCnpj("")
    setCompanyGov(null)
    clearCompanyFields()
    setResponsibleName("")
    setBusinessSegment("")
    setCpf("")
    setFullName("")
    setBirthDate("")
    setLinkedCnpjs([{ cnpj: "", gov: null, razaoSocial: "", segment: "" }])
    setBillingZip("")
    setBillingAddress("")
    setBillingNumber("")
    setBillingDistrict("")
    setBillingCity("")
    setBillingState("")
    setEmail("")
    setPhone("")
    setLinkedClient(null)
    setLookingUpContact(false)
    setStatesOfInterest([])
    setOrigemCaptacao("")
    setDevEmpresa("")
    setDevUsuario("")
    setDevSenha("")
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const fetchCnpj = useCallback(async (raw: string): Promise<CnpjGovData | null> => {
    const digits = raw.replace(/\D/g, "")
    if (digits.length !== 14) return null
    setLoadingCnpj(true)
    try {
      const res = await fetch(`/api/geo/cnpj?value=${digits}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "CNPJ não encontrado.")
        return null
      }
      return data as CnpjGovData
    } catch {
      toast.error("Erro ao consultar CNPJ.")
      return null
    } finally {
      setLoadingCnpj(false)
    }
  }, [])

  // Consulta automática quando CNPJ completo (empresa)
  useEffect(() => {
    if (customerType !== "empresa") return
    const digits = cnpj.replace(/\D/g, "")
    if (digits.length !== 14) {
      setCompanyGov(null)
      clearCompanyFields()
      return
    }
    if (companyGov?.cnpj === digits) return
    const t = setTimeout(() => {
      fetchCnpj(cnpj).then((gov) => {
        if (gov) fillCompanyFromGov(gov)
      })
    }, 600)
    return () => clearTimeout(t)
  }, [cnpj, customerType, companyGov?.cnpj, fetchCnpj])

  useEffect(() => {
    if (!isAdmin) return
    const name = customerType === "empresa" ? responsibleName : fullName
    const suggested = suggestDeveloperUsername(name)
    if (!suggested) return
    setDevUsuario((prev) => (prev.trim() ? prev : suggested))
  }, [responsibleName, fullName, isAdmin, customerType])

  useEffect(() => {
    if (!isAdmin || customerType !== "profissional_liberal") return
    const cpfFormatted = cpf.trim()
    if (!cpfFormatted) return
    setDevEmpresa((prev) => (prev.trim() ? prev : cpfFormatted))
  }, [cpf, isAdmin, customerType])

  const handleCnpjBlur = async () => {
    const gov = await fetchCnpj(cnpj)
    if (gov) fillCompanyFromGov(gov)
  }

  const handleLinkedCnpjBlur = async (index: number) => {
    const item = linkedCnpjs[index]
    if (!item) return
    const gov = await fetchCnpj(item.cnpj)
    if (gov) {
      setLinkedCnpjs((prev) =>
        prev.map((x, i) =>
          i === index
            ? {
                ...x,
                gov,
                razaoSocial: gov.razao_social,
                segment: x.segment,
              }
            : x,
        ),
      )
    }
  }

  const handleCompanyCepBlur = async () => {
    const cep = companyZip.replace(/\D/g, "")
    if (cep.length !== 8) return
    try {
      const res = await fetch(`/api/geo/cep?value=${cep}`)
      const data = await res.json()
      if (!res.ok) return
      setCompanyAddress(data.street || companyAddress)
      setCompanyDistrict(data.district || companyDistrict)
      setCompanyCity(data.city || companyCity)
      setCompanyState(data.state || companyState)
    } catch {
      // ignora
    }
  }

  const handleBillingCepBlur = async () => {
    const cep = billingZip.replace(/\D/g, "")
    if (cep.length !== 8) return
    try {
      const res = await fetch(`/api/geo/cep?value=${cep}`)
      const data = await res.json()
      if (!res.ok) return
      setBillingAddress(data.street || billingAddress)
      setBillingDistrict(data.district || billingDistrict)
      setBillingCity(data.city || billingCity)
      setBillingState(data.state || billingState)
    } catch {
      // ignora
    }
  }

  const toggleState = (uf: string) => {
    setStatesOfInterest((prev) =>
      prev.includes(uf) ? prev.filter((s) => s !== uf) : [...prev, uf],
    )
  }

  const applyDeveloperCredentials = useCallback(
    (liticaproData: unknown) => {
      if (!isAdmin) return
      const dev = readDeveloperCredentialsFromLiticaProData(liticaproData)
      if (!dev) return
      if (dev.empresa) setDevEmpresa(dev.empresa)
      if (dev.usuario) setDevUsuario(dev.usuario)
      if (dev.senha) setDevSenha(dev.senha)
    },
    [isAdmin],
  )

  const applyLinkedClient = useCallback(
    (client: Client) => {
      setLinkedClient(client)
      const lp = (client.liticapro_data ?? {}) as Record<string, unknown>
      if (client.email && client.email.includes("@")) setEmail(client.email)
      if (client.phone) setPhone(formatPhone(client.phone))
      if (client.origem_captacao) {
        if (isComercial && comercialDisplayName) {
          const own = origemCaptacaoForComercial(comercialDisplayName)
          if ((client.origem_captacao ?? "").trim() === own) setOrigemCaptacao(own)
        } else {
          setOrigemCaptacao(client.origem_captacao)
        }
      }

      const docDigits = isPlaceholderCpfCnpj(client.cpf_cnpj)
        ? ""
        : String(client.cpf_cnpj ?? "").replace(/\D/g, "")

      if (customerType === "empresa" || docDigits.length === 14) {
        if (docDigits.length === 14) setCnpj(formatCnpj(docDigits))
        if (client.name) setCompanyLegalName(client.name)
        if (client.company_name) setCompanyTradeName(client.company_name)
        if (lp.responsible_name) setResponsibleName(String(lp.responsible_name))
        else if (client.name && !companyLegalName) setResponsibleName(client.name)
        if (client.zip_code) setCompanyZip(formatCep(client.zip_code))
        if (client.address) setCompanyAddress(client.address)
        if (client.number) setCompanyNumber(client.number)
        if (client.district) setCompanyDistrict(client.district)
        if (client.city) setCompanyCity(client.city)
        if (client.state) setCompanyState(client.state)
      }

      if (customerType === "profissional_liberal" || docDigits.length === 11) {
        if (docDigits.length === 11) setCpf(formatCpf(docDigits))
        setFullName(client.name)
        if (lp.birth_date) setBirthDate(String(lp.birth_date))
      }

      if (!customerType && client.name) {
        setResponsibleName(client.name)
        setFullName(client.name)
      }

      if (lp.business_segment) setBusinessSegment(String(lp.business_segment))
      if (Array.isArray(lp.states_of_interest)) {
        setStatesOfInterest(lp.states_of_interest as string[])
      }

      applyDeveloperCredentials(lp)
    },
    [customerType, companyLegalName, isComercial, comercialDisplayName, applyDeveloperCredentials],
  )

  const lookupContactByValue = useCallback(
    async (value: string) => {
      const digits = value.replace(/\D/g, "")
      const trimmed = value.trim()
      let query = ""
      if (digits.length >= 10) {
        query = `phone=${encodeURIComponent(digits)}`
      } else if (trimmed.includes("@") && trimmed.length >= 5) {
        query = `email=${encodeURIComponent(trimmed.toLowerCase())}`
      } else {
        return
      }

      setLookingUpContact(true)
      try {
        const res = await fetch(`/api/clients/search?${query}`, { credentials: "include" })
        const data = (await res.json()) as { client: Client | null }
        if (data.client) {
          applyLinkedClient(data.client)
          toast.success(`Contato encontrado: ${data.client.name}`)
        } else if (linkedClient) {
          setLinkedClient(null)
        }
      } catch {
        // ignora falha de rede
      } finally {
        setLookingUpContact(false)
      }
    },
    [applyLinkedClient, linkedClient],
  )

  useEffect(() => {
    if (!open || !isComercial || !comercialDisplayName) return
    const own = origemCaptacaoForComercial(comercialDisplayName)
    setOrigemCaptacao(own)
  }, [open, isComercial, comercialDisplayName])

  useEffect(() => {
    if (!open || !initialClient) return

    const docDigits = isPlaceholderCpfCnpj(initialClient.cpf_cnpj)
      ? ""
      : String(initialClient.cpf_cnpj ?? "").replace(/\D/g, "")

    const resolvedType: CustomerType =
      initialClient.customer_type === "profissional_liberal" || docDigits.length === 11
        ? "profissional_liberal"
        : initialClient.customer_type === "empresa" ||
            docDigits.length === 14 ||
            Boolean(initialClient.company_name?.trim())
          ? "empresa"
          : "empresa"

    setCustomerType(resolvedType)
    setStep(2)
  }, [open, initialClient?.id])

  useEffect(() => {
    if (!open || !initialClient || customerType === null) return
    applyLinkedClient(initialClient)
  }, [open, initialClient?.id, customerType, applyLinkedClient])

  useEffect(() => {
    if (step !== 2) return
    if (initialClient) return
    const primary = phone.replace(/\D/g, "").length >= 10 ? phone : email
    const digits = primary.replace(/\D/g, "")
    const trimmed = primary.trim()
    if (digits.length < 10 && !trimmed.includes("@")) return

    const t = setTimeout(() => {
      lookupContactByValue(primary)
    }, 600)
    return () => clearTimeout(t)
  }, [phone, email, step, lookupContactByValue])

  const handleSubmit = async () => {
    setError(null)
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        customer_type: customerType,
        email,
        phone,
        origem_captacao: origemCaptacao,
        states_of_interest: statesOfInterest,
        ...(linkedClient?.id ? { client_id: linkedClient.id } : {}),
      }

      if (customerType === "empresa") {
        const cnpjDigits = cnpj.replace(/\D/g, "")
        let gov = companyGov
        if (!gov?.razao_social) {
          gov = await fetchCnpj(cnpj)
          if (gov) fillCompanyFromGov(gov)
        }
        if (!companyLegalName.trim() && !gov?.razao_social) {
          setError("Não foi possível consultar o CNPJ. Clique em Consultar ou verifique o número.")
          setSaving(false)
          return
        }
        if (!companyLegalName.trim()) {
          setError("Informe a razão social da empresa.")
          setSaving(false)
          return
        }
        if (!businessSegment.trim()) {
          setError("Informe o ramo de atuação.")
          setSaving(false)
          return
        }
        const companyGovPayload = buildCompanyGovPayload(gov, cnpjDigits, {
          companyLegalName,
          companyTradeName,
          companyZip,
          companyAddress,
          companyNumber,
          companyDistrict,
          companyCity,
          companyState,
        })
        payload.cnpj = cnpj
        payload.responsible_name = responsibleName
        payload.business_segment = businessSegment
        payload.company_gov = companyGovPayload
      } else {
        const withGov = linkedCnpjs.filter((x) => x.gov)
        if (withGov.length === 0) {
          setError("Consulte ao menos um CNPJ válido na Receita Federal.")
          setSaving(false)
          return
        }
        if (withGov.some((x) => !x.segment.trim())) {
          setError("Informe o ramo de atuação para cada CNPJ vinculado.")
          setSaving(false)
          return
        }
        payload.cpf = cpf
        payload.full_name = fullName
        payload.birth_date = birthDate
        payload.linked_cnpjs = withGov.map((x) => ({
          ...x.gov!,
          razao_social: x.razaoSocial.trim() || x.gov!.razao_social,
          ramo_atuacao: x.segment.trim(),
        }))
      }

      if (isAdmin) {
        const saved = linkedClient
          ? readDeveloperCredentialsFromLiticaProData(linkedClient.liticapro_data)
          : null
        const empresa = devEmpresa.trim() || saved?.empresa || ""
        const usuario = devUsuario.trim() || saved?.usuario || ""
        const senha = devSenha.trim() || saved?.senha || ""
        if (empresa || usuario || senha) {
          payload.dados_desenvolvedor = { empresa, usuario, senha }
        }
      }

      const res = await fetch("/api/contracts/register/liticapro", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao registrar")

      toast.success(data.message || "Teste grátis iniciado!")
      handleClose()
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao registrar")
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3">
      <div className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl bg-background border border-border p-4 shadow-xl">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Registrar compra — LicitaPregão</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Teste grátis de 7 dias a partir da data de cadastro. Plano e pagamento serão definidos após o período de teste.
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

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setCustomerType("empresa")
                setStep(2)
              }}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <Building2 className="h-10 w-10 text-primary" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Empresa</p>
                <p className="text-xs text-muted-foreground mt-1">CNPJ único, responsável pelo cadastro</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomerType("profissional_liberal")
                setStep(2)
              }}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <User className="h-10 w-10 text-primary" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Profissional Liberal</p>
                <p className="text-xs text-muted-foreground mt-1">CPF + um ou mais CNPJs vinculados</p>
              </div>
            </button>
          </div>
        )}

        {step === 2 && customerType === "empresa" && (
          <div className="space-y-3">
            <button type="button" onClick={() => setStep(1)} className="text-xs text-primary hover:underline">
              ← Voltar ao tipo de cadastro
            </button>

            <FormSection title="Consulta CNPJ">
              <div>
                <label className={labelClass}>CNPJ da empresa *</label>
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    value={cnpj}
                    onChange={(e) => {
                      setCnpj(formatCnpj(e.target.value))
                      setCompanyGov(null)
                      clearCompanyFields()
                    }}
                    onBlur={handleCnpjBlur}
                    placeholder="00.000.000/0000-00"
                  />
                  <button
                    type="button"
                    disabled={loadingCnpj || cnpj.replace(/\D/g, "").length !== 14}
                    onClick={async () => {
                      const gov = await fetchCnpj(cnpj)
                      if (gov) {
                        fillCompanyFromGov(gov)
                        toast.success("Dados da empresa carregados.")
                      }
                    }}
                    className="shrink-0 rounded-lg border-2 border-primary px-3 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    {loadingCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : "Consultar"}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">A consulta na Receita é automática ao digitar os 14 dígitos.</p>
              </div>
            </FormSection>

            <FormSection title="Dados da empresa">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Razão social *</label>
                  <input
                    className={inputClass}
                    value={companyLegalName}
                    onChange={(e) => setCompanyLegalName(e.target.value)}
                    placeholder="Preenchido automaticamente pelo CNPJ"
                  />
                </div>
                <div>
                  <label className={labelClass}>Nome fantasia</label>
                  <input
                    className={inputClass}
                    value={companyTradeName}
                    onChange={(e) => setCompanyTradeName(e.target.value)}
                    placeholder="Preenchido automaticamente pelo CNPJ"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Endereço da empresa">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>CEP</label>
                  <input
                    className={inputClass}
                    value={companyZip}
                    onChange={(e) => setCompanyZip(formatCep(e.target.value))}
                    onBlur={handleCompanyCepBlur}
                    placeholder="00000-000"
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Endereço</label>
                  <input
                    className={inputClass}
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="Logradouro"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Número</label>
                  <input
                    className={inputClass}
                    value={companyNumber}
                    onChange={(e) => setCompanyNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Bairro</label>
                  <input
                    className={inputClass}
                    value={companyDistrict}
                    onChange={(e) => setCompanyDistrict(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Cidade / UF</label>
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      value={companyCity}
                      onChange={(e) => setCompanyCity(e.target.value)}
                      placeholder="Cidade"
                    />
                    <input
                      className={`w-16 shrink-0 ${inputClass}`}
                      value={companyState}
                      onChange={(e) => setCompanyState(e.target.value.toUpperCase())}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection title="Responsável pelo cadastro">
              <div>
                <label className={labelClass}>Nome do responsável pelo cadastro *</label>
                <input className={inputClass} value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} />
              </div>
            </FormSection>

            <CommonFields
              email={email} setEmail={setEmail}
              phone={phone} setPhone={setPhone}
              statesOfInterest={statesOfInterest} toggleState={toggleState}
              origemCaptacao={origemCaptacao} setOrigemCaptacao={setOrigemCaptacao}
              isComercial={isComercial}
              comercialDisplayName={comercialDisplayName}
              linkedClient={linkedClient}
              lookingUpContact={lookingUpContact}
              onClearLink={() => setLinkedClient(null)}
            />

            <LiticaProCnaeAndRamoSection
              gov={companyGov}
              ramo={businessSegment}
              setRamo={setBusinessSegment}
              inline
            />

            {isAdmin && (
              <LiticaProDeveloperCredentialsBlock
                customerType="empresa"
                empresa={devEmpresa}
                setEmpresa={setDevEmpresa}
                usuario={devUsuario}
                setUsuario={setDevUsuario}
                senha={devSenha}
                setSenha={setDevSenha}
              />
            )}

            <SubmitRow saving={saving} onSubmit={handleSubmit} />
          </div>
        )}

        {step === 2 && customerType === "profissional_liberal" && (
          <div className="space-y-3">
            <button type="button" onClick={() => setStep(1)} className="text-xs text-primary hover:underline">
              ← Voltar ao tipo de cadastro
            </button>

            <FormSection title="Dados pessoais">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>CPF *</label>
                  <input className={inputClass} value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} />
                </div>
                <div>
                  <label className={labelClass}>Data de nascimento *</label>
                  <input type="date" className={inputClass} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Nome completo *</label>
                <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            </FormSection>

            <FormSection title="CNPJs vinculados">
              <p className="text-[10px] text-muted-foreground -mt-1">Consulta automática na Receita Federal ao sair do campo</p>
              {linkedCnpjs.map((item, index) => (
                <div key={index} className="space-y-2 pt-3 border-t border-border/40 first:border-t-0 first:pt-0">
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      value={item.cnpj}
                      onChange={(e) =>
                        setLinkedCnpjs((prev) =>
                          prev.map((x, i) =>
                            i === index
                              ? { cnpj: formatCnpj(e.target.value), gov: null, razaoSocial: "", segment: "" }
                              : x,
                          ),
                        )
                      }
                      onBlur={() => handleLinkedCnpjBlur(index)}
                      placeholder="CNPJ"
                    />
                    {linkedCnpjs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setLinkedCnpjs((prev) => prev.filter((_, i) => i !== index))}
                        className="shrink-0 rounded-lg border-2 border-primary/50 px-2 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Razão social</label>
                    <input
                      className={inputClass}
                      value={item.razaoSocial}
                      onChange={(e) =>
                        setLinkedCnpjs((prev) =>
                          prev.map((x, i) => (i === index ? { ...x, razaoSocial: e.target.value } : x)),
                        )
                      }
                      placeholder="Preenchido automaticamente pelo CNPJ"
                    />
                  </div>
                  <LiticaProCnaeAndRamoCompact gov={item.gov} ramo={item.segment} setRamo={(v) =>
                    setLinkedCnpjs((prev) =>
                      prev.map((x, i) => (i === index ? { ...x, segment: v } : x)),
                    )
                  } />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLinkedCnpjs((prev) => [...prev, { cnpj: "", gov: null, razaoSocial: "", segment: "" }])}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Adicionar outro CNPJ
              </button>
            </FormSection>

            <CommonFields
              email={email} setEmail={setEmail}
              phone={phone} setPhone={setPhone}
              statesOfInterest={statesOfInterest} toggleState={toggleState}
              origemCaptacao={origemCaptacao} setOrigemCaptacao={setOrigemCaptacao}
              isComercial={isComercial}
              comercialDisplayName={comercialDisplayName}
              emailRequired={false}
              linkedClient={linkedClient}
              lookingUpContact={lookingUpContact}
              onClearLink={() => setLinkedClient(null)}
            />

            {isAdmin && (
              <LiticaProDeveloperCredentialsBlock
                customerType="profissional_liberal"
                empresa={devEmpresa}
                setEmpresa={setDevEmpresa}
                usuario={devUsuario}
                setUsuario={setDevUsuario}
                senha={devSenha}
                setSenha={setDevSenha}
              />
            )}

            <SubmitRow saving={saving} onSubmit={handleSubmit} />
          </div>
        )}
      </div>
    </div>
  )
}

function CommonFields({
  email, setEmail, phone, setPhone,
  statesOfInterest, toggleState,
  origemCaptacao, setOrigemCaptacao,
  isComercial = false,
  comercialDisplayName = null,
  emailRequired = true,
  linkedClient,
  lookingUpContact,
  onClearLink,
}: {
  email: string
  setEmail: (v: string) => void
  phone: string
  setPhone: (v: string) => void
  statesOfInterest: string[]
  toggleState: (uf: string) => void
  origemCaptacao: string
  setOrigemCaptacao: (v: string) => void
  isComercial?: boolean
  comercialDisplayName?: string | null
  emailRequired?: boolean
  linkedClient?: Client | null
  lookingUpContact?: boolean
  onClearLink?: () => void
}) {
  return (
    <>
      <FormSection title="Contato">
        {linkedClient && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
            <Link2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Vinculado ao contato: {linkedClient.name}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Ao finalizar, o cadastro atualiza Contatos e Produtos LicitaPregão deste contato.
              </p>
            </div>
            {onClearLink && (
              <button
                type="button"
                onClick={onClearLink}
                className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground underline"
              >
                Desvincular
              </button>
            )}
          </div>
        )}
        {lookingUpContact && (
          <p className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Buscando contato no sistema...
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              E-mail ou telefone do contato{emailRequired ? " *" : ""}
            </label>
            <input
              type="text"
              inputMode="email"
              autoComplete="off"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={emailRequired ? "e-mail ou WhatsApp já cadastrado" : "Opcional — e-mail ou telefone"}
            />
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Digite o telefone aqui ou no campo ao lado para localizar o contato.
            </p>
          </div>
          <div>
            <label className={labelClass}>Telefone / WhatsApp *</label>
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Estados de interesse em licitações">
        <LiticaProStatesSelector selected={statesOfInterest} onToggle={toggleState} compact />
      </FormSection>

      <FormSection title="Origem da captação">
        <div>
          <label className={labelClass}>Origem da captação *</label>
          <select
            className={inputClass}
            value={origemCaptacao}
            onChange={(e) => setOrigemCaptacao(e.target.value)}
            disabled={isComercial && Boolean(comercialDisplayName)}
          >
            {isComercial && comercialDisplayName ? (
              <option value={origemCaptacaoForComercial(comercialDisplayName)}>
                {origemCaptacaoForComercial(comercialDisplayName)}
              </option>
            ) : (
              <>
                <option value="">Selecione...</option>
                {ORIGEM_CAPTACAO_OPCOES.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </>
            )}
          </select>
        </div>
      </FormSection>
    </>
  )
}

function SubmitRow({ saving, onSubmit }: { saving: boolean; onSubmit: () => void }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        disabled={saving}
        onClick={onSubmit}
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        Iniciar teste grátis (7 dias)
      </button>
      <p className="text-[11px] text-muted-foreground">Cadastro na data de hoje. O sistema notifica quando o teste expirar para você contatar o cliente.</p>
    </div>
  )
}
