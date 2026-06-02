import { NextRequest } from "next/server"
import { isAuthenticated, parseAuthCookie } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { logActivity } from "@/lib/activity-log"
import { activateContract } from "@/lib/db/repositories/contracts.repository"
import { findNfeDocument, insertNfeDocument, updateNfeDocument } from "@/lib/db/repositories/nfe.repository"
import { emitirNfseNacional, getConfigNfseNacional } from "@/lib/nfse/nacional"
import { nfeIssueBodySchema } from "@/lib/schemas/nfe"
import { saveNfePdf } from "@/lib/storage/nfe-pdf"

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return jsonUnauthorized()

  try {
    const raw = await req.json()
    const parseResult = nfeIssueBodySchema.safeParse(raw)
    if (!parseResult.success) {
      const first = parseResult.error.flatten().fieldErrors
      const msg = Object.values(first).flat().join(" ") || "Dados inválidos."
      return jsonError(msg, 400)
    }
    const body = parseResult.data

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
        return jsonError(msg, 502)
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
        return jsonOk(
          {
            error: "Falha ao emitir NF-e no provedor",
            providerStatus: providerRes.status,
            providerResponse: providerJson,
          },
          502,
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
      const existing = await findNfeDocument(body.id)
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
        body.id && contractIdToActivate ? { ...raw, contract_id: contractIdToActivate } : raw,
      provider_response: providerJson,
    }

    let data: { id?: string } | null
    if (body.id) {
      data = (await updateNfeDocument(body.id, basePayload)) as { id?: string } | null
    } else {
      data = (await insertNfeDocument(basePayload)) as { id?: string } | null
    }

    if (!data) {
      return jsonError("NF-e emitida no provedor, mas falhou ao salvar no banco", 500)
    }

    const nfeId = data.id
    if (nfeId) {
      const pdfUrl = typeof providerJson.pdfUrl === "string" ? providerJson.pdfUrl.trim() : null
      const pdfBase64 = typeof providerJson.pdfBase64 === "string" ? providerJson.pdfBase64 : null
      let pdfBuffer: Buffer | null = null

      if (pdfUrl) {
        try {
          const res = await fetch(pdfUrl)
          if (res.ok) pdfBuffer = Buffer.from(await res.arrayBuffer())
        } catch (e) {
          console.warn("Falha ao baixar PDF do provedor:", e)
        }
      } else if (pdfBase64) {
        try {
          const b64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "")
          pdfBuffer = Buffer.from(b64, "base64")
        } catch (e) {
          console.warn("Falha ao decodificar PDF base64:", e)
        }
      }

      if (pdfBuffer && pdfBuffer.byteLength > 0) {
        try {
          const storagePath = await saveNfePdf(nfeId, pdfBuffer)
          await updateNfeDocument(nfeId, { pdf_storage_path: storagePath })
        } catch (e) {
          console.warn("Falha ao salvar PDF local:", e)
        }
      }
    }

    if (contractIdToActivate) {
      await activateContract(contractIdToActivate)
    }

    const auth = parseAuthCookie(req)
    await logActivity(
      { displayName: auth?.displayName },
      {
        action: `Emitiu NF-e para ${body.client_name ?? "cliente"}`,
        entity_type: "nfe",
        entity_id: data.id,
        details: { number: nfeNumber, series: nfeSeries },
      },
    )

    return jsonOk({ success: true, nfe: data }, 201)
  } catch (err) {
    console.error("Erro ao emitir NF-e:", err)
    return handleApiError(err, "Erro inesperado ao emitir NF-e")
  }
}
