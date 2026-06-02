import { queryOne } from "@/lib/db/pool"

export async function insertNotification(input: {
  title: string
  message: string
  type?: string
  link?: string | null
}): Promise<void> {
  await queryOne(
    `INSERT INTO notifications (title, message, type, link) VALUES ($1, $2, $3, $4)`,
    [input.title, input.message, input.type ?? "info", input.link ?? null],
  )
}
