import { findContractById, updateContract } from "@/lib/db/repositories/contracts.repository"
import { sendLiticaProTrialUpdateBonusEmail } from "@/lib/liticapro/send-trial-update-bonus-email"
import { addDays, resolveTrialStatusesFromEndsAt } from "@/lib/liticapro/trial"
import { logActivity } from "@/lib/activity-log"

export const DSS_SAAS_EMPRESA_ID = "cmqclox950000ic0449pipawz"
export const DSS_TRIAL_BONUS_DAYS = 7

export type DssTrialBonusUserResult = {
  email: string
  name: string
  sent: boolean
  error?: string
}

export type DssTrialBonusResult = {
  empresa_id: string
  empresa_nome: string
  previous_trial_ends_at: string
  new_trial_ends_at: string
  extra_days: number
  users: DssTrialBonusUserResult[]
  contract_updated: boolean
  dry_run: boolean
}

function formatDateLabel(value: Date): string {
  return value.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  })
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function getLicitapregaoPool() {
  const pg = await import("pg")
  return new pg.default.Pool({
    host: process.env.LICITAPREGAO_DB_HOST || "licitapro.postgresql.dbaas.com.br",
    port: Number(process.env.LICITAPREGAO_DB_PORT || 5432),
    database: process.env.LICITAPREGAO_DB_NAME || "licitapro",
    user: process.env.LICITAPREGAO_DB_USER || "licitapro",
    password: process.env.LICITAPREGAO_DB_PASSWORD || "Xpress@101029",
    ssl: { rejectUnauthorized: false },
  })
}

function resolvePreviousTrialEnd(input: {
  assinaturaVencimento: Date | null
  assinaturaInicio: Date | null
}): Date {
  if (input.assinaturaVencimento) {
    const d = new Date(input.assinaturaVencimento)
    if (!Number.isNaN(d.getTime())) return d
  }
  if (input.assinaturaInicio) {
    const d = new Date(input.assinaturaInicio)
    if (!Number.isNaN(d.getTime())) return addDays(d, 7)
  }
  return new Date()
}

async function findDssContractInDashboard(): Promise<string | null> {
  try {
    const { prisma } = await import("@/lib/db/prisma")
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM contracts
      WHERE liticapro_meta::text ILIKE ${`%${DSS_SAAS_EMPRESA_ID}%`}
      LIMIT 1
    `
    return rows[0]?.id ?? null
  } catch {
    return null
  }
}

export async function extendDssTrialBonusAndNotify(options?: {
  extraDays?: number
  sendEmail?: boolean
  dryRun?: boolean
  emailOnly?: boolean
  activityActor?: { displayName?: string } | null
}): Promise<DssTrialBonusResult> {
  const extraDays = Math.max(1, options?.extraDays ?? DSS_TRIAL_BONUS_DAYS)
  const sendEmail = options?.sendEmail !== false
  const dryRun = options?.dryRun === true
  const emailOnly = options?.emailOnly === true

  const pool = await getLicitapregaoPool()

  const empresaRow = await pool.query<{
    id: string
    nome: string
    assinatura_inicio: Date | null
    assinatura_vencimento: Date | null
    em_teste_gratuito: boolean
  }>(
    `SELECT id, nome, "assinaturaInicio" AS assinatura_inicio,
            "assinaturaVencimento" AS assinatura_vencimento,
            "emTesteGratuito" AS em_teste_gratuito
     FROM "Empresa"
     WHERE id = $1`,
    [DSS_SAAS_EMPRESA_ID],
  )

  const empresa = empresaRow.rows[0]
  if (!empresa) {
    await pool.end()
    throw new Error(`Empresa DSS não encontrada (${DSS_SAAS_EMPRESA_ID}).`)
  }

  const previousEnd = resolvePreviousTrialEnd({
    assinaturaVencimento: empresa.assinatura_vencimento,
    assinaturaInicio: empresa.assinatura_inicio,
  })
  const newEnd = emailOnly
    ? previousEnd
    : addDays(previousEnd, extraDays)

  const usersRow = await pool.query<{
    id: string
    email: string | null
    login: string
  }>(
    `SELECT id, email, login
     FROM "Usuario"
     WHERE "empresaId" = $1 AND ativo = true
     ORDER BY "createdAt" ASC`,
    [DSS_SAAS_EMPRESA_ID],
  )

  const perfilRow = await pool.query<{ perfil_empresa: unknown }>(
    `SELECT "perfilEmpresa" AS perfil_empresa FROM "Empresa" WHERE id = $1`,
    [DSS_SAAS_EMPRESA_ID],
  )

  const perfilMap = new Map<string, string>()
  const perfilRaw = perfilRow.rows[0]?.perfil_empresa
  if (perfilRaw && typeof perfilRaw === "object") {
    const usuarios = (perfilRaw as { usuariosPlataforma?: Array<{ usuarioId?: string; nomeCompleto?: string; email?: string }> })
      .usuariosPlataforma
    if (Array.isArray(usuarios)) {
      for (const u of usuarios) {
        const nome = u.nomeCompleto?.trim()
        if (!nome) continue
        if (u.email?.trim()) {
          perfilMap.set(u.email.trim().toLowerCase(), nome)
        }
        if (u.usuarioId) {
          perfilMap.set(`id:${u.usuarioId}`, nome)
        }
      }
    }
  }

  if (!dryRun && !emailOnly) {
    await pool.query(
      `UPDATE "Empresa"
       SET "assinaturaVencimento" = $2,
           "emTesteGratuito" = true,
           "ativa" = true,
           "updatedAt" = NOW()
       WHERE id = $1`,
      [DSS_SAAS_EMPRESA_ID, newEnd.toISOString()],
    )
  }

  await pool.end()

  let contractUpdated = false
  const contractId = await findDssContractInDashboard()

  if (!dryRun && !emailOnly && contractId) {
    const contract = await findContractById(contractId)
    if (contract) {
      const resolved = resolveTrialStatusesFromEndsAt(newEnd)
      const meta = { ...(contract.liticapro_meta ?? {}) }
      await updateContract(contractId, {
        status: resolved.status,
        payment_status: resolved.payment_status,
        trial_ends_at: newEnd.toISOString(),
        liticapro_meta: {
          ...meta,
          dss_trial_bonus_days: extraDays,
          dss_trial_bonus_at: new Date().toISOString(),
          previous_trial_ends_at: previousEnd.toISOString(),
        },
      })
      contractUpdated = true
    }
  }

  const trialEndsLabel = formatDateLabel(newEnd)
  const users: DssTrialBonusUserResult[] = []

  for (const user of usersRow.rows) {
    const email = user.email?.trim().toLowerCase() ?? ""
    const name =
      perfilMap.get(email) ||
      perfilMap.get(`id:${user.id}`) ||
      user.login?.trim() ||
      empresa.nome

    if (!email || !isValidEmail(email)) {
      users.push({ email: email || "(sem e-mail)", name, sent: false, error: "E-mail ausente ou inválido." })
      continue
    }

    if (!sendEmail || dryRun) {
      users.push({ email, name, sent: false, error: dryRun ? "dry-run" : "envio desligado" })
      continue
    }

    const result = await sendLiticaProTrialUpdateBonusEmail({
      to: email,
      clientName: name,
      extraDays,
      trialEndsLabel,
    })

    users.push({
      email,
      name,
      sent: result.ok,
      error: result.ok ? undefined : result.error,
    })
  }

  if (!dryRun) {
    try {
      await logActivity(options?.activityActor ?? null, {
        action: `Bônus +${extraDays} dias teste DSS — e-mails enviados`,
        entity_type: "contract",
        entity_id: contractId ?? undefined,
        details: {
          empresa_id: DSS_SAAS_EMPRESA_ID,
          previous_trial_ends_at: previousEnd.toISOString(),
          new_trial_ends_at: newEnd.toISOString(),
          users,
        },
      })
    } catch (err) {
      console.warn("[dss-trial-bonus] logActivity:", err)
    }
  }

  return {
    empresa_id: empresa.id,
    empresa_nome: empresa.nome,
    previous_trial_ends_at: previousEnd.toISOString(),
    new_trial_ends_at: newEnd.toISOString(),
    extra_days: extraDays,
    users,
    contract_updated: contractUpdated,
    dry_run: dryRun,
  }
}
