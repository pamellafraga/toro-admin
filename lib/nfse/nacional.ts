/**
 * Integração com o Sistema Nacional da NFS-e (gov.br).
 * Porto Alegre/RS utiliza este sistema. Emissão com certificado digital A1 (PFX).
 */
import type { NfeIssueBody } from "@/lib/schemas/nfe"

const CODIGO_MUNICIPIO_PORTO_ALEGRE = "4314902"
const AMBIENTE_HOMOLOG = "2"
const AMBIENTE_PROD = "1"

export interface ConfigNfseNacional {
  ambiente: "homologacao" | "producao"
  certPfxBase64: string
  certSenha: string
  cnpjPrestador: string
  razaoSocialPrestador: string
  telefonePrestador?: string
  codTributacaoNacional?: string
  codTributacaoMunicipal?: string
  codNbs?: string
  serieDps?: string
}

function getBaseUrl(ambiente: "homologacao" | "producao"): string {
  if (ambiente === "homologacao") {
    return "https://sefin.producaorestrita.nfse.gov.br/SefinNacional"
  }
  return "https://sefin.nfse.gov.br/SefinNacional"
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? "+" : "-"
  const h = Math.floor(Math.abs(offset) / 60)
  const m = Math.abs(offset) % 60
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${pad(h)}:${pad(m)}`
}

function formatDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Monta o payload DPS no formato esperado pela lib nfse-brazil-national
 * a partir do body da nossa API e da config (prestador, município Porto Alegre).
 */
export function buildDpsPayload(
  body: NfeIssueBody,
  config: ConfigNfseNacional,
  numeroDps: string,
  serieDps: string,
): Record<string, unknown> {
  const now = new Date()
  const ambiente = config.ambiente === "homologacao" ? AMBIENTE_HOMOLOG : AMBIENTE_PROD
  const cnpj = config.cnpjPrestador.replace(/\D/g, "")
  const idDps = `DPS${CODIGO_MUNICIPIO_PORTO_ALEGRE}2${cnpj.padStart(14, "0")}${serieDps.padStart(5, "0")}${numeroDps.padStart(15, "0")}`

  const tomadorDoc = body.recipient.document.replace(/\D/g, "")
  const isCpf = tomadorDoc.length === 11
  const endereco = body.recipient.address

  return {
    id: idDps,
    versaoAplicacao: "1.0.0",
    ambiente,
    dataEmissao: formatDateTime(now),
    serie: serieDps,
    numero: numeroDps,
    competencia: formatDate(now),
    tipoEmitente: "1",
    municipioEmissao: CODIGO_MUNICIPIO_PORTO_ALEGRE,
    prestador: {
      cnpj: config.cnpjPrestador.replace(/\D/g, ""),
      telefone: (config.telefonePrestador || "").replace(/\D/g, "").slice(0, 11) || undefined,
      optanteSimplesNacional: "3",
      regimeApuracaoTributacaoSN: "1",
      regimeEspecialTributacao: "0",
    },
    tomador: {
      ...(isCpf ? { cpf: tomadorDoc } : { cnpj: tomadorDoc }),
      nome: body.recipient.name,
      email: body.recipient.email || undefined,
      endereco: endereco
        ? {
            logradouro: endereco.street || "",
            numero: endereco.number || "S/N",
            complemento: endereco.complement,
            bairro: endereco.district || "",
            cep: endereco.zip_code?.replace(/\D/g, "").slice(0, 8),
            codigoMunicipio: CODIGO_MUNICIPIO_PORTO_ALEGRE,
          }
        : undefined,
    },
    servico: {
      municipioPrestacao: CODIGO_MUNICIPIO_PORTO_ALEGRE,
      codigoTributacaoNacional: config.codTributacaoNacional || "080201",
      codigoTributacaoMunicipal: config.codTributacaoMunicipal || "01.03",
      descricao: body.description || body.items?.[0]?.description || "Prestação de serviços de software (SaaS)",
      codigoNbs: config.codNbs || "122051900",
      codigoInterno: "0",
    },
    valores: {
      valorServicos: body.total_value.toFixed(2),
      tributacaoIssqn: "1",
      tipoRetencaoIssqn: "1",
      tributosDetalhado: {
        federal: "0.00",
        estadual: "0.00",
        municipal: "0.00",
      },
    },
  }
}

/**
 * Emite NFS-e no Sistema Nacional (Porto Alegre).
 * Requer certificado A1 (PFX) em base64 e senha nas variáveis de ambiente.
 */
export async function emitirNfseNacional(
  body: NfeIssueBody,
  config: ConfigNfseNacional,
  numeroDps: string,
  serieDps: string,
): Promise<{ chaveAcesso: string; numero?: string; serie?: string; xml?: string }> {
  const { NfseNationalClient } = await import("nfse-brazil-national")

  const certBuffer = Buffer.from(config.certPfxBase64, "base64")
  const baseURL = getBaseUrl(config.ambiente)

  const client = new NfseNationalClient({
    baseURL,
    certificate: certBuffer,
    password: config.certSenha,
  })

  const dpsData = buildDpsPayload(body, config, numeroDps, serieDps)
  const resultado = await client.issueNfse(dpsData as Parameters<typeof client.issueNfse>[0])

  if (typeof resultado === "string") {
    const chave = resultado.trim()
    return { chaveAcesso: chave, numero: chave.slice(-20), serie: null }
  }
  const obj = resultado as { chaveAcesso?: string; nNFSe?: string; nNFse?: string; serie?: string; xml?: string }
  const chave = obj.chaveAcesso || ""
  return {
    chaveAcesso: chave,
    numero: obj.nNFSe ?? obj.nNFse ?? chave.slice(-20),
    serie: obj.serie ?? null,
    xml: obj.xml,
  }
}

/**
 * Verifica se a integração NFS-e Nacional está configurada (certificado + CNPJ).
 */
export function isNfseNacionalConfigurada(): boolean {
  const cert = process.env.NFSENACIONAL_CERT_PFX_BASE64
  const senha = process.env.NFSENACIONAL_CERT_SENHA
  const cnpj = process.env.NFSENACIONAL_CNPJ
  return !!(cert?.trim() && senha && cnpj?.replace(/\D/g, "").length === 14)
}

/**
 * Retorna a config a partir das variáveis de ambiente.
 */
export function getConfigNfseNacional(): ConfigNfseNacional | null {
  if (!isNfseNacionalConfigurada()) return null
  const cnpj = process.env.NFSENACIONAL_CNPJ!.replace(/\D/g, "")
  if (cnpj.length !== 14) return null
  return {
    ambiente: (process.env.NFSENACIONAL_AMBIENTE || "homologacao") as "homologacao" | "producao",
    certPfxBase64: process.env.NFSENACIONAL_CERT_PFX_BASE64!,
    certSenha: process.env.NFSENACIONAL_CERT_SENHA!,
    cnpjPrestador: cnpj,
    razaoSocialPrestador: process.env.NFSENACIONAL_RAZAO_SOCIAL || "Prestador",
    telefonePrestador: process.env.NFSENACIONAL_TELEFONE,
    codTributacaoNacional: process.env.NFSENACIONAL_COD_TRIBUTACAO_NACIONAL,
    codTributacaoMunicipal: process.env.NFSENACIONAL_COD_TRIBUTACAO_MUNICIPAL,
    codNbs: process.env.NFSENACIONAL_COD_NBS,
    serieDps: process.env.NFSENACIONAL_SERIE_DPS || "1",
  }
}
