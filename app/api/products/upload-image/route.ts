import { NextRequest } from "next/server"
import { isAdmin } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonForbidden, jsonOk } from "@/lib/api/response"
import { saveProductImage } from "@/lib/db/repositories/toro-product-images.repository"
import {
  ALLOWED_IMAGE_TYPES,
  extensionForMime,
  MAX_IMAGE_BYTES,
  productImageApiPath,
  resolveProductImageUrl,
  sanitizeImageFilename,
} from "@/lib/toro/product-image-url"

export const dynamic = "force-dynamic"

/** POST /api/products/upload-image — anexar foto do produto */
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) return jsonForbidden("Apenas administradores podem enviar imagens.")

    const form = await request.formData()
    const file = form.get("file")
    const label = String(form.get("name") ?? "produto")

    if (!(file instanceof File)) {
      return jsonError("Selecione um arquivo de imagem.", 400)
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return jsonError("Formato inválido. Use JPG, PNG, WebP ou GIF.", 400)
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return jsonError("Imagem muito grande. Máximo 5 MB.", 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = sanitizeImageFilename(label, extensionForMime(file.type))
    await saveProductImage(filename, file.type, buffer)

    const path = productImageApiPath(filename)
    return jsonOk({
      filename,
      path,
      url: resolveProductImageUrl(path),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ""
    if (/toro_product_images|relation .* does not exist/i.test(msg)) {
      return jsonError(
        "Tabela de imagens não encontrada. Execute scripts/037_toro_product_images.sql no PostgreSQL.",
        503,
      )
    }
    return handleApiError(e, "Erro ao enviar imagem.")
  }
}
