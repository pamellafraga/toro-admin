import { z } from "zod"

const addressSchema = z.object({
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
})

const recipientSchema = z.object({
  document: z
    .string()
    .refine((v) => v.length === 11 || v.length === 14, "CPF deve ter 11 dígitos ou CNPJ 14 dígitos"),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().optional(),
  address: addressSchema.optional(),
})

const itemSchema = z.object({
  description: z.string(),
  quantity: z.number().min(0),
  unit_value: z.number().min(0),
  total_value: z.number().min(0),
  cfop: z.string().optional(),
})

export const nfeIssueBodySchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().nullable().optional(),
  client_name: z.string().min(1, "Nome do cliente é obrigatório"),
  total_value: z.number().min(0, "Valor deve ser >= 0"),
  nature_operation: z.string().optional(),
  cfop: z.string().optional(),
  description: z.string().optional(),
  recipient: recipientSchema,
  items: z.array(itemSchema).min(1, "Pelo menos um item é obrigatório"),
})

export type NfeIssueBody = z.infer<typeof nfeIssueBodySchema>
