export const TORO_ADMIN_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://toro-admin.vercel.app")

export const TORO_SITE_URL =
  process.env.TORO_SITE_URL?.trim() || process.env.NEXT_PUBLIC_TORO_SITE_URL?.trim() || "https://toro-green.vercel.app"

export const PRODUCT_IMAGE_API_PREFIX = "/api/public/products/image/"

export function productImageApiPath(filename: string): string {
  return `${PRODUCT_IMAGE_API_PREFIX}${encodeURIComponent(filename)}`
}

export function resolveProductImageUrl(imagePath?: string | null): string {
  if (!imagePath?.trim()) return ""
  const path = imagePath.trim()
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  const normalized = path.startsWith("/") ? path : `/${path}`
  if (normalized.startsWith(PRODUCT_IMAGE_API_PREFIX)) {
    return `${TORO_ADMIN_URL}${normalized}`
  }
  return `${TORO_SITE_URL}${normalized}`
}

export function sanitizeImageFilename(name: string, ext: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base || "produto"}-${suffix}.${ext}`
}

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg"
    case "image/png":
      return "png"
    case "image/webp":
      return "webp"
    case "image/gif":
      return "gif"
    default:
      return "jpg"
  }
}
