"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { ExternalLink, Loader2, Plus, Save } from "lucide-react"
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

async function fetchProducts(): Promise<ToroProduct[]> {
  const res = await fetch("/api/products", { credentials: "include", cache: "no-store" })
  if (!res.ok) throw new Error("Erro ao carregar produtos")
  const json = await res.json()
  return (json.products ?? []) as ToroProduct[]
}

export default function ProdutosPage() {
  const { isAdmin } = useAuth()
  const { data, isLoading, mutate } = useSWR("toro-products-admin", fetchProducts)
  const [showAdd, setShowAdd] = useState(false)

  const products = useMemo(() => data ?? [], [data])

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
  const [name, setName] = useState(product.name)
  const [price, setPrice] = useState(String(product.price))
  const [stock, setStock] = useState(String(product.stockTotal))
  const [status, setStatus] = useState<StoreStatus>(product.status)
  const [saving, setSaving] = useState(false)

  const imageSrc = product.image || `${SITE_URL}/logo.png`

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
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

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
            status === "disponivel"
              ? "bg-[#101010] text-[#FDFCF8]"
              : "bg-[#E3DBCC] text-[#101010]"
          }`}
        >
          {status === "disponivel" ? "Disponível" : "Esgotado"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {product.category} · {product.gender === "feminino" ? "Feminino" : "Masculino"}
        </p>

        {isAdmin ? (
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
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#101010] px-3 py-2 text-xs font-semibold text-[#FDFCF8] hover:bg-[#2a2a2a] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar
            </button>
          </>
        ) : (
          <>
            <h3 className="text-sm font-semibold leading-tight">{product.name}</h3>
            <p className="text-sm font-medium">{formatToroPrice(product.price)}</p>
            <p className="text-xs text-muted-foreground">{product.stockTotal} peças</p>
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
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

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
          <input
            placeholder="URL da foto (ex.: /products/nome.webp no site)"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            className="w-full rounded-lg border border-[#E3DBCC] px-3 py-2 text-sm"
          />
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
            disabled={saving}
            className="flex-1 rounded-lg bg-[#101010] py-2 text-sm font-semibold text-[#FDFCF8] disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Adicionar"}
          </button>
        </div>
      </form>
    </div>
  )
}
