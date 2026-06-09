const RAMOS: Record<string, string> = {
  construcao_civil: "Construção civil e obras",
  imobiliario: "Imobiliário e empreendimentos",
  comercio_varejo: "Comércio e varejo",
  comercio_alimentos: "Alimentos e mercearia",
  farmacia: "Farmácia e saúde",
  servicos_gerais: "Serviços gerais",
}

export function labelRamoNegocio(id: string): string {
  return RAMOS[id] ?? id
}
