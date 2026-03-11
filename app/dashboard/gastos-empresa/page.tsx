"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Trash2, Edit2 } from "lucide-react"

/** Taxa de conversão USD → BRL em 11/03/2026 (fonte: mídia financeira) */
const USD_TO_BRL_RATE = 5.16

interface Fee {
  id: string
  name: string
  category: string
  valueUsd: number
  valueBrl: number
  dueDate: number
  notes?: string
}

export default function GastoEmpresaPage() {
  const { isAdmin } = useAuth()
  const [fees, setFees] = useState<Fee[]>([
    {
      id: "1",
      name: "v0 by Vercel",
      category: "FERRAMENTAS DE CRIAÇÃO",
      valueUsd: 20.0,
      valueBrl: 106.29,
      dueDate: 25,
      notes: "Plataforma de desenvolvimento",
    },
    {
      id: "2",
      name: "Copilot Pro",
      category: "FERRAMENTAS DE CRIAÇÃO",
      valueUsd: 10.0,
      valueBrl: 51.86,
      dueDate: 25,
      notes: "Assistente de IA avançado",
    },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    category: "FERRAMENTAS DE CRIAÇÃO",
    valueUsd: 0,
    valueBrl: 0,
    dueDate: 1,
    notes: "",
  })

  const categories = ["FERRAMENTAS DE CRIAÇÃO", "DOMÍNIOS E HOSPEDAGENS"]

  // Corrige itens que têm USD mas BRL zerado: preenche BRL convertido no estado
  useEffect(() => {
    const needsFix = fees.some(
      (f) => Number(f.valueUsd) > 0 && (Number(f.valueBrl) === 0 || Number.isNaN(Number(f.valueBrl)))
    )
    if (!needsFix) return
    setFees((prev) =>
      prev.map((f) => {
        const usd = Number(f.valueUsd)
        if (usd > 0 && (Number(f.valueBrl) === 0 || Number.isNaN(Number(f.valueBrl)))) {
          return {
            ...f,
            valueBrl: Math.round(usd * USD_TO_BRL_RATE * 100) / 100,
          }
        }
        return f
      })
    )
  }, [fees.length])

  const handleAddFee = () => {
    if (!formData.name || formData.valueUsd <= 0) {
      alert("Por favor, preencha todos os campos obrigatórios")
      return
    }

    const valueBrl =
      formData.valueBrl > 0 ? formData.valueBrl : Math.round(formData.valueUsd * USD_TO_BRL_RATE * 100) / 100

    const newFee: Fee = {
      id: Date.now().toString(),
      name: formData.name,
      category: formData.category,
      valueUsd: formData.valueUsd,
      valueBrl,
      dueDate: formData.dueDate,
      notes: formData.notes,
    }

    setFees([...fees, newFee])
    setFormData({ name: "", category: "FERRAMENTAS DE CRIAÇÃO", valueUsd: 0, valueBrl: 0, dueDate: 1, notes: "" })
    setIsDialogOpen(false)
  }

  const handleDeleteFee = (id: string) => {
    setFees(fees.filter((fee) => fee.id !== id))
  }

  const getEffectiveBrl = (fee: Fee): number => {
    const usd = Number(fee.valueUsd)
    const brl = Number(fee.valueBrl)
    if (usd > 0 && (brl === 0 || !Number.isFinite(brl))) {
      return Math.round(usd * USD_TO_BRL_RATE * 100) / 100
    }
    return Number.isFinite(brl) ? brl : 0
  }

  // Lista para exibição: todo item com USD e BRL zerado já sai com BRL convertido
  const feesForDisplay = useMemo(
    () => fees.map((f) => ({ ...f, valueBrl: getEffectiveBrl(f) })),
    [fees]
  )

  const totalBrl = feesForDisplay.reduce((sum, fee) => sum + fee.valueBrl, 0)
  const totalUsd = fees.reduce((sum, fee) => sum + fee.valueUsd, 0)

  const groupedFees = categories.map((cat) => ({
    category: cat,
    items: feesForDisplay.filter((f) => f.category === cat),
  }))

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-muted-foreground">Acesso restrito a administradores</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos da Empresa</h1>
          <p className="text-muted-foreground mt-2">Gerencie os custos de ferramentas, domínios e hospedagens</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Gasto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Gasto</DialogTitle>
              <DialogDescription>Preencha os dados do novo gasto mensal</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Nome da Ferramenta/Serviço</Label>
                <Input
                  id="name"
                  placeholder="Ex: v0 by Vercel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  title="Categoria do gasto"
                  aria-label="Categoria do gasto"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valueUsd">Valor (USD)</Label>
                  <Input
                    id="valueUsd"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.valueUsd || ""}
                    onChange={(e) => {
                      const usd = parseFloat(e.target.value) || 0
                      setFormData({
                        ...formData,
                        valueUsd: usd,
                        valueBrl: usd > 0 ? Math.round(usd * USD_TO_BRL_RATE * 100) / 100 : 0,
                      })
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="valueBrl">Valor (BRL) — convertido automaticamente</Label>
                  <Input
                    id="valueBrl"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.valueBrl || ""}
                    onChange={(e) => setFormData({ ...formData, valueBrl: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="dueDate">Dia do Vencimento</Label>
                <Input
                  id="dueDate"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="25"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notas (Opcional)</Label>
                <Input
                  id="notes"
                  placeholder="Observações adicionais"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button onClick={handleAddFee} className="w-full">
                Adicionar Gasto
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo Total */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total em USD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">US ${totalUsd.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Mensal</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total em BRL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">R$ {totalBrl.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Mensal</p>
          </CardContent>
        </Card>
      </div>

      {/* Cards por Categoria */}
      <div className="space-y-6">
        {groupedFees.map((group) => (
          <div key={group.category}>
            <h2 className="text-xl font-semibold mb-4">🛠️ {group.category}</h2>
            {group.items.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Nenhum gasto cadastrado nesta categoria
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((fee) => (
                  <Card key={fee.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{fee.name}</CardTitle>
                          {fee.notes && <CardDescription className="text-xs mt-1">{fee.notes}</CardDescription>}
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteFee(fee.id)}
                            className="text-destructive hover:text-destructive/80 ml-2"
                            title="Deletar gasto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Valor USD:</span>
                          <span className="font-semibold">US ${Number(fee.valueUsd).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Valor BRL:</span>
                          <span className="font-semibold">R$ {fee.valueBrl.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t pt-2">
                          <span className="text-muted-foreground">Vencimento:</span>
                          <span className="font-semibold">Dia {fee.dueDate}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
