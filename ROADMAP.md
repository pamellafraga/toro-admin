## 🚀 Roadmap Xpress — Ecossistema SaaS

Lista viva do que ainda falta implementar para ligar **Site**, **Dashboard Administrativo** e **Ferramenta SaaS**, incluindo **pagamentos**, **NF-e** e **automações**.

Marque os itens conforme forem concluídos — a ideia é ser seu **painel de controle técnico** do produto.

> **Banco de dados (estado atual)**  
> Por enquanto **apenas o Dashboard administrativo** está ligado ao banco (Supabase). O **site institucional** e o **SaaS (app do cliente)** ainda não estão conectados ao Supabase; a integração deles virá via APIs do dashboard e, no caso do SaaS, futura conexão ao mesmo Supabase (multi-tenant).

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
  - [ ] Validar payload vindo do site (sanitização, required fields)
  - [ ] Criar ou atualizar `clients` no Supabase
  - [ ] Criar `contracts` com:
    - [ ] Plano correto (mapa site → planos internos)
    - [ ] `status` inicial (ex.: `aguardando_produto`)
    - [ ] `payment_status = "pendente"` (ou equivalente já usado no sistema)
  - [ ] Registrar `activity_log` com origem `"site-xpresssolutions"` (ex.: "Novo contrato criado via site")

---

### 2. Pagamento com Banco Inter (Pix / BolePix)

**Objetivo:** gerar cobrança automática no Inter e atualizar o contrato assim que o pagamento cair.**

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
  - [ ] Validar assinatura/autorização do Inter (segurança)
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

**Objetivo:** emissão de NF-e alinhada com o Simples Nacional e pronta para o contador.**

- **Revisar fluxo atual de emissão (`/api/nfe/issue`)**
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

**Objetivo:** após emitir a NF-e, o cliente recebe tudo por e-mail sem ação manual.**

- **Provedor de e-mail transacional**
  - [ ] Escolher provedor (Resend, SendGrid, AWS SES, Mailgun, etc.)
  - [ ] Configurar variáveis de ambiente (`EMAIL_API_KEY`, remetente padrão, etc.)
  - [ ] Implementar helper `sendInvoiceEmail(options)` no backend do dashboard

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

**Objetivo:** rastrear tudo que acontece e refletir isso na Home e na página de Atividades.**

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

**Objetivo:** manter o painel seguro e fácil de manter ao longo do tempo.**

- **Proteção de rotas do dashboard**
  - [ ] Middleware garantindo login obrigatório em `/dashboard/**`
  - [ ] Uso de `role` e `permissions` para controlar acesso a módulos (financeiro, NF-e, atividades, usuários)

- **Segurança das rotas públicas**
  - [ ] Validar inputs de `/api/public/**` e limitar o que é exposto
  - [ ] Proteger webhook `/api/inter/webhook` contra chamadas não autorizadas

- **Documentação interna**
  - [ ] Referenciar este `ROADMAP.md` no `README.md`
  - [ ] Manter anotações rápidas de decisões (provedor de NF-e, provedor de e-mail, detalhes da integração com Inter, etc.)

