import type { RegisterLiticaProTrialInput } from "@/lib/liticapro/register-trial"

type SiteSignupBody = {
  tipoPessoa?: "pf" | "pj"
  nome?: string
  documento?: string
  dataNascimento?: string
  email?: string
  telefone?: string
  empresas?: Array<{
    cnpj?: string
    razaoSocial?: string
    cnaes?: Array<{ codigo?: string; descricao?: string; principal?: boolean }>
  }>
  razaoSocial?: string
  nomeFantasia?: string
  responsavel?: string
  estado?: string
  cnaesAdicionais?: Array<{ codigo?: string; descricao?: string }>
}

function principalCnaeDescricao(
  cnaes?: Array<{ descricao?: string; principal?: boolean }>,
): string {
  if (!Array.isArray(cnaes) || cnaes.length === 0) return ""
  const principal = cnaes.find((c) => c.principal) ?? cnaes[0]
  return String(principal?.descricao ?? "").trim()
}

export function mapSiteSignupToLiticaProTrial(
  body: SiteSignupBody,
): RegisterLiticaProTrialInput | { error: string } {
  const tipoPessoa = body.tipoPessoa
  if (tipoPessoa !== "pf" && tipoPessoa !== "pj") {
    return { error: "Tipo de pessoa inválido." }
  }

  const email = String(body.email ?? "").trim().toLowerCase()
  const phone = String(body.telefone ?? "").trim()
  const statesOfInterest = String(body.estado ?? "")
    .split(",")
    .map((uf) => uf.trim().toUpperCase())
    .filter(Boolean)

  if (!email) return { error: "E-mail é obrigatório." }
  if (!phone) return { error: "Telefone é obrigatório." }
  if (statesOfInterest.length === 0) return { error: "Selecione ao menos um estado." }

  if (tipoPessoa === "pj") {
    const cnpj = String(body.documento ?? "").replace(/\D/g, "")
    const responsibleName = String(body.responsavel ?? body.nome ?? "").trim()
    const businessSegment =
      principalCnaeDescricao(
        body.cnaesAdicionais?.map((c) => ({ descricao: c.descricao, principal: false })),
      ) || "Licitações públicas"

    return {
      customer_type: "empresa",
      email,
      phone,
      origem_captacao: "Website",
      states_of_interest: statesOfInterest,
      cnpj,
      responsible_name: responsibleName,
      business_segment: businessSegment,
      company_name: String(body.razaoSocial ?? "").trim(),
      auto_provision: true,
      send_welcome_email: false,
      activity_actor: { displayName: "Site Xpress Solutions" },
    }
  }

  const cpf = String(body.documento ?? "").replace(/\D/g, "")
  const fullName = String(body.nome ?? "").trim()
  const linkedCnpjs = (body.empresas ?? []).map((empresa) => ({
    cnpj: String(empresa.cnpj ?? "").replace(/\D/g, ""),
    razao_social: String(empresa.razaoSocial ?? "").trim(),
    ramo_atuacao: principalCnaeDescricao(empresa.cnaes) || "Licitações públicas",
  }))

  return {
    customer_type: "profissional_liberal",
    email,
    phone,
    origem_captacao: "Website",
    states_of_interest: statesOfInterest,
    cpf,
    full_name: fullName,
    birth_date: String(body.dataNascimento ?? "").trim(),
    linked_cnpjs: linkedCnpjs,
    auto_provision: true,
    send_welcome_email: false,
    activity_actor: { displayName: "Site Xpress Solutions" },
  }
}
