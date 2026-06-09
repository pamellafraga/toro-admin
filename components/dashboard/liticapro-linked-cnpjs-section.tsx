"use client"

import { formatCnpj } from "@/lib/format/br"
import { LiticaProCnaeList } from "@/components/dashboard/liticapro-cnae-section"
import { linkedCnpjRecordToGov } from "@/lib/liticapro/linked-cnpj-gov"

const sectionTitleClass = "text-[11px] font-semibold text-primary uppercase tracking-wide"

interface Props {
  linkedCnpjs: Array<Record<string, unknown>>
  readOnly?: boolean
}

export function LiticaProLinkedCnpjsSection({ linkedCnpjs, readOnly }: Props) {
  if (!linkedCnpjs.length) {
    return (
      <section className="space-y-2">
        <p className={sectionTitleClass}>Empresas vinculadas</p>
        <p className="text-xs text-muted-foreground">Nenhuma empresa vinculada cadastrada.</p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <p className={sectionTitleClass}>Empresas vinculadas ({linkedCnpjs.length})</p>
      <div className="space-y-3">
        {linkedCnpjs.map((item, index) => {
          const cnpj = String(item.cnpj ?? "").replace(/\D/g, "")
          const razao = String(item.razao_social ?? "").trim() || "—"
          const ramo = String(item.ramo_atuacao ?? "").trim()
          const states = Array.isArray(item.states)
            ? item.states.map((uf) => String(uf).trim().toUpperCase()).filter(Boolean)
            : []
          const gov = linkedCnpjRecordToGov(item)

          return (
            <div
              key={`${cnpj || "row"}-${index}`}
              className="rounded-lg border border-border bg-muted/15 p-3 space-y-2"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="text-sm font-semibold text-foreground">{razao}</p>
                {cnpj.length === 14 ? (
                  <p className="text-xs font-mono text-muted-foreground">{formatCnpj(cnpj)}</p>
                ) : null}
              </div>
              {ramo ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Ramo:</span> {ramo}
                </p>
              ) : null}
              {states.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">UFs:</span>{" "}
                  {states.join(", ")}
                </p>
              ) : null}
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  CNAEs
                </p>
                <LiticaProCnaeList
                  gov={gov}
                  emptyMessage={
                    readOnly
                      ? "CNAEs não sincronizados — ressincronize com a ferramenta."
                      : "Consulte o CNPJ para carregar os CNAEs."
                  }
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
