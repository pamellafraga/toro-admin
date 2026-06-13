import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, "..", ".env.local")
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

import { registerLiticaProTrial } from "../lib/liticapro/register-trial"
import { BR_UFS } from "../lib/liticapro/constants"
import { fetchCnpjFromGov } from "../lib/liticapro/cnpj-lookup"

const CNPJ = "03627226000105"
const PHONE = "65981590281"
const RESPONSIBLE = "Fernando Antonio Bellezzia"

const USERS = [
  {
    cpf: "39267598600",
    full_name: "Fernando Antonio Bellezzia",
    birth_date: "1964-06-06",
    email: "fernando.bellezzia@dssnet.com.br",
    is_owner: true,
  },
  {
    cpf: "06185375117",
    full_name: "Pamela Martins Silva",
    birth_date: "1998-09-10",
    email: "pamela.silva@dssnet.com.br",
  },
  {
    cpf: "99212544134",
    full_name: "Danielle Martins Camilo",
    birth_date: "1982-02-11",
    email: "danielle.camilo@dssnet.com.br",
  },
  {
    cpf: "12431258610",
    full_name: "Igor Brandão Alves",
    birth_date: "1993-04-26",
    email: "igor.brandao@dssnet.com.br",
  },
]

async function main() {
  const gov = await fetchCnpjFromGov(CNPJ)
  if (!gov?.razao_social) {
    throw new Error("Não foi possível consultar o CNPJ na Receita Federal.")
  }

  const billingAddress = {
    cep: String(gov.cep ?? "").replace(/\D/g, "") || "78000000",
    logradouro: String(gov.logradouro ?? "Endereço comercial").trim(),
    numero: String(gov.numero ?? "SN").trim(),
    bairro: String(gov.bairro ?? "Centro").trim(),
    cidade: String(gov.municipio ?? "Cuiabá").trim(),
    uf: String(gov.uf ?? "MT").trim().toUpperCase(),
  }

  const result = await registerLiticaProTrial({
    customer_type: "empresa",
    email: USERS[0].email,
    phone: PHONE,
    origem_captacao: "Manual — Xpress Admin",
    states_of_interest: [...BR_UFS],
    cnpj: CNPJ,
    responsible_name: RESPONSIBLE,
    business_segment: String(gov.cnae_fiscal_descricao ?? "Serviços de tecnologia").trim(),
    company_name: String(gov.razao_social).trim(),
    company_gov: gov,
    billing_address: billingAddress,
    company_users: USERS,
    auto_provision: true,
    send_welcome_email: true,
    activity_actor: { displayName: "Script provision DSSNET" },
  })

  console.log(JSON.stringify(result, null, 2))
  if (!result.success) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
