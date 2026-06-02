"use client"

import { cn } from "@/lib/utils"
import { getCnaeEntries } from "@/lib/liticapro/cnae"
import type { CnpjGovData } from "@/lib/liticapro/types"

const sectionClass = "space-y-2"
const sectionTitleClass = "text-[11px] font-semibold text-primary uppercase tracking-wide"
const labelClass = "text-[11px] font-medium text-muted-foreground mb-0.5 block"
const inputClass =
  "w-full h-8 rounded-lg border-2 border-primary/50 bg-background px-2.5 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"

interface CnaeListProps {
  gov: CnpjGovData | null | undefined
  emptyMessage?: string
}

export function LiticaProCnaeList({ gov, emptyMessage }: CnaeListProps) {
  const entries = getCnaeEntries(gov)

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {emptyMessage ?? "Consulte o CNPJ para carregar os CNAEs da Receita Federal."}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((cnae) => (
        <div
          key={`${cnae.tipo}-${cnae.codigo}-${cnae.descricao}`}
          className="rounded-lg bg-muted/30 px-2.5 py-1.5"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
            {cnae.tipo === "principal" ? "CNAE principal" : "CNAE secundário"}
          </p>
          <p className="text-sm text-foreground mt-0.5">
            {cnae.codigo ? `${cnae.codigo} — ` : ""}
            {cnae.descricao || "—"}
          </p>
        </div>
      ))}
    </div>
  )
}

interface CnaeAndRamoSectionProps {
  gov: CnpjGovData | null | undefined
  ramo: string
  setRamo: (v: string) => void
  ramoRequired?: boolean
  inline?: boolean
  readOnly?: boolean
}

/** CNAEs da Receita (lista) + campo livre para o ramo de atuação. */
export function LiticaProCnaeAndRamoSection({
  gov,
  ramo,
  setRamo,
  ramoRequired = true,
  inline = false,
  readOnly = false,
}: CnaeAndRamoSectionProps) {
  const ramoField = (
    <div>
      <label className={labelClass}>
        Qual ramo se aplica a este cadastro{ramoRequired ? " *" : ""}
      </label>
      <input
        readOnly={readOnly}
        className={cn(inputClass, readOnly && "bg-muted/40 cursor-default border-border")}
        value={ramo}
        onChange={(e) => setRamo(e.target.value)}
        placeholder="Ex.: Engenharia Civil, Construção civil, TI..."
      />
      {!inline && (
        <p className="text-[10px] text-muted-foreground mt-1">
          Escreva o ramo principal — independente da lista de CNAEs acima.
        </p>
      )}
    </div>
  )

  if (inline) {
    return (
      <section className={sectionClass}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <p className={sectionTitleClass}>CNAEs da Receita Federal</p>
            <LiticaProCnaeList gov={gov} />
          </div>
          <div>
            <p className={sectionTitleClass}>Ramo de atuação</p>
            {ramoField}
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className={sectionClass}>
        <p className={sectionTitleClass}>CNAEs da Receita Federal</p>
        <LiticaProCnaeList gov={gov} />
      </section>

      <section className={sectionClass}>
        <p className={sectionTitleClass}>Ramo de atuação</p>
        {ramoField}
      </section>
    </>
  )
}

interface CompactCnaeAndRamoProps {
  gov: CnpjGovData | null | undefined
  ramo: string
  setRamo: (v: string) => void
}

/** Versão compacta dentro de cada CNPJ vinculado (profissional liberal). */
export function LiticaProCnaeAndRamoCompact({ gov, ramo, setRamo }: CompactCnaeAndRamoProps) {
  return (
    <div className="space-y-3 pt-1">
      <div>
        <p className={labelClass}>CNAEs da Receita</p>
        <LiticaProCnaeList gov={gov} emptyMessage="Informe e consulte o CNPJ para ver os CNAEs." />
      </div>
      <div>
        <label className={labelClass}>Ramo de atuação *</label>
        <input
          className={inputClass}
          value={ramo}
          onChange={(e) => setRamo(e.target.value)}
          placeholder="Ex.: Engenharia Civil"
        />
      </div>
    </div>
  )
}
