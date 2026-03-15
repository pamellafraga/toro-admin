import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { nfeIssueBodySchema } from "@/lib/schemas/nfe"
import { logActivity } from "@/lib/activity-log"
import {
  getConfigNfseNacional,
  emitirNfseNacional,
} from "@/lib/nfse/nacional"

function isAdminRequest(request: NextRequest): boolean {
  try {
    const cookie = request.cookies.get("xpress_auth")?.value
    if (!cookie) return false
    const parsed = JSON.parse(cookie)
    return !!(parsed.authenticated || parsed.user)
  } catch {
    return false
  }
}

/**
 * Emissão de NF-e / NFS-e.
 * Prioridade: 1) Sistema Nacional NFS-e (Porto Alegre), 2) Provedor genérico (NFE_API_*), 3) Simulado.
 */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  try {
    const raw = await req.json()
    const parseResult = nfeIssueBodySchema.safeParse(raw)
    if (!parseResult.success) {
      const first = parseResult.error.flatten().fieldErrors
      const msg = Object.values(first).flat().join(" ") || "Dados inválidos."
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const body = parseResult.data

    const supabase = createAdminClient()
    const apiUrl = process.env.NFE_API_URL
    const apiKey = process.env.NFE_API_KEY
    const configNacional = getConfigNfseNacional()

    let providerJson: Record<string, unknown> = {}
    let nfeNumber: string | null = null
    let nfeSeries: string | null = null
    let nfeStatus = "emitida"
    let providerId: string | null = null

    if (configNacional) {
      try {
        const serieDps = configNacional.serieDps || "1"
        const numeroDps = String(Date.now()).slice(-12)
        const resultado = await emitirNfseNacional(body, configNacional, numeroDps, serieDps)
        nfeNumber = resultado.numero ?? resultado.chaveAcesso?.slice(-15) ?? null
        nfeSeries = resultado.serie ?? serieDps
        providerId = resultado.chaveAcesso ?? null
        providerJson = {
          provider: "nfse_nacional_porto_alegre",
          chaveAcesso: resultado.chaveAcesso,
          numero: resultado.numero,
          serie: resultado.serie,
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao emitir NFS-e no Sistema Nacional"
        return NextResponse.json(
          { error: msg, provider: "nfse_nacional" },
          { status: 502 },
        )
      }
    } else if (apiUrl && apiKey) {
      const providerRes = await fetch(`${apiUrl}/nfe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      providerJson = (await providerRes.json().catch(() => ({}))) as Record<string, unknown>

      if (!providerRes.ok) {
        return NextResponse.json(
          {
            error: "Falha ao emitir NF-e no provedor",
            providerStatus: providerRes.status,
            providerResponse: providerJson,
          },
          { status: 502 },
        )
      }

      nfeNumber = String(providerJson.numero ?? providerJson.number ?? "").trim() || null
      nfeSeries = String(providerJson.serie ?? providerJson.series ?? "").trim() || null
      nfeStatus = (providerJson.status as string) || "emitida"
      providerId = String(providerJson.id ?? providerJson.uuid ?? "").trim() || null
    } else {
      nfeNumber = `${Math.floor(100000 + Math.random() * 900000)}`
      nfeSeries = "1"
      providerJson = { simulated: true }
      providerId = null
    }

    let contractIdToActivate: string | null = null
    if (body.id) {
      const { data: existing } = await supabase
        .from("nfe_documents")
        .select("provider_payload")
        .eq("id", body.id)
        .single()
      const payload = existing?.provider_payload as { contract_id?: string } | null
      if (payload?.contract_id) contractIdToActivate = payload.contract_id
    }

    const basePayload: Record<string, unknown> = {
      client_id: body.client_id ?? null,
      client_name: body.client_name,
      total_value: body.total_value,
      nature_operation: body.nature_operation ?? null,
      cfop: body.cfop ?? null,
      status: nfeStatus,
      number: nfeNumber,
      series: nfeSeries,
      provider_id: providerId,
      provider_payload:
        body.id && contractIdToActivate
          ? { ...raw, contract_id: contractIdToActivate }
          : raw,
      provider_response: providerJson,
    }

    let data: unknown
    let error: { message: string } | null

    if (body.id) {
      const result = await supabase
        .from("nfe_documents")
        .update(basePayload)
        .eq("id", body.id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      const result = await supabase
        .from("nfe_documents")
        .insert(basePayload)
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      return NextResponse.json(
        {
          error: "NF-e emitida no provedor, mas falhou ao salvar no banco",
          dbError: error.message,
          providerResponse: providerJson,
        },
        { status: 500 },
      )
    }

    if (contractIdToActivate) {
      await supabase
        .from("contracts")
        .update({ status: "ativa" })
        .eq("id", contractIdToActivate)
    }

    const who = (() => {
      try {
        const c = req.cookies.get("xpress_auth")?.value
        if (!c) return null
        const p = JSON.parse(c)
        return p.displayName ?? p.user ?? null
      } catch { return null }
    })()
    await logActivity(
      { displayName: who },
      {
        action: `Emitiu NF-e para ${body.client_name ?? "cliente"}`,
        entity_type: "nfe",
        entity_id: (data as { id?: string })?.id ?? undefined,
        details: { number: nfeNumber, series: nfeSeries },
      }
    )

    return NextResponse.json({ success: true, nfe: data }, { status: 201 })
  } catch (err) {
    console.error("Erro ao emitir NF-e:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro inesperado ao emitir NF-e" },
      { status: 500 },
    )
  }
}
