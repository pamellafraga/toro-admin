import { NextRequest, NextResponse } from "next/server"
import { getProductImage } from "@/lib/db/repositories/toro-product-images.repository"
import { applyPublicCors } from "@/lib/public-api/cors"

export const dynamic = "force-dynamic"

export async function OPTIONS(request: NextRequest) {
  return applyPublicCors(request, new NextResponse(null, { status: 204 }))
}

/** GET /api/public/products/image/[filename] — imagem para painel e loja */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params
  const safe = decodeURIComponent(filename).replace(/[^a-zA-Z0-9._-]/g, "")
  if (!safe) {
    return applyPublicCors(request, NextResponse.json({ error: "Arquivo inválido." }, { status: 400 }))
  }

  const image = await getProductImage(safe)
  if (!image) {
    return applyPublicCors(request, NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 }))
  }

  const response = new NextResponse(image.data, {
    status: 200,
    headers: {
      "Content-Type": image.content_type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
  return applyPublicCors(request, response)
}
