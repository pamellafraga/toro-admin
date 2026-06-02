import type { CnpjGovData } from "@/lib/liticapro/types"

function mapBrasilApi(data: Record<string, unknown>, cnpj: string): CnpjGovData {
  return {
    cnpj,
    razao_social: String(data.razao_social ?? ""),
    nome_fantasia: (data.nome_fantasia as string) || null,
    logradouro: (data.logradouro as string) || null,
    numero: (data.numero as string) || null,
    bairro: (data.bairro as string) || null,
    municipio: (data.municipio as string) || null,
    uf: (data.uf as string) || null,
    cep: String(data.cep ?? "").replace(/\D/g, "") || null,
    cnae_fiscal: typeof data.cnae_fiscal === "number" ? data.cnae_fiscal : null,
    cnae_fiscal_descricao: (data.cnae_fiscal_descricao as string) || null,
    cnaes_secundarios: Array.isArray(data.cnaes_secundarios)
      ? (data.cnaes_secundarios as Array<{ codigo: number; descricao: string }>)
      : [],
    descricao_situacao_cadastral: (data.descricao_situacao_cadastral as string) || null,
  }
}

function mapPublicaCnpjWs(data: Record<string, unknown>, cnpj: string): CnpjGovData {
  const est = (data.estabelecimento ?? {}) as Record<string, unknown>
  const cnaePrincipal = est.atividade_principal as { id?: string; descricao?: string } | undefined
  const secundarias = Array.isArray(est.atividades_secundarias)
    ? (est.atividades_secundarias as Array<{ id?: string; descricao?: string }>)
    : []

  return {
    cnpj,
    razao_social: String(data.razao_social ?? ""),
    nome_fantasia: (est.nome_fantasia as string) || null,
    logradouro: (est.logradouro as string) || null,
    numero: (est.numero as string) || null,
    bairro: (est.bairro as string) || null,
    municipio: (est.cidade as { nome?: string })?.nome ?? (est.cidade as string) ?? null,
    uf: (est.estado as { sigla?: string })?.sigla ?? null,
    cep: String(est.cep ?? "").replace(/\D/g, "") || null,
    cnae_fiscal: cnaePrincipal?.id ? Number(cnaePrincipal.id) : null,
    cnae_fiscal_descricao: cnaePrincipal?.descricao ?? null,
    cnaes_secundarios: secundarias.map((c) => ({
      codigo: Number(c.id ?? 0),
      descricao: String(c.descricao ?? ""),
    })),
    descricao_situacao_cadastral: (est.situacao_cadastral as string) || null,
  }
}

/** Consulta CNPJ na Receita (Brasil API com fallback publica.cnpj.ws). */
export async function fetchCnpjFromGov(cnpjDigits: string): Promise<CnpjGovData | null> {
  if (cnpjDigits.length !== 14) return null

  try {
    const brRes = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`, {
      next: { revalidate: 3600 },
    })
    if (brRes.ok) {
      const data = await brRes.json()
      if (data.razao_social) return mapBrasilApi(data, cnpjDigits)
    }
  } catch {
    // fallback abaixo
  }

  try {
    const pubRes = await fetch(`https://publica.cnpj.ws/cnpj/${cnpjDigits}`, {
      next: { revalidate: 3600 },
    })
    if (!pubRes.ok) return null
    const data = await pubRes.json()
    if (data.razao_social) return mapPublicaCnpjWs(data, cnpjDigits)
  } catch {
    return null
  }

  return null
}
