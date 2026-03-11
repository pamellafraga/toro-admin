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

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        { error: "Configuração de NF-e ausente. Defina NFE_API_URL e NFE_API_KEY no .env.local." },
        { status: 500 },
      )
    }

    // Enviar para o provedor externo de NF-e.
    // O formato exato do payload depende do provedor;
    // aqui apenas repassamos o corpo recebido.
    const providerRes = await fetch(`${apiUrl}/nfe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    const providerJson = await providerRes.json().catch(() => ({}))

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

    // Extrair alguns campos padrão da resposta do provedor, se existirem.
    const nfeNumber = providerJson.numero || providerJson.number || null
    const nfeSeries = providerJson.serie || providerJson.series || null
    const nfeStatus = providerJson.status || "emitida"
    const providerId = providerJson.id || providerJson.uuid || null

    // Registrar a NF-e no Supabase (tabela nfe_documents).
    const { data, error } = await supabase
      .from("nfe_documents")
      .insert({
        client_id: body.client_id,
        client_name: body.client_name,
        total_value: body.total_value,
        nature_operation: body.nature_operation,
        cfop: body.cfop,
        status: nfeStatus,
        number: nfeNumber,
        series: nfeSeries,
        provider_id: providerId,
        provider_payload: body,
        provider_response: providerJson,
      })
      .select()
      .single()

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

    return NextResponse.json({ success: true, nfe: data }, { status: 201 })
  } catch (err) {
    console.error("Erro ao emitir NF-e:", err)
    return NextResponse.json({ error: "Erro inesperado ao emitir NF-e" }, { status: 500 })
  }
}

