import { findClientById, getClientLiticaProData } from "@/lib/db/repositories/clients.repository"
import {
  findLiticaProTrialsForCourtesyExtension,
  updateContract,
} from "@/lib/db/repositories/contracts.repository"
import { insertNotification } from "@/lib/db/repositories/notifications.repository"
import { LITICAPRO_COURTESY_EXTENSION_DAYS } from "@/lib/liticapro/constants"
import { sendLiticaProTrialCourtesyEmail } from "@/lib/liticapro/send-trial-courtesy-email"
import { syncLiticaProTenantAfterAdminEdit } from "@/lib/liticapro/sync-licitapregao"
import type { LiticaProSaaSUser } from "@/lib/liticapro/types"
import {
  extendTrialEndsAt,
  resolveTrialEndsAt,
  resolveTrialStatusesFromEndsAt,
} from "@/lib/liticapro/trial"
import { logActivity } from "@/lib/activity-log"

export type TrialCourtesyExtensionResult = {
  contract_id: string
  client_name: string
  previous_trial_ends_at: string
  new_trial_ends_at: string
  emails_sent: string[]
  email_errors: string[]
  saas_sync_ok: boolean
  saas_sync_error?: string
}

export type TrialCourtesyBatchResult = {
  processed: number
  extended: TrialCourtesyExtensionResult[]
  skipped: Array<{ contract_id: string; reason: string }>
}

function formatDateLabel(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("pt-BR")
}

function collectCourtesyRecipients(
  clientName: string,
  clientEmail: string | null | undefined,
  saasUsers: LiticaProSaaSUser[],
): Array<{ email: string; name: string }> {
  const out: Array<{ email: string; name: string }> = []
  const seen = new Set<string>()

  if (saasUsers.length > 0) {
    for (const user of saasUsers) {
      const email = user.email?.trim().toLowerCase()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email)) continue
      seen.add(email)
      out.push({ email, name: user.full_name?.trim() || clientName })
    }
    return out
  }

  const email = clientEmail?.trim().toLowerCase()
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    out.push({ email, name: clientName })
  }
  return out
}

export async function extendLiticaProTrialCourtesyForContract(
  contractId: string,
  options?: {
    extraDays?: number
    sendEmail?: boolean
    activityActor?: { displayName?: string } | null
  },
): Promise<TrialCourtesyExtensionResult | { skipped: true; reason: string }> {
  const extraDays = options?.extraDays ?? LITICAPRO_COURTESY_EXTENSION_DAYS
  const sendEmail = options?.sendEmail !== false

  const rows = await findLiticaProTrialsForCourtesyExtension()
  const row = rows.find((item) => item.id === contractId)
  if (!row) {
    return { skipped: true, reason: "Contrato não elegível para cortesia (já estendido ou ainda ativo)." }
  }

  const previousEnd = resolveTrialEndsAt(row)
  if (!previousEnd) {
    return { skipped: true, reason: "Contrato sem data de fim de teste." }
  }

  const newEnd = extendTrialEndsAt(previousEnd, extraDays)
  const resolvedStatus = resolveTrialStatusesFromEndsAt(newEnd)
  const meta = { ...(row.liticapro_meta ?? {}) }
  const extendedAt = new Date().toISOString()

  const nextMeta = {
    ...meta,
    courtesy_extension_days: extraDays,
    courtesy_extended_at: extendedAt,
    courtesy_extension_count: Number(meta.courtesy_extension_count ?? 0) + 1,
    previous_trial_ends_at: previousEnd.toISOString(),
    courtesy_email_sent_at: meta.courtesy_email_sent_at ?? null,
  }

  await updateContract(contractId, {
    status: resolvedStatus.status,
    payment_status: resolvedStatus.payment_status,
    trial_ends_at: newEnd.toISOString(),
    liticapro_meta: nextMeta,
  })

  const client = await findClientById(row.client_id)
  const syncResult = await syncLiticaProTenantAfterAdminEdit(contractId)
  let saasSyncOk = syncResult.ok
  let saasSyncError = syncResult.ok ? undefined : ("error" in syncResult ? syncResult.error : undefined)

  if (!syncResult.ok && !("skipped" in syncResult && syncResult.skipped)) {
    const fallback = await extendSaasTrialDirectly(meta, newEnd, client?.email)
    if (fallback.ok && fallback.empresa_id) {
      saasSyncOk = true
      saasSyncError = undefined
      await updateContract(contractId, {
        liticapro_meta: {
          ...nextMeta,
          saas_empresa_id: fallback.empresa_id,
          ...(fallback.usuario_id ? { saas_usuario_id: fallback.usuario_id } : {}),
          saas_courtesy_synced_at: extendedAt,
        },
      })
    }
  }

  const liticaproRow = await getClientLiticaProData(row.client_id)
  const liticaproData = (liticaproRow?.liticapro_data ?? {}) as Record<string, unknown>
  const saasUsers = Array.isArray(liticaproData.saas_users)
    ? (liticaproData.saas_users as LiticaProSaaSUser[])
    : []

  const recipients = collectCourtesyRecipients(row.client_name, client?.email, saasUsers)
  const emailsSent: string[] = []
  const emailErrors: string[] = []
  let emailChannel: string | null = null

  if (sendEmail && recipients.length > 0) {
    for (const recipient of recipients) {
      const emailResult = await sendLiticaProTrialCourtesyEmail({
        to: recipient.email,
        clientName: recipient.name,
        previousEndLabel: formatDateLabel(previousEnd),
        newEndLabel: formatDateLabel(newEnd),
        extraDays,
        loginUrl: process.env.LICITAPREGAO_LOGIN_URL,
      })
      if (emailResult.ok) {
        emailsSent.push(recipient.email)
        emailChannel = emailResult.channel ?? emailChannel
      } else {
        emailErrors.push(`${recipient.email}: ${emailResult.error ?? "falha"}`)
      }
    }

    if (emailsSent.length > 0) {
      await updateContract(contractId, {
        liticapro_meta: {
          ...nextMeta,
          courtesy_email_sent_at: extendedAt,
          courtesy_email_channel: emailChannel,
          courtesy_emails_sent: emailsSent,
        },
      })
    }
  }

  await insertNotification({
    title: "LicitaPregão — cortesia +7 dias aplicada",
    message: `${row.client_name}: teste reativado até ${formatDateLabel(newEnd)} (+${extraDays} dias de cortesia).`,
    type: "info",
    link: "/dashboard/produtos/liticapro",
  })

  await logActivity(options?.activityActor ?? null, {
    action: `Concedeu cortesia de ${extraDays} dias no teste LicitaPregão: ${row.client_name}`,
    entity_type: "contract",
    entity_id: contractId,
    details: {
      previous_trial_ends_at: previousEnd.toISOString(),
      new_trial_ends_at: newEnd.toISOString(),
      emails_sent: emailsSent,
      email_errors: emailErrors,
      saas_sync_ok: saasSyncOk,
    },
  })

  return {
    contract_id: contractId,
    client_name: row.client_name,
    previous_trial_ends_at: previousEnd.toISOString(),
    new_trial_ends_at: newEnd.toISOString(),
    emails_sent: emailsSent,
    email_errors: emailErrors,
    saas_sync_ok: saasSyncOk,
    saas_sync_error: saasSyncError,
  }
}

async function extendSaasTrialDirectly(
  meta: Record<string, unknown>,
  newEnd: Date,
  clientEmail?: string | null,
): Promise<{ ok: boolean; empresa_id?: string; usuario_id?: string }> {
  let empresaId = String(meta.saas_empresa_id ?? "").trim()

  try {
    const pg = await import("pg")
    const pool = new pg.default.Pool({
      host: process.env.LICITAPREGAO_DB_HOST || "licitapro.postgresql.dbaas.com.br",
      port: Number(process.env.LICITAPREGAO_DB_PORT || 5432),
      database: process.env.LICITAPREGAO_DB_NAME || "licitapro",
      user: process.env.LICITAPREGAO_DB_USER || "licitapro",
      password: process.env.LICITAPREGAO_DB_PASSWORD || "Xpress@101029",
      ssl: { rejectUnauthorized: false },
    })

    let lookupUsuarioId: string | undefined

    if (!empresaId && clientEmail?.trim()) {
      const lookup = await pool.query<{ empresa_id: string; usuario_id: string }>(
        `SELECT e.id AS empresa_id, u.id AS usuario_id
         FROM "Usuario" u
         JOIN "Empresa" e ON e.id = u."empresaId"
         WHERE lower(trim(u.email)) = lower(trim($1))
         ORDER BY u."createdAt" ASC
         LIMIT 1`,
        [clientEmail.trim()],
      )
      empresaId = lookup.rows[0]?.empresa_id ?? ""
      lookupUsuarioId = lookup.rows[0]?.usuario_id
    }

    if (!empresaId) {
      await pool.end()
      return { ok: false }
    }

    await pool.query(
      `UPDATE "Empresa"
       SET "assinaturaVencimento" = $2, "emTesteGratuito" = true, "ativa" = true, "updatedAt" = NOW()
       WHERE id = $1`,
      [empresaId, newEnd.toISOString()],
    )

    const usuarioId =
      lookupUsuarioId ||
      String(meta.saas_usuario_id ?? "").trim() ||
      (
        await pool.query<{ id: string }>(
          `SELECT id FROM "Usuario" WHERE "empresaId" = $1 AND ativo = true ORDER BY "createdAt" ASC LIMIT 1`,
          [empresaId],
        )
      ).rows[0]?.id

    await pool.end()
    return {
      ok: true,
      empresa_id: empresaId,
      usuario_id: usuarioId || undefined,
    }
  } catch (err) {
    console.error("[trial-courtesy] fallback SaaS DB:", err)
    return { ok: false }
  }
}

export async function extendAllExpiredLiticaProTrialsCourtesy(options?: {
  extraDays?: number
  sendEmail?: boolean
  activityActor?: { displayName?: string } | null
}): Promise<TrialCourtesyBatchResult> {
  const rows = await findLiticaProTrialsForCourtesyExtension()
  const extended: TrialCourtesyExtensionResult[] = []
  const skipped: Array<{ contract_id: string; reason: string }> = []

  for (const row of rows) {
    const result = await extendLiticaProTrialCourtesyForContract(row.id, options)
    if ("skipped" in result) {
      skipped.push({ contract_id: row.id, reason: result.reason })
    } else {
      extended.push(result)
    }
  }

  return { processed: extended.length, extended, skipped }
}
