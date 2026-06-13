import { findClientById } from "@/lib/db/repositories/clients.repository"
import {
  findContractWithProduct,
  updateContract,
} from "@/lib/db/repositories/contracts.repository"
import { getLiticaProAccessForResend } from "@/lib/liticapro/resend-welcome-from-site"
import {
  sendLiticaProCompanyWelcomeEmails,
  sendLiticaProWelcomeEmailForSaasUser,
} from "@/lib/liticapro/send-company-welcome-emails"
import { sendLiticaProWelcomeEmail } from "@/lib/send-licitapregao-welcome-email"
import type { LiticaProSaaSUser } from "@/lib/liticapro/types"

export type ResendWelcomeEmailResult =
  | { ok: true; channel: string | null; sent_at: string }
  | { ok: false; error: string; status: number }

export async function resendLiticaProWelcomeEmailByContractId(
  contractId: string,
): Promise<ResendWelcomeEmailResult> {
  const contract = await findContractWithProduct(contractId)
  if (!contract || contract.product_slug !== "liticapro") {
    return { ok: false, error: "Contrato LicitaPregão não encontrado.", status: 404 }
  }

  const client = await findClientById(contract.client_id)
  const liticaproData = (client?.liticapro_data ?? null) as Record<string, unknown> | null
  const saasUsers = Array.isArray(liticaproData?.saas_users)
    ? (liticaproData.saas_users as LiticaProSaaSUser[])
    : []

  if (saasUsers.length > 0) {
    const emailResult = await sendLiticaProCompanyWelcomeEmails({
      companyName: client?.name ?? "",
      users: saasUsers,
      loginUrl: process.env.LICITAPREGAO_LOGIN_URL,
      statesOfInterest: Array.isArray(liticaproData?.states_of_interest)
        ? (liticaproData.states_of_interest as string[])
        : [],
    })
    if (emailResult.sentCount === 0) {
      return {
        ok: false,
        error: emailResult.errors[0] ?? "Falha ao enviar e-mail de acesso.",
        status: 502,
      }
    }
    const sentAt = new Date().toISOString()
    await updateContract(contract.id, {
      liticapro_meta: {
        ...(contract.liticapro_meta ?? {}),
        welcome_email_sent_at: sentAt,
        welcome_email_channel: emailResult.channel ?? null,
      },
    })
    return { ok: true, channel: emailResult.channel ?? null, sent_at: sentAt }
  }

  const email = String(client?.email ?? "").trim().toLowerCase()
  if (!email) {
    return { ok: false, error: "Cliente sem e-mail cadastrado.", status: 400 }
  }

  const access = await getLiticaProAccessForResend(email)
  if (!access.ok) {
    return { ok: false, error: access.error, status: access.status }
  }

  const emailResult = await sendLiticaProWelcomeEmail({
    to: email,
    clientName: access.client_name,
    credentials: access.credentials,
    loginUrl: access.login_url,
    customerType: access.customer_type,
    statesOfInterest: access.states_of_interest,
  })

  if (!emailResult.ok) {
    return {
      ok: false,
      error: emailResult.error ?? "Falha ao enviar e-mail de acesso.",
      status: 502,
    }
  }

  const sentAt = new Date().toISOString()
  const meta = {
    ...(contract.liticapro_meta ?? {}),
    welcome_email_sent_at: sentAt,
    welcome_email_channel: emailResult.channel ?? null,
  }

  await updateContract(contract.id, { liticapro_meta: meta })

  return { ok: true, channel: emailResult.channel ?? null, sent_at: sentAt }
}

export async function resendLiticaProWelcomeEmailByEmail(
  email: string,
): Promise<ResendWelcomeEmailResult> {
  const normalized = email.trim().toLowerCase()
  const client = await findClientByLiticaProUserEmail(normalized)
  const liticaproData = client
    ? ((await findClientById(client.id))?.liticapro_data as Record<string, unknown> | null)
    : null
  const saasUsers = Array.isArray(liticaproData?.saas_users)
    ? (liticaproData.saas_users as LiticaProSaaSUser[])
    : []
  const saasUser = saasUsers.find((row) => row.email.trim().toLowerCase() === normalized)

  if (client && saasUser) {
    const emailResult = await sendLiticaProWelcomeEmailForSaasUser({
      companyName: client.name,
      user: saasUser,
      allUsers: saasUsers,
      loginUrl: process.env.LICITAPREGAO_LOGIN_URL,
      statesOfInterest: Array.isArray(liticaproData?.states_of_interest)
        ? (liticaproData.states_of_interest as string[])
        : [],
    })
    if (!emailResult.ok) {
      return {
        ok: false,
        error: emailResult.error ?? "Falha ao enviar e-mail de acesso.",
        status: 502,
      }
    }
    const { findLiticaProContractByClientId } = await import(
      "@/lib/db/repositories/contracts.repository"
    )
    const { findOrCreateProductFromCatalog } = await import(
      "@/lib/db/repositories/products.repository"
    )
    const { getProductBySlug } = await import("@/lib/products/catalog")
    const catalog = getProductBySlug("liticapro")
    if (catalog) {
      const product = await findOrCreateProductFromCatalog(catalog)
      const contract = await findLiticaProContractByClientId(client.id, product.id)
      if (contract?.id) {
        const sentAt = new Date().toISOString()
        await updateContract(contract.id, {
          liticapro_meta: {
            ...(contract.liticapro_meta ?? {}),
            welcome_email_sent_at: sentAt,
            welcome_email_channel: emailResult.channel ?? null,
          },
        })
        return { ok: true, channel: emailResult.channel ?? null, sent_at: sentAt }
      }
    }
    return { ok: true, channel: emailResult.channel ?? null, sent_at: new Date().toISOString() }
  }

  const access = await getLiticaProAccessForResend(email)
  if (!access.ok) {
    return { ok: false, error: access.error, status: access.status }
  }

  const emailResult = await sendLiticaProWelcomeEmail({
    to: email.trim().toLowerCase(),
    clientName: access.client_name,
    credentials: access.credentials,
    loginUrl: access.login_url,
    customerType: access.customer_type,
    statesOfInterest: access.states_of_interest,
  })

  if (!emailResult.ok) {
    return {
      ok: false,
      error: emailResult.error ?? "Falha ao enviar e-mail de acesso.",
      status: 502,
    }
  }

  const { findClientByEmailNormalized } = await import(
    "@/lib/db/repositories/clients.repository"
  )
  const { findLiticaProContractByClientId } = await import(
    "@/lib/db/repositories/contracts.repository"
  )
  const { findOrCreateProductFromCatalog } = await import(
    "@/lib/db/repositories/products.repository"
  )
  const { getProductBySlug } = await import("@/lib/products/catalog")

  const client = await findClientByEmailNormalized(email)
  if (client) {
    const catalog = getProductBySlug("liticapro")
    if (catalog) {
      const product = await findOrCreateProductFromCatalog(catalog)
      const contract = await findLiticaProContractByClientId(client.id, product.id)
      if (contract?.id) {
        const sentAt = new Date().toISOString()
        await updateContract(contract.id, {
          liticapro_meta: {
            ...(contract.liticapro_meta ?? {}),
            welcome_email_sent_at: sentAt,
            welcome_email_channel: emailResult.channel ?? null,
          },
        })
        return { ok: true, channel: emailResult.channel ?? null, sent_at: sentAt }
      }
    }
  }

  return { ok: true, channel: emailResult.channel ?? null, sent_at: new Date().toISOString() }
}
