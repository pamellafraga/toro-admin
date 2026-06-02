import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"

const DEFAULT_DIR = path.join(process.cwd(), "storage", "nfe-pdfs")

function getStorageDir(): string {
  return process.env.NFE_PDF_DIR?.trim() || DEFAULT_DIR
}

export async function saveNfePdf(documentId: string, buffer: Buffer, filename?: string): Promise<string> {
  const dir = getStorageDir()
  await mkdir(dir, { recursive: true })
  const safeName = filename?.replace(/[^\w.-]/g, "_") || `${documentId}.pdf`
  const relativePath = `${documentId}/${safeName}`
  const fullPath = path.join(dir, relativePath)
  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, buffer)
  return relativePath
}

export async function readNfePdf(relativePath: string): Promise<Buffer | null> {
  try {
    const fullPath = path.join(getStorageDir(), relativePath)
    return await readFile(fullPath)
  } catch {
    return null
  }
}

export function getNfePdfPublicPath(relativePath: string): string {
  return `/api/nfe/documents/file?path=${encodeURIComponent(relativePath)}`
}
