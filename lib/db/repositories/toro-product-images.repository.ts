import { queryOne } from "@/lib/db/pool"

export async function saveProductImage(
  filename: string,
  contentType: string,
  data: Buffer,
): Promise<void> {
  await queryOne(
    `INSERT INTO toro_product_images (filename, content_type, data)
     VALUES ($1, $2, $3)
     ON CONFLICT (filename) DO UPDATE SET
       content_type = EXCLUDED.content_type,
       data = EXCLUDED.data`,
    [filename, contentType, data],
  )
}

export async function getProductImage(
  filename: string,
): Promise<{ content_type: string; data: Buffer } | null> {
  const row = await queryOne<{ content_type: string; data: Buffer }>(
    `SELECT content_type, data FROM toro_product_images WHERE filename = $1 LIMIT 1`,
    [filename],
  )
  return row ?? null
}
