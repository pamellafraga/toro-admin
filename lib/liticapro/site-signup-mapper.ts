import type { RegisterLiticaProTrialInput } from "@/lib/liticapro/register-trial"

type SiteEndereco = {
  cep?: string
  logradouro?: string
  numero?: string
  bairro?: string
  cidade?: string
  uf?: string
}

type SiteSignupBody = {
  tipoPessoa?: "pf" | "pj"
  nome?: string
  documento?: string
  dataNascimento?: string
  email?: string
  telefone?: string
  endereco?: SiteEndereco
  empresas?: Array<{
    cnpj?: string
    razaoSocial?: string
    estados?: string[]
    cnaes?: Array<{ codigo?: string; descricao?: string; principal?: boolean }>
  }>
  razaoSocial?: string
  nomeFantasia?: string
  responsavel?: string
  estado?: string
  cnaesAdicionais?: Array<{ codigo?: string; descricao?: string }>
  usuarios?: Array<{
    cpf?: string
    nomeCompleto?: string
    dataNascimento?: string
    email?: string
    is_owner?: boolean
  }>
}

function principalCnaeDescricao(
  cnaes?: Array<{ descricao?: string; principal?: boolean }>,
): string {
  if (!Array.isArray(cnaes) || cnaes.length === 0) return ""
  const principal = cnaes.find((c) => c.principal) ?? cnaes[0]
  return String(principal?.descricao ?? "").trim()
}

function mapBillingAddress(endereco?: SiteEndereco) {
  if (!endereco) return undefined
  return {
    cep: String(endereco.cep ?? "").replace(/\D/g, ""),
    logradouro: String(endereco.logradouro ?? "").trim(),
    numero: String(endereco.numero ?? "").trim(),
    bairro: String(endereco.bairro ?? "").trim(),
    cidade: String(endereco.cidade ?? "").trim(),
    uf: String(endereco.uf ?? "").trim().toUpperCase(),
  }
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
  const billingAddress = mapBillingAddress(body.endereco)

  if (tipoPessoa === "pf" && !email) return { error: "E-mail é obrigatório." }
  if (!phone) return { error: "Telefone é obrigatório." }
  if (statesOfInterest.length === 0) return { error: "Selecione ao menos um estado." }

  if (!billingAddress?.cep || billingAddress.cep.length !== 8) {
    return { error: "Informe o CEP do endereço de cobrança." }
  }
  if (!billingAddress.logradouro) return { error: "Informe o endereço de cobrança." }
  if (!billingAddress.numero) return { error: "Informe o número do endereço de cobrança." }
  if (!billingAddress.bairro) return { error: "Informe o bairro do endereço de cobrança." }
  if (!billingAddress.cidade) return { error: "Informe a cidade do endereço de cobrança." }
  if (!billingAddress.uf) return { error: "Informe a UF do endereço de cobrança." }

  if (tipoPessoa === "pj") {
    const cnpj = String(body.documento ?? "").replace(/\D/g, "")
    const usuariosInput = Array.isArray(body.usuarios) ? body.usuarios : []
    if (usuariosInput.length === 0) {
      return { error: "Informe ao menos um usuário da plataforma." }
    }

    const cpfSet = new Set<string>()
    const emailSet = new Set<string>()
    const companyUsers = []
    for (const usuario of usuariosInput) {
      const cpf = String(usuario.cpf ?? "").replace(/\D/g, "")
      const fullName = String(usuario.nomeCompleto ?? "").trim()
      const birthDate = String(usuario.dataNascimento ?? "").trim()
      const userEmail = String(usuario.email ?? "").trim().toLowerCase()
      if (cpf.length !== 11) return { error: "Todos os usuários devem ter CPF válido." }
      if (!fullName) return { error: "Informe o nome completo de cada usuário." }
      if (!birthDate) return { error: "Informe a data de nascimento de cada usuário." }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
        return { error: "Informe e-mail válido para cada usuário." }
      }
      if (cpfSet.has(cpf)) return { error: "Não repita o mesmo CPF entre os usuários." }
      if (emailSet.has(userEmail)) return { error: "Não repita o mesmo e-mail entre os usuários." }
      cpfSet.add(cpf)
      emailSet.add(userEmail)
      companyUsers.push({
        cpf,
        full_name: fullName,
        birth_date: birthDate,
        email: userEmail,
        is_owner:
          Boolean(usuario.is_owner) ||
          fullName.toLowerCase() === String(body.responsavel ?? "").trim().toLowerCase() ||
          userEmail === String(body.email ?? "").trim().toLowerCase(),
      })
    }

    const primaryUser = companyUsers[0]
    const businessSegment =
      principalCnaeDescricao(body.empresas?.[0]?.cnaes) ||
      principalCnaeDescricao(
        body.cnaesAdicionais?.map((c) => ({ descricao: c.descricao, principal: false })),
      ) ||
      "Licitações públicas"

    return {
      customer_type: "empresa",
      email: primaryUser.email,
      phone,
      origem_captacao: "Website",
      states_of_interest: statesOfInterest,
      cnpj,
      responsible_name: primaryUser.full_name,
      business_segment: businessSegment,
      company_name: String(body.razaoSocial ?? "").trim(),
      billing_address: billingAddress,
      company_users: companyUsers,
      auto_provision: true,
      send_welcome_email: true,
      activity_actor: { displayName: "Site Xpress Solutions" },
    }
  }

  const cpf = String(body.documento ?? "").replace(/\D/g, "")
  const fullName = String(body.nome ?? "").trim()
  const linkedCnpjs = (body.empresas ?? []).map((empresa) => {
    const estadosEmpresa = Array.isArray(empresa.estados)
      ? empresa.estados.map((uf) => uf.trim().toUpperCase()).filter(Boolean)
      : statesOfInterest
    return {
      cnpj: String(empresa.cnpj ?? "").replace(/\D/g, ""),
      razao_social: String(empresa.razaoSocial ?? "").trim(),
      ramo_atuacao: principalCnaeDescricao(empresa.cnaes) || "Licitações públicas",
      states: estadosEmpresa,
      cnaes: Array.isArray(empresa.cnaes)
        ? empresa.cnaes.map((cnae) => ({
            codigo: String(cnae.codigo ?? ""),
            descricao: String(cnae.descricao ?? ""),
            principal: Boolean(cnae.principal),
          }))
        : [],
    }
  })

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
    billing_address: billingAddress,
    auto_provision: true,
    send_welcome_email: true,
    activity_actor: { displayName: "Site Xpress Solutions" },
  }
}
