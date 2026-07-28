import { randomUUID } from "crypto"
import { queryOne } from "@/lib/db/pool"

export async function saveProductImage(
  filename: string,
  contentType: string,
  data: Buffer,
): Promise<void> {
  await queryOne(
    `INSERT INTO toro_product_images (id, filename, content_type, data)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       content_type = VALUES(content_type),
       data = VALUES(data)`,
    [randomUUID(), filename, contentType, data],
  )
}

export async function getProductImage(
  filename: string,
): Promise<{ content_type: string; data: Buffer } | null> {
  const row = await queryOne<{ content_type: string; data: Buffer }>(
    `SELECT content_type, data FROM toro_product_images WHERE filename = ? LIMIT 1`,
    [filename],
  )
  return row ?? null
}
