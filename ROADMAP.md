## 🚀 Roadmap Xpress — Ecossistema SaaS

Lista viva do que já foi feito e do que falta implementar para ligar **Site**, **Dashboard Administrativo** e **Ferramenta SaaS**, incluindo **pagamentos**, **NF-e** e **automações**.

> **Banco de dados (estado atual)**  
> Por enquanto **apenas o Dashboard administrativo** está ligado ao banco (Supabase). O **site institucional** e o **SaaS (app do cliente)** ainda não estão conectados ao Supabase; a integração deles virá via APIs do dashboard e, no caso do SaaS, futura conexão ao mesmo Supabase (multi-tenant).

> **Automações**  
> Por enquanto as automações ficam no próprio código (rotas do dashboard, Resend, webhooks). Se no futuro os fluxos ficarem muitos ou complexos (muitos webhooks, muitos e-mails, integrações que mudam com frequência), **reavaliar** a adoção de **n8n** para centralizar e facilitar sem deploys.

---

### ✅ Já feito (dashboard)

| Área | O que foi feito |
|------|------------------|
| **Autenticação** | Login por cookie (`xpress_auth`); APIs sensíveis (credenciais, NF-e) checam esse cookie. |
| **Senhas (admin)** | Tabela `admin_credentials`, script `017_admin_credentials.sql`; API `GET/POST/DELETE /api/admin/credentials` com **service role** (bypass RLS); página `/dashboard/senhas` consome essa API (não usa Supabase direto no cliente). |
| **NF-e / NFS-e** | `POST /api/nfe/issue` com validação **Zod** (`lib/schemas/nfe.ts`), auth por cookie e **admin client**; `GET /api/nfe/documents` para listagem; página `/dashboard/nfe` usa essas APIs. Integração **Sistema Nacional NFS-e (Porto Alegre)** com lib `nfse-brazil-national` (certificado A1, variáveis `NFSENACIONAL_*`). Fallback: provedor genérico (`NFE_API_*`) ou modo simulado. |
| **Validação** | **Zod** em uso: schema de emissão NF-e; padrão definido para usar Zod em todas as entradas de API. |
| **JWT** | Pacote **jose** instalado para uso futuro (tokens Base64URL, HMAC/RS256). |
| **UX** | Botões de emissão NF-e e salvamento de senhas desabilitados durante a request (evita duplo envio). SWR na página de Senhas com `revalidateOnFocus: false` e `errorRetryCount: 0`. |
| **Docs** | `.env.example` com variáveis Supabase (service role), NFS-e Nacional e provedor genérico NF-e. |

---

### 🔍 Visão geral dos 3 repositórios

| Projeto                      | O que já existe                                                                                 | O que ainda falta principal                                                                                   | Progresso |
|------------------------------|-------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|----------:|
| 🌐 **Website institucional** | Landing pages, produtos, planos, contato, layout pronto e publicado em produção               | Fluxo de checkout/assinatura, chamada para API pública do dashboard, exibição de QR Pix/links de pagamento   | **70%**   |
| 📊 **Dashboard admin**       | Gestão de clientes/contratos, NF-e pendente/emitida, financeiro básico, atividades, permissões | Integração Banco Inter (Pix/BolePix), webhooks, e-mails automáticos, relatórios fiscais Simples Nacional     | **60%**   |
| 🧩 **SaaS (app do cliente)** | Base técnica do app e estrutura inicial                                                         | Módulos da ferramenta (gestão de apólices), onboarding, criação automática de tenant/usuário após pagamento  | **20%**   |

---

### 1. Integração Site ↔ Dashboard (contratação/assinatura)

**Objetivo:** quando o cliente contratar no site, o contrato aparecer automaticamente no dashboard.

- **Checkout no site institucional (`xpresssolutions`)**
  - [ ] Criar endpoint `POST /api/checkout/gestao-apolice`
  - [ ] Receber dados do cliente (nome, e-mail, telefone, CPF/CNPJ, endereço básico) e plano escolhido (Básico / Confort / Premium)
  - [ ] Chamar endpoint público do dashboard e devolver dados de pagamento (Pix / boleto) para o front do site

- **Endpoint público no dashboard**
  - [ ] Criar `POST /api/public/contracts/register-from-site`
  - [ ] Validar payload vindo do site com **Zod** (sanitização, required fields, mensagens amigáveis)
  - [ ] Criar ou atualizar `clients` no Supabase
  - [ ] Criar `contracts` com:
    - [ ] Plano correto (mapa site → planos internos)
    - [ ] `status` inicial (ex.: `aguardando_produto`)
    - [ ] `payment_status = "pendente"` (ou equivalente já usado no sistema)
  - [ ] Registrar `activity_log` com origem `"site-xpresssolutions"` (ex.: "Novo contrato criado via site")

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
  - [ ] Deixar claro status `pendente` x `emitida`
  - [ ] Antes de emitir, recalcular valor e descrição com base no contrato mais recente

---

### 4. E-mail automático para o cliente (NF-e + acesso ao produto)

**Objetivo:** após emitir a NF-e, o cliente recebe tudo por e-mail sem ação manual.

- **Provedor de e-mail transacional**
  - [ ] Escolher provedor (preferência: **Resend**; alternativas: SendGrid, AWS SES, Mailgun, etc.)
  - [ ] Configurar variáveis de ambiente para o provedor escolhido  
        - Resend: `RESEND_API_KEY`, `EMAIL_FROM_DEFAULT`  
        - Atualizar `.env.example` e documentação rápida no `README`
  - [ ] Implementar helper `sendInvoiceEmail(options)` no backend do dashboard (ex.: `lib/email/send-invoice.ts`) usando Resend
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

**Objetivo:** rastrear tudo que acontece e refletir isso na Home e na página de Atividades.

- **Gravação de `activity_log`**
  - [ ] Criação/edição/exclusão de clientes
  - [ ] Criação/edição/cancelamento de contratos
  - [ ] Mudança de status de pagamento (pendente → pago → cancelado/expirado)
  - [ ] Criação de cobranças no Banco Inter
  - [ ] Confirmação de pagamento via webhook
  - [ ] Emissão de NF-e

- **Uso nas telas**
  - [ ] Página `/dashboard/atividades` mostrando corretamente o histórico
  - [ ] Componente `RecentActivity` na Home trazendo últimos eventos relevantes
  - [ ] Cards da Home (clientes, contratos, produtos, receita) usando dados em tempo real do Supabase

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
  - [ ] Referenciar este `ROADMAP.md` no `README.md`
  - [ ] Manter anotações rápidas de decisões (provedor de NF-e, provedor de e-mail, detalhes da integração com Inter, etc.)

---

### 📋 Resumo — O que falta (prioridade)

1. **Site ↔ Dashboard:** checkout no site, endpoint `POST /api/public/contracts/register-from-site`, validação Zod.
2. **Banco Inter:** credenciais, geração de cobrança Pix/BolePix, webhook de pagamento, atualização de status nos contratos.
3. **NF-e:** valor/descrição sempre alinhados ao contrato; relatório para contador; ajustes de UX na página (pendente x emitida).
4. **E-mail:** Resend (ou outro), `sendInvoiceEmail` após emitir NF-e, `sendProductEmail` para produto/contrato.
5. **Atividades:** gravar `activity_log` em todas as ações relevantes; exibir em `/dashboard/atividades` e na Home.
6. **Segurança:** middleware de login em `/dashboard/**`; rate limiting em APIs sensíveis; centralizar JWT; documentar no README.
7. **n8n:** por enquanto não; reavaliar se automações ficarem muitas ou complexas.
