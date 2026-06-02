export interface LiticaProDeveloperCredentials {
  empresa: string
  usuario: string
  senha: string
}

export interface CnpjGovData {
  cnpj: string
  razao_social: string
  nome_fantasia: string | null
  logradouro: string | null
  numero: string | null
  bairro: string | null
  municipio: string | null
  uf: string | null
  cep: string | null
  cnae_fiscal: number | null
  cnae_fiscal_descricao: string | null
  cnaes_secundarios: Array<{ codigo: number; descricao: string }>
  descricao_situacao_cadastral: string | null
}
