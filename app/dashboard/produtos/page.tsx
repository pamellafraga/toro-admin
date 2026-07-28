"use client"

import { useMemo, useState, useEffect } from "react"
import Image from "next/image"
import { ExternalLink, ImagePlus, Loader2, Pencil, Plus, Save, X } from "lucide-react"
import useSWR from "swr"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { formatToroPrice } from "@/lib/products/catalog"

const SITE_URL = "https://toro-green.vercel.app"

type StoreStatus = "disponivel" | "esgotado"

type ToroProduct = {
  id: string
  name: string
  category: string
  gender: "feminino" | "masculino"
  price: number
  image: string
  stockTotal: number
  status: StoreStatus
  slug?: string
}

async function fetchProducts(): Promise<{ products: ToroProduct[]; warning?: string }> {
  const res = await fetch("/api/products", { credentials: "include", cache: "no-store" })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "Erro ao carregar produtos")
  return {
    products: (json.products ?? []) as ToroProduct[],
    warning: json.warning as string | undefined,
  }
}

export default function ProdutosPage() {
  const { isAdmin } = useAuth()
  const { data, error, isLoading, mutate } = useSWR("toro-products-admin", fetchProducts)
  const [showAdd, setShowAdd] = useState(false)

  const products = useMemo(() => data?.products ?? [], [data])
  const warning = data?.warning

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Produtos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Catálogo sincronizado com{" "}
            <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="underline">
              toro-green.vercel.app
            </a>
            . Edições aqui refletem na loja; compras atualizam o estoque automaticamente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#101010] px-4 py-2 text-sm font-medium text-[#FDFCF8] hover:bg-[#2a2a2a]"
            >
              <Plus className="h-4 w-4" /> Adicionar produto
            </button>
          )}
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[#E3DBCC] px-4 py-2 text-sm text-foreground hover:bg-[#F3F0E9]"
          >
            Ver loja <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando catálogo…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Não foi possível carregar o catálogo.{" "}
          <button type="button" className="underline font-medium" onClick={() => void mutate()}>
            Tentar novamente
          </button>
        </div>
      )}

      {warning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {warning}
        </div>
      )}

      {!isLoading && !error && products.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isAdmin={isAdmin}
            onSaved={() => mutate()}
          />
        ))}
      </div>

      {showAdd && isAdmin && (
        <AddProductModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false)
            void mutate()
          }}
        />
      )}
    </div>
  )
}

function ProductCard({
  product,
  isAdmin,
  onSaved,
}: {
  product: ToroProduct
  isAdmin: boolean
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(product.name)
  const [price, setPrice] = useState(String(product.price))
  const [stock, setStock] = useState(String(product.stockTotal))
  const [status, setStatus] = useState<StoreStatus>(product.status)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) {
      setName(product.name)
      setPrice(String(product.price))
      setStock(String(product.stockTotal))
      setStatus(product.status)
    }
  }, [product, editing])

  const imageSrc = product.image || `${SITE_URL}/logo.png`

  const cancelEdit = () => {
    setName(product.name)
    setPrice(String(product.price))
    setStock(String(product.stockTotal))
    setStatus(product.status)
    setEditing(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          price: Number(price),
          stockTotal: Math.max(0, Number(stock) || 0),
          status,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Erro ao salvar")
      if (json.product) {
        setStatus(json.product.status)
        setStock(String(json.product.stockTotal ?? stock))
      }
      toast.success("Produto atualizado — loja sincronizada.")
      setEditing(false)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  const displayStatus = editing ? status : product.status

  return (
    <div className="glass flex flex-col overflow-hidden rounded-xl border border-[#E3DBCC]/80">
      <div className="relative aspect-[3/4] bg-[#F3F0E9]">
        <Image
          src={imageSrc}
          alt={product.name}
          fill
          className="object-cover object-top"
          sizes="(max-width: 1280px) 20vw, 240px"
          unoptimized
        />
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            displayStatus === "disponivel"
              ? "bg-[#101010] text-[#FDFCF8]"
              : "bg-[#E3DBCC] text-[#101010]"
          }`}
        >
          {displayStatus === "disponivel" ? "Disponível" : "Esgotado"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {product.category} · {product.gender === "feminino" ? "Feminino" : "Masculino"}
        </p>

        {isAdmin && editing ? (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#E3DBCC] bg-[#FDFCF8] px-2 py-1.5 text-sm font-semibold text-foreground"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-0.5 text-[10px] uppercase text-muted-foreground">
                Preço (R$)
                <input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="rounded-lg border border-[#E3DBCC] bg-[#FDFCF8] px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[10px] uppercase text-muted-foreground">
                Peças
                <input
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="rounded-lg border border-[#E3DBCC] bg-[#FDFCF8] px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StoreStatus)}
              className="rounded-lg border border-[#E3DBCC] bg-[#F3F0E9] px-2 py-1.5 text-xs font-medium"
            >
              <option value="disponivel">Disponível</option>
              <option value="esgotado">Esgotado</option>
            </select>
            <div className="mt-auto flex gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="flex-1 rounded-lg border border-[#E3DBCC] px-3 py-2 text-xs font-medium hover:bg-[#F3F0E9] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#101010] px-3 py-2 text-xs font-semibold text-[#FDFCF8] hover:bg-[#2a2a2a] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-sm font-semibold leading-tight">{product.name}</h3>
            <p className="text-sm font-medium">{formatToroPrice(product.price)}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Estoque total</span>
              <span className="font-medium text-foreground">{product.stockTotal} un.</span>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E3DBCC] bg-[#FDFCF8] px-3 py-2 text-xs font-medium text-foreground hover:bg-[#F3F0E9]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
            )}
          </>
        )}

        <a
          href={`${SITE_URL}/produto/${product.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-foreground underline-offset-2 hover:underline"
        >
          Ver no site
        </a>
      </div>
    </div>
  )
}

function AddProductModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("0")
  const [gender, setGender] = useState<"feminino" | "masculino">("feminino")
  const [category, setCategory] = useState("Produto")
  const [image, setImage] = useState("")
  const [imagePreview, setImagePreview] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem (JPG, PNG, WebP ou GIF).")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5 MB.")
      return
    }

    setUploadingImage(true)
    const preview = URL.createObjectURL(file)
    setImagePreview(preview)

    try {
      const form = new FormData()
      form.append("file", file)
      form.append("name", name.trim() || file.name.replace(/\.[^.]+$/, ""))

      const res = await fetch("/api/products/upload-image", {
        method: "POST",
        credentials: "include",
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Erro ao enviar imagem")

      setImage(json.path as string)
      setImagePreview(json.url as string)
      toast.success("Imagem anexada.")
    } catch (err) {
      setImagePreview("")
      setImage("")
      toast.error(err instanceof Error ? err.message : "Erro ao enviar imagem")
    } finally {
      setUploadingImage(false)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void uploadImage(file)
    e.target.value = ""
  }

  const clearImage = () => {
    setImage("")
    setImagePreview("")
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price: Number(price),
          stockTotal: Number(stock) || 0,
          gender,
          category,
          image: image.trim() || undefined,
          description: description.trim() || undefined,
          status: Number(stock) > 0 ? "disponivel" : "esgotado",
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Erro ao criar")
      toast.success("Produto adicionado — já disponível na loja.")
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar produto")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101010]/60 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-[#E3DBCC] bg-[#FDFCF8] p-6 shadow-xl"
      >
        <h3 className="text-lg font-bold text-foreground">Novo produto</h3>
        <p className="mt-1 text-xs text-muted-foreground">Será publicado automaticamente no site.</p>

        <div className="mt-4 space-y-3">
          <input
            required
            placeholder="Nome do produto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-[#E3DBCC] px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              type="number"
              min={0}
              placeholder="Preço R$"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-lg border border-[#E3DBCC] px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              placeholder="Quantidade"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="rounded-lg border border-[#E3DBCC] px-3 py-2 text-sm"
            />
          </div>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as "feminino" | "masculino")}
            className="w-full rounded-lg border border-[#E3DBCC] px-3 py-2 text-sm"
          >
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
          </select>
          <input
            placeholder="Categoria (ex.: Shorts, Tops)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-[#E3DBCC] px-3 py-2 text-sm"
          />

          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Foto do produto
            </label>
            {imagePreview ? (
              <div className="relative overflow-hidden rounded-lg border border-[#E3DBCC] bg-[#F3F0E9]">
                <div className="relative aspect-[3/4] max-h-48 w-full">
                  <Image
                    src={imagePreview}
                    alt="Prévia"
                    fill
                    className="object-cover object-top"
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute right-2 top-2 rounded-full bg-[#101010]/80 p-1 text-[#FDFCF8] hover:bg-[#101010]"
                  aria-label="Remover imagem"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#E3DBCC] bg-[#F3F0E9]/50 px-4 py-8 transition-colors hover:border-[#101010]/30 hover:bg-[#F3F0E9] ${uploadingImage ? "pointer-events-none opacity-60" : ""}`}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={onFileChange}
                  disabled={uploadingImage}
                />
                {uploadingImage ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <ImagePlus className="h-8 w-8 text-muted-foreground" />
                )}
                <span className="text-center text-xs text-muted-foreground">
                  {uploadingImage ? "Enviando imagem…" : "Clique ou arraste para anexar"}
                </span>
                <span className="text-[10px] text-muted-foreground/70">JPG, PNG, WebP ou GIF · até 5 MB</span>
              </label>
            )}
          </div>

          <textarea
            placeholder="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-[#E3DBCC] px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#E3DBCC] py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || uploadingImage}
            className="flex-1 rounded-lg bg-[#101010] py-2 text-sm font-semibold text-[#FDFCF8] disabled:opacity-50"
          >
            {saving ? "Salvando…" : uploadingImage ? "Aguardando imagem…" : "Adicionar"}
          </button>
        </div>
      </form>
    </div>
  )
}
