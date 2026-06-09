import {
  backfillLiticaProTrialEndsAt,
  findExpiredLiticaProTrials,
  findLiticaProTrialsNeedingReactivation,
  markTrialExpired,
  markTrialReactivated,
} from "@/lib/db/repositories/contracts.repository"
import { insertNotification } from "@/lib/db/repositories/notifications.repository"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export async function reactivateFutureLiticaProTrials(): Promise<number> {
  await backfillLiticaProTrialEndsAt()
  const rows = await findLiticaProTrialsNeedingReactivation()
  for (const row of rows) {
    await markTrialReactivated(row.id)
  }
  return rows.length
}

/** Expira testes vencidos e reativa os que ainda têm data futura. */
export async function processLiticaProTrialStatuses(): Promise<{ expired: number; reactivated: number }> {
  const reactivated = await reactivateFutureLiticaProTrials()
  const expired = await processExpiredLiticaProTrials()
  return { expired, reactivated }
}

export async function processExpiredLiticaProTrials(): Promise<number> {
  await backfillLiticaProTrialEndsAt()
  const expired = await findExpiredLiticaProTrials()
  let count = 0

  for (const row of expired) {
    await markTrialExpired(row.id)
    const cadastro = row.created_at
      ? format(new Date(row.created_at), "dd/MM/yyyy", { locale: ptBR })
      : "—"
    const expirou = row.trial_ends_at
      ? format(new Date(row.trial_ends_at), "dd/MM/yyyy", { locale: ptBR })
      : "—"
    await insertNotification({
      title: "LicitaPregão — teste grátis encerrado",
      message: `O teste de ${row.client_name} (cadastro ${cadastro}) expirou em ${expirou}. Entre em contato para verificar renovação, plano e pagamento${row.client_email ? ` — ${row.client_email}` : ""}.`,
      type: "warning",
      link: "/dashboard/produtos/liticapro",
    })
    count++
  }

  return count
}
