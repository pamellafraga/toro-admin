import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Endpoint para emissão de NF-e.
 * Ele não fala diretamente com a SEFAZ: encaminha o payload para um
 * provedor externo (ex.: Plugnotas, NFe.io, eNotas, Tecnospeed)
 * configurado via variáveis de ambiente, e registra a nota no Supabase.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()

    const supabase = await createClient()
    const apiUrl = process.env.NFE_API_URL
    const apiKey = process.env.NFE_API_KEY

    let providerJson: any = {}
    let nfeNumber: string | null = null
    let nfeSeries: string | null = null
    let nfeStatus = "emitida"
    let providerId: string | null = null

    if (apiUrl && apiKey) {
      const providerRes = await fetch(`${apiUrl}/nfe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      providerJson = await providerRes.json().catch(() => ({}))

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

      nfeNumber = providerJson.numero || providerJson.number || null
      nfeSeries = providerJson.serie || providerJson.series || null
      nfeStatus = providerJson.status || "emitida"
      providerId = providerJson.id || providerJson.uuid || null
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
      client_id: body.client_id,
      client_name: body.client_name,
      total_value: body.total_value,
      nature_operation: body.nature_operation,
      cfop: body.cfop,
      status: nfeStatus,
      number: nfeNumber,
      series: nfeSeries,
      provider_id: providerId,
      provider_payload: body.id && contractIdToActivate
        ? { ...body, contract_id: contractIdToActivate }
        : body,
      provider_response: providerJson,
    }

    let data
    let error

    if (body.id) {
      ;({ data, error } = await supabase
        .from("nfe_documents")
        .update(basePayload)
        .eq("id", body.id)
        .select()
        .single())
    } else {
      ;({ data, error } = await supabase
        .from("nfe_documents")
        .insert(basePayload)
        .select()
        .single())
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

    return NextResponse.json({ success: true, nfe: data }, { status: 201 })
  } catch (err) {
    console.error("Erro ao emitir NF-e:", err)
    return NextResponse.json({ error: "Erro inesperado ao emitir NF-e" }, { status: 500 })
  }
}

