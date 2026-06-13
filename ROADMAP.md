## 🚀 Roadmap Xpress — Ecossistema SaaS

**Este documento descreve o que FALTA implementar.** O que o projeto já tem está no [README.md](./README.md).

> **Contexto (resumo):** O dashboard já tem login (dashboard_users), esqueci minha senha (Resend), usuários com e-mail de redefinição, NF-e (emissão/cancelar/excluir), módulo Senhas/Sistemas (admin_credentials), **Comissões** (vendas por comercial no mês, % bônus e prêmio total — só Admin), histórico de atividades (clientes, contratos, NF-e, usuários) com atualização da Home e da página Atividades, confirmação em exclusões, deploy (Vercel, DEPLOY.md) e noindex/robots para não indexar o painel. **LicitaPregão:** site ↔ dashboard ↔ SaaS integrados (cadastro trial, provisionamento, sync bidirecional). **Segura / pagamentos:** ainda pendentes.

> **Banco de dados:** O **Dashboard** usa Supabase. O **LicitaPregão** usa PostgreSQL próprio (Prisma). A integração entre eles é via APIs REST (tokens compartilhados), não banco compartilhado.

> **Automações:** Hoje no código (Resend, webhooks). Se ficar complexo, reavaliar n8n.

### 🔍 Visão geral dos 3 repositórios

| Projeto                      | O que já existe                                                                                 | O que ainda falta principal                                                                                   | Progresso |
|------------------------------|-------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|----------:|
| 🌐 **Website institucional** | Landing pages, produtos, planos, contato, **cadastro trial LicitaPregão integrado** | Checkout Segura, pagamento Pix/BolePix via dashboard | **80%**   |
| 📊 **Dashboard admin**       | Gestão de clientes/contratos, NF-e pendente/emitida, financeiro básico, atividades, permissões (Admin/Comercial), **Comissões**, **integração LicitaPregão (trial + sync)** | Integração Banco Inter (Pix/BolePix), webhooks, e-mails automáticos NF-e, relatórios fiscais Simples Nacional | **70%**   |
| 🧩 **SaaS LicitaPregão**     | App completo, provisionamento automático via painel, sync bidirecional admin ↔ app | Pagamento Banco Inter, onboarding pós-pagamento automático | **75%**   |

---

### 1. Integração Site ↔ Dashboard (contratação/assinatura)

> **LicitaPregão (trial 7 dias):** integração **concluída** — site → `POST /api/public/contracts/register-from-site` → provisionamento automático no SaaS. Detalhes no [README.md](./README.md#-ecossistema-xpress--3-repositórios-conectados).

**Objetivo (demais produtos):** quando o cliente contratar no site, o contrato aparecer automaticamente no dashboard.

- **Checkout no site institucional (`xpresssolutions`)**
  - [x] Cadastro trial LicitaPregão (`POST /api/licitapregao/cadastro` → dashboard)
  - [ ] Criar endpoint `POST /api/checkout/gestao-apolice` (Segura)
  - [ ] Receber dados do cliente (nome, e-mail, telefone, CPF/CNPJ, endereço básico) e plano escolhido (Básico / Confort / Premium)
  - [ ] Chamar endpoint público do dashboard e devolver dados de pagamento (Pix / boleto) para o front do site

- **Endpoint público no dashboard**
  - [x] Criar `POST /api/public/contracts/register-from-site` (LicitaPregão trial)
  - [x] Validar payload vindo do site com **Zod** (sanitização, required fields, mensagens amigáveis)
  - [x] Criar ou atualizar `clients` no Supabase
  - [x] Criar `contracts` com plano correto, status inicial e trial
  - [x] Registrar `activity_log` com origem `"site-xpresssolutions"`
  - [x] Provisionar tenant no LicitaPregão (`POST /api/provision`) e e-mail de boas-vindas
  - [x] Sincronização bidirecional admin ↔ SaaS (`sync-tenant`, `sync-from-saas`)

---

### 2. Pagamento com Banco Inter (Pix / BolePix)

**Objetivo:** gerar cobrança automática no Inter e atualizar o contrato assim que o pagamento cair.

- **Integração com Banco Inter PJ**
  - [ ] Criar variáveis de ambiente no dashboard: `INTER_CLIENT_ID`, `INTER_CLIENT_SECRET`, `INTER_CERT_PATH` (ou equivalente conforme docs oficiais)
  - [ ] Implementar cliente HTTP autenticado (certificado + OAuth2) para APIs do Inter
  - [ ] Documentar no `README` como gerar/baixar certificados e credenciais no Internet Banking

- **Geração da cobrança na criação do contrato**
  - [ ] Na rota `register-from-site`, chamar API de **Cobrança Pix/BolePix** do Inter com valor do plano
  - [ ] Persistir dados de cobrança:
    - [ ] `txid` / `nossoNumero` / `location`
    - [ ] QR Code / payload "copia e cola"
    - [ ] Data de vencimento e status da cobrança
  - [ ] Associar cobrança ao contrato (campo em `contracts` ou tabela `payments`)
  - [ ] Devolver para o site os dados necessários para exibir o QR Code / link de pagamento

- **Webhook do Inter (pagamento confirmado)**
  - [ ] Criar endpoint `POST /api/inter/webhook`
  - [ ] Validar assinatura/autorização do Inter (segurança), usando **Zod** para o payload recebido
  - [ ] Encontrar cobrança/contrato pelo `txid` ou identificador acordado
  - [ ] Atualizar:
    - [ ] `contracts.payment_status` → `em_dia` / `paid`
    - [ ] `contracts.status` → `ativa` (quando fizer sentido)
  - [ ] Registrar `activity_log` ("Pagamento confirmado via Pix Inter")
  - [ ] Opcional: criar registro em `nfe_documents` com status `pendente` para futura emissão da NF-e

- **Refletir status real de pagamento nas telas**
  - [ ] `/dashboard/financeiro` mostrando recebimentos pendentes x pagos
  - [ ] `/dashboard/produtos/[slug]` e `/dashboard/clientes` usando `payment_status` atualizado
  - [ ] Home recalculando **Receita Mensal** com base apenas em contratos pagos (`em_dia` / `paid`)

---

### 3. NF-e, Simples Nacional e apuração

**Objetivo:** emissão de NF-e alinhada com o Simples Nacional e pronta para o contador.

- **Revisar fluxo atual de emissão (`/api/nfe/issue`)**
  - [x] Integração **Sistema Nacional NFS-e (Porto Alegre/RS)** implementada  
        - Uso da API nacional (gov.br/nfse) com lib `nfse-brazil-national`; certificado A1 (PFX) em `NFSENACIONAL_CERT_PFX_BASE64` + `NFSENACIONAL_CERT_SENHA`; CNPJ/razão em `.env`. Prioridade: 1) Nacional, 2) provedor genérico (`NFE_API_*`), 3) simulado.
        - Nota autorizada e armazenada no ambiente da SEFAZ/Governo; chave de acesso e número gravados no banco.
  - [ ] Garantir que o valor usado seja o valor atual do contrato (mensalidade correta)
  - [ ] Incluir descrição clara do serviço (SaaS / assinatura, plano, periodicidade)
  - [ ] Validar CFOP e demais campos exigidos pelo modelo de NF-e / NFS-e usado

- **Regras fiscais para Simples Nacional**
  - [ ] Definir CFOP / CNAE / município de incidência de ISS para o SaaS
  - [ ] Confirmar com contador o enquadramento correto (Anexo do Simples)
  - [ ] Garantir que clientes tenham:
    - [ ] Endereço completo (rua, número, bairro, cidade, UF, CEP)
    - [ ] CPF/CNPJ válido
    - [ ] Município configurado corretamente

- **Relatório de faturamento para contador**
  - [ ] Criar tela ou export CSV/Excel com:
    - [ ] Data de emissão
    - [ ] Número da NF-e
    - [ ] Cliente (nome, documento)
    - [ ] Valor
    - [ ] Tipo de serviço / produto (para separar por anexo/atividade)
  - [ ] Filtro por período (mês/ano)
  - [ ] Documentação rápida: "como usar estes dados no PGDAS-D"

- **Ajustes na página `/dashboard/nfe`**
  - [x] Status `pendente` x `emitida` (e cancelada) claros; botões Cancelar (só emitida) e Excluir (ícone apenas); confirmação antes de cancelar/excluir
  - [ ] Antes de emitir, recalcular valor e descrição com base no contrato mais recente

---

### 4. E-mail automático para o cliente (NF-e + acesso ao produto)

**Objetivo:** após emitir a NF-e, o cliente recebe tudo por e-mail sem ação manual.

- **Provedor de e-mail transacional**
  - [x] **Resend** em uso para **Esqueci minha senha** (`lib/send-email.ts`); variáveis `RESEND_API_KEY`, `EMAIL_FROM_DEFAULT` no `.env.example`
  - [ ] Implementar helper `sendInvoiceEmail(options)` no backend (ex.: `lib/email/send-invoice.ts`) usando Resend para enviar NF-e ao cliente após emissão
  - [ ] Preparar helper genérico `sendProductEmail(options)` para futuros e-mails de produto/contrato

- **Disparo após emissão bem-sucedida da NF-e**
  - [ ] Em `/api/nfe/issue`, após resposta OK da API externa:
    - [ ] Buscar cliente e contrato associados à NF-e
    - [ ] Montar e-mail com:
      - [ ] Número / série da NF-e
      - [ ] Valor total
      - [ ] Descrição do plano/serviço contratado
      - [ ] Link para PDF/XML da NF-e (quando o provedor fornecer)
      - [ ] Informações de suporte (contato, SLA, etc.)
    - [ ] Chamar `sendInvoiceEmail`

- **Preparar liberação futura da ferramenta SaaS**
  - [ ] Reservar no e-mail espaço para:
    - [ ] Link de login / criação de senha (ex.: `https://app.xpresssolutions.com.br`)
    - [ ] Instruções de onboarding
  - [ ] Quando o SaaS estiver pronto:
    - [ ] Implementar criação automática de tenant/workspace para o cliente após pagamento confirmado
    - [ ] Incluir no e-mail os dados de acesso (link + instruções)

---

### 5. Histórico de atividades e Home sempre atualizada

**Falta (depende da integração Banco Inter — seção 2):**
- [ ] Registrar em `activity_log` a mudança de status de pagamento (pendente → pago → cancelado/expirado)
- [ ] Registrar em `activity_log` a criação de cobranças no Banco Inter
- [ ] Registrar em `activity_log` a confirmação de pagamento via webhook

Quando o Inter estiver integrado, chamar `logActivity` nesses três pontos.

---

### 6. Organização, segurança e documentação interna

**Objetivo:** manter o painel seguro e fácil de manter ao longo do tempo.

- **n8n (automações)** — *opcional no futuro*
  - Decisão atual: manter automações no código (APIs, Resend, webhooks diretos). Se os fluxos crescerem muito ou ficarem difíceis de manter, reavaliar adoção de n8n (self-hosted ou n8n.cloud) para centralizar webhooks, e-mails e integrações.

- **Padrão de autenticação e validação (stack Node)**
  - [x] **Zod** em uso no dashboard: schema de emissão NF-e (`lib/schemas/nfe.ts`); padrão definido para validar todo input de API.
  - [x] Dependência **jose** (JWT) instalada para uso em tokens (login, APIs públicas, webhooks).
  - [ ] **JWT**: centralizar criação/verificação de token em `lib/auth/jwt.ts` e usar em APIs públicas e webhooks (hoje auth é cookie no dashboard).
  - [ ] Estender **Zod** em todas as rotas que recebem body/query (`/api/public/**`, webhooks, etc.).
  - [ ] Documentar no `README` o padrão JWT + Zod para replicar no site e no SaaS.

- **Proteção de rotas do dashboard**
  - [ ] Middleware garantindo login obrigatório em `/dashboard/**`
  - [ ] Uso de `role` e `permissions` para controlar acesso a módulos (financeiro, NF-e, atividades, usuários)

- **Segurança das rotas públicas**
  - [ ] Validar inputs de `/api/public/**` e limitar o que é exposto (Zod obrigatório)
  - [ ] Proteger webhook `/api/inter/webhook` contra chamadas não autorizadas
  - [ ] Implementar **rate limiting** para endpoints sensíveis (login, criação de contratos, NF-e, cobranças)  
        - [ ] Middleware de rate limit por IP/usuário (ex.: 5–10 req/min)  
        - [x] Proteção contra uso abusivo de botões no front (desabilitar enquanto a request anterior não termina) — já aplicado em NF-e e Senhas

- **Documentação interna**
  - [x] Referenciar este `ROADMAP.md` no `README.md`
  - [ ] Manter anotações rápidas de decisões (provedor de NF-e, provedor de e-mail, detalhes da integração com Inter, etc.)

---

### 📋 Resumo — O que falta (prioridade)

1. **Site ↔ Dashboard:** checkout no site, endpoint `POST /api/public/contracts/register-from-site`, validação Zod.
2. **Banco Inter:** credenciais, geração de cobrança Pix/BolePix, webhook de pagamento, atualização de status nos contratos.
3. **NF-e:** valor/descrição sempre alinhados ao contrato; relatório para contador. (Cancelar/excluir e UX na página já feitos.)
4. **E-mail:** `sendInvoiceEmail` após emitir NF-e ao cliente; `sendProductEmail` para produto/contrato. (Resend já em uso para Esqueci minha senha.)
5. **Atividades:** pendente apenas logs ligados a pagamento (mudança de status, webhook Inter, cobranças). Clientes, contratos, NF-e e usuários já registram e atualizam Home/Atividades.
6. **Segurança:** middleware de login em `/dashboard/**`; rate limiting em APIs sensíveis; centralizar JWT; documentar no README.
7. **n8n:** por enquanto não; reavaliar se automações ficarem muitas ou complexas.
