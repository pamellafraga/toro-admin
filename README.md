# 🚀 Xpress Solutions — Dashboard Administrativa

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3+-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Latest-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

</div>

Dashboard administrativa completa para gerenciamento de locações SaaS, construída com **Next.js 15**, **React 19**, **TypeScript**, **TailwindCSS**, **Supabase** e interface nas cores da Xpress Solutions (azul #005176, fundo claro #e5e9f0).

## ✨ Características Principais

- 🎨 **Design** — Interface com paleta azul escuro (#005176), cards em destaque, sidebar e componentes com estados de hover e foco consistentes
- 🔐 **Autenticação** — Login local (tabela `dashboard_users`) com middleware de proteção de rotas e **Esqueci minha senha** (código por e-mail via Resend)
- 👥 **Permissões** — Perfis Admin e Comercial; apenas Admin acessa Configurações (Usuários, Sistemas/Senhas), Gastos da Empresa e Comissões
- 📊 **Dashboard** — KPIs em tempo real (clientes, contratos, produtos, receita), gráficos (receita mensal, distribuição por produto), feed de atividades
- 💬 **Chat Interno** — Canais em tempo real com indicador de não lidas
- 🔔 **Notificações** — Central de alertas com contador na sidebar
- 📱 **Responsivo** — Layout adaptável para desktop, tablet e mobile

---

## 📋 Módulos do Sistema

| Módulo | Descrição | Ícone |
|---|---|:---:|
| **Home** | Dashboard com KPIs (clientes, contratos, produtos, receita), gráficos de receita e produtos, cards de usuários ativos | 🏠 |
| **Produtos** | Gerenciamento de produtos SaaS com contratações ativas/inativas | 📦 |
| **Clientes** | Lista completa com busca, filtros, edição e gestão de status | 👥 |
| **Marketing** | Kanban de captação de leads (Novo → Contatando → Negociando → Convertido → Perdido) | 🎯 |
| **Financeiro** | Visão financeira com receitas, pendências, gráficos e exportação | 💰 |
| **Chat Interno** | Comunicação em tempo real entre membros da equipe | 💬 |
| **Relatórios** | Exportação de dados e análises em CSV/Excel | 📊 |
| **Notificações** | Central de alertas, avisos e lembretes do sistema | 🔔 |
| **Atividades** | Log completo de ações realizadas no sistema | 📝 |
| **NF-e** | Emissão, cancelamento e exclusão de notas fiscais (permissão Financeiro) | 📄 |
| **Gastos da Empresa** | Controle de despesas operacionais (Admin only) | 💳 |
| **Comissões** | Cálculo de vendas por comercial no mês, % de bônus e prêmio total (Admin only) | % |
| **Configurações** | **Usuários** — usuários do dashboard, perfil (Admin/Comercial), e-mail para redefinição de senha (Admin only). **Sistemas** — login, senha e link das ferramentas (banco, hospedagem, domínios, etc.) | ⚙️ |

---

## 👥 Perfis de Acesso

O login usa a tabela `dashboard_users` com dois perfis:

| Perfil | Permissões |
|---|---|
| **Admin** 👑 | Acesso total: Home, Produtos, Clientes, Marketing (Seguradoras), Financeiro, NF-e, Chat, Relatórios, Notificações, Atividades, Gastos da Empresa, **Comissões**, Configurações (Usuários e Sistemas/Senhas) |
| **Comercial** 💼 | Home, Produtos, Clientes, Chat. Contratos criados por ele ficam com `origem_comercial` = "Comercial - [Nome]" (usado em Comissões e filtro por comercial). |

> ⚠️ **Importante:** Somente **Admin** acessa Gastos da Empresa, Comissões e Configurações (Usuários e Sistemas). O sistema verifica permissões em tempo real via contexto de autenticação.

---

## 🎨 Design e Interface

### Tela de Login Futurística

A tela de login possui um design único e moderno com:

- **Canvas de Partículas Animadas** — 80 partículas flutuantes conectadas por linhas dinâmicas
- **Efeitos de Glow** — Halos luminosos em azul sky (#0ea5e9) ao redor do card
- **Gradientes Complexos** — Múltiplas camadas de gradientes radiais e lineares
- **Orbs Flutuantes** — 5 orbs posicionados aleatoriamente pulsando em diferentes velocidades
- **Scan Lines** — Linhas horizontais sutis no topo e rodapé
- **Corner Accents** — Acentos em formato "L" nos 4 cantos do card
- **Animação de Entrada** — Fade in + translate up suave ao carregar
- **Botão com Shine Effect** — Efeito de brilho deslizante ao hover
- **Toggle "Lembrar-me"** — Switch animado com persistência em localStorage
- **Campo de senha com show/hide** — Ícones Eye/EyeOff para alternar visibilidade

### Tema do Dashboard

- Paleta: **primary** e sidebar `#005176` (azul Xpress), fundo `#e5e9f0`, cards e inputs com bordas e sombras suaves
- Sidebar fixa com ícones, labels e estado ativo destacado; botão para recolher/expandir
- Favicon: `public/icon.png` exibido na aba do navegador (Xpress Solutions - Dashboard)
- Componentes com estados hover e foco consistentes; toasts (Sonner) com estilo alinhado ao tema

---

## ⚙️ Configuração e Instalação

### 1. Pré-requisitos

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Conta no [Supabase](https://supabase.com) (gratuita)

### 2. Configurar o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **Settings → API** e copie:
   - `Project URL`
   - `anon public key`
3. Crie o arquivo `.env.local` na raiz do projeto (use `.env.example` como referência):

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY

# Opcional: Esqueci minha senha (Resend)
RESEND_API_KEY=re_xxxx
EMAIL_FROM_DEFAULT=noreply@seudominio.com

# Opcional: NF-e (provedor genérico ou Sistema Nacional NFS-e)
# NFE_API_URL=...
# NFE_API_KEY=...
# NFSENACIONAL_* (ver .env.example)
```

#### Multi-tenancy (ferramenta Apolicer)

Para a ferramenta **Apolicer** descobrir em qual banco Supabase conectar cada assinante, use a API central:

- **Endpoint:** `GET /api/tenant-config/:slug` (ex.: `GET /api/tenant-config/empresa-ativa`).
- **Autenticação:** header `Authorization: Bearer <token>`. O token deve ser o mesmo configurado em **`CENTRAL_API_TOKEN`** (`.env.local`). A ferramenta Apolicer usa o mesmo valor em `VITE_CENTRAL_API_TOKEN`.

**Testar no navegador ou no Postman:**
- **URL:** `http://localhost:3000/api/tenant-config/empresa-ativa` (troque `empresa-ativa` por um slug que exista na tabela `tenants` com `ferramenta = 'apolicer'` e `ativo = true`, e com registro em `tenant_databases`).
- **Header:** `Authorization: Bearer SECRETA-API-APOLICER` (ou o valor de `CENTRAL_API_TOKEN` no `.env.local`).
- Resposta 200: `{ "tenantId", "slug", "supabaseUrl", "supabaseAnonKey" }` (camelCase).
- **Resposta (200):** `{ "tenantId", "slug", "supabaseUrl", "supabaseAnonKey" }`
- **404:** tenant não encontrado, inativo ou sem banco configurado.
- **401:** token ausente ou inválido.

Opcionalmente, você pode definir **`CENTRAL_TRUSTED_IPS`** (IPs separados por vírgula). Requisições vindas desses IPs são aceitas mesmo sem o header `Authorization`.

Tabelas necessárias no banco **desta** dashboard: `tenants` (id, nome, slug, ferramenta, ativo) e `tenant_databases` (tenant_id, supabase_url, supabase_anon). Consulte a documentação do projeto ou scripts SQL para criação.

**Onde inserir a lógica para criar tenant ao ativar um assinante Apolicer:**  
Não existe hoje um fluxo específico de "ativar assinatura Apolicer" neste dashboard. O fluxo de **Registrar assinatura** (`/api/contracts/register` e a tela em Produtos → [produto] → "Registrar nova assinatura") é genérico para contratos do produto principal (ex.: Software de Gestão). Para multi-tenancy Apolicer, ao ativar um assinante é necessário: (1) **Inserir em `tenants`**: `nome`, `slug` (único, ex.: `empresa-silva`), `ferramenta = 'apolicer'`, `ativo = true`. (2) **Inserir em `tenant_databases`**: `tenant_id` (o UUID retornado), `supabase_url` e `supabase_anon` do projeto Supabase desse cliente. O projeto Supabase do tenant pode ser criado manualmente no painel do Supabase ou via API de gestão; esta dashboard apenas armazena a URL e a chave anon em `tenant_databases`. Pode-se criar uma nova API (ex.: `POST /api/tenants`), uma tela em Configurações ou um passo extra no fluxo de vendas para preencher essas tabelas quando um cliente passar a usar a ferramenta Apolicer.

### 3. Criar as tabelas no banco

Execute os scripts SQL em ordem no **SQL Editor** do Supabase (consulte a pasta `scripts/` para a lista completa):

```
scripts/001_profiles.sql      → Perfis de usuários
scripts/002_products.sql      → Produtos para locação
scripts/003_clients.sql       → Clientes
scripts/004_contracts.sql     → Contratos de locação
scripts/005_seguradoras.sql   → Leads/Seguradoras para captação
scripts/006_activity_log.sql  → Log de atividades
scripts/007_notifications.sql → Notificações
scripts/008_chat_messages.sql → Chat interno
scripts/009_seed.sql          → Dados de exemplo (opcional)
scripts/010_nfe_documents.sql → Documentos NF-e
scripts/017_admin_credentials.sql → Credenciais (Senhas)
scripts/018_dashboard_users.sql   → Usuários do dashboard
scripts/024_forgot_password.sql    → Esqueci minha senha (coluna email + tabela códigos)
scripts/025_forgot_password_username.sql → Busca por username
scripts/026_user_reset_emails.sql  → E-mails designados para redefinição (opcional)
scripts/019_contracts_origem_comercial.sql → Coluna origem_comercial (Comissões + filtro por comercial)
scripts/027_comissoes_docs.sql     → Apenas documentação da coluna (Comissões)
scripts/028_commission_bonus_optional.sql   → Tabela opcional para guardar % de bônus (Comissões)
scripts/029_nfe_documents_pdf_storage.sql  → Coluna pdf_storage_path (Visualizar PDF da NF-e)
```

Para o botão **Visualizar** da NF-e abrir o PDF na plataforma, crie no Supabase o bucket de Storage **nfe-pdfs** (Armazenar → + Balde novo, nome: `nfe-pdfs`, privado). O app faz upload do PDF na emissão quando o provedor retornar `pdfUrl` ou `pdfBase64`; caso contrário, o link fica disponível quando houver um PDF armazenado (ex.: upload manual ou integração que envie o arquivo).

Outros scripts (011–016, 020–023) aplicam alterações em contratos, produtos, clientes, atividade e chat; execute conforme a necessidade do projeto.

### 4. Criar o usuário Admin

Após criar as tabelas, execute no terminal:

```bash
node scripts/setup-admin.js
```

Isso cria o usuário padrão:
- **Login:** `admin`
- **Senha:** `admin123`

> **Importante:** Troque a senha após o primeiro acesso!

### 5. Instalar dependências e iniciar

```bash
pnpm install
pnpm dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## 🎯 Funcionalidades Implementadas

### ✅ Autenticação e Segurança
- [x] Login com Supabase Auth
- [x] Esqueci minha senha — fluxo completo (código por e-mail via Resend, redefinição por username)
- [x] E-mail de redefinição configurável por usuário no painel Usuários (só admin altera)
- [x] Middleware de proteção de rotas
- [x] Sistema de permissões granular por perfil (Admin, Comercial)
- [x] Logout com limpeza de sessão
- [x] Persistência de login com "Lembrar-me"
- [x] Context API para gerenciar estado de autenticação

### ✅ Dashboard
- [x] KPIs em tempo real (clientes, contratos, produtos, receita)
- [x] Gráfico de receita mensal com Recharts
- [x] Gráfico pizza de distribuição de produtos
- [x] Cards de usuários ativos (para Admin)
- [x] Feed de atividades recentes
- [x] Responsivo e adaptável

### ✅ Gestão de Dados
- [x] CRUD completo de produtos
- [x] CRUD completo de clientes
- [x] Sistema de contratos vinculados (criar, editar, excluir por produto)
- [x] Log de atividades: criação/edição/exclusão de clientes, contratos, NF-e e usuários; feed na Home e página Atividades atualizados após cada ação
- [x] Notificações em tempo real

### ✅ NF-e
- [x] Emissão de NF-e/NFS-e (Sistema Nacional, provedor genérico ou simulado)
- [x] Listagem de documentos (pendentes, emitidas, canceladas)
- [x] Cancelar NF-e emitida (status → cancelada)
- [x] Excluir NF-e (remover registro do painel); confirmação antes de cancelar ou excluir

### ✅ Comissões (Admin)
- [x] Página Comissões com filtro por mês/ano
- [x] Tabela por comercial: nº de vendas, valor vendido, % bônus (global), prêmio total
- [x] Dados baseados em `contracts.origem_comercial` e `created_at`; scripts 019, 027 e 028 (ver `scripts/README.md`)

### ✅ Interface e UX
- [x] Design futurístico com tema dark
- [x] Animações suaves e transições
- [x] Sidebar responsiva com navegação inteligente
- [x] Componentes shadcn/ui customizados
- [x] Toast notifications com Sonner
- [x] Loading states e skeleton loaders
- [x] Confirmação "Tem certeza que deseja excluir?" em todas as exclusões (clientes, usuários, contratos, NF-e, notificações, senhas)

### ✅ Sistema de Chat
- [x] Chat interno em tempo real
- [x] Suporte a mensagens de texto
- [x] Indicadores de status online/offline
- [x] Histórico de mensagens

---

## 📖 Primeiros Passos

Após a instalação e configuração, siga este guia:

### 1️⃣ Primeiro Acesso

1. Acesse `http://localhost:3000`
2. Faça login com as credenciais padrão:
   - **Login:** `admin`
   - **Senha:** `admin123`
3. ⚠️ **IMPORTANTE:** Vá em **Usuários** e altere a senha imediatamente!

### 2️⃣ Criar Usuários

1. No menu lateral, clique em **Configurações → Usuários** (somente Admin)
2. Clique no botão **+ Adicionar Usuário**
3. Preencha: Nome de exibição, E-mail, Login (único), Senha temporária, Perfil (Admin ou Comercial)
4. O usuário fará login com o **Login** e a senha definida; o e-mail é usado para "Esqueci minha senha"

### 3️⃣ Cadastrar Produtos

1. Vá em **Produtos**
2. Adicione os produtos SaaS que sua empresa oferece:
   - Nome do produto
   - Descrição
   - Valor mensal
   - Status (ativo/inativo)

### 4️⃣ Adicionar Clientes

1. Acesse **Clientes**
2. Cadastre os clientes com:
   - Nome/Razão Social
   - CPF/CNPJ
   - Telefone e email
   - Endereço completo
   - Status (ativo/inativo)

### 5️⃣ Criar Contratos

1. Em **Clientes**, selecione um cliente
2. Clique em **Novo Contrato**
3. Escolha o produto e defina:
   - Data de início
   - Valor mensal
   - Forma de pagamento
   - Observações

### 6️⃣ Gestão de Leads (Marketing)

1. Acesse **Marketing** (antigo módulo Seguradoras)
2. Use o Kanban para gerenciar leads:
   - Arraste cards entre as colunas
   - Adicione novos leads
   - Atribua responsáveis
   - Acompanhe o funil de vendas

### 7️⃣ Acompanhamento Financeiro

1. Entre em **Financeiro**
2. Visualize:
   - Receita mensal total
   - Pendências e atrasos
   - Gráficos de evolução
   - Exportação de relatórios

---

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
pnpm dev                  # Inicia servidor de desenvolvimento

# Build e Produção
pnpm build                # Gera build otimizado
pnpm start                # Inicia servidor de produção

# Linting e Formatação
pnpm lint                 # Executa ESLint
pnpm format               # Formata código com Prettier (se configurado)

# Adicionar componentes shadcn/ui
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add table

# Limpar cache e reinstalar
rm -rf .next node_modules
pnpm install
pnpm dev
```

---

## ❓ Troubleshooting

### Erro ao conectar com Supabase

**Problema:** `Error: supabase client is misconfigured`

**Solução:**
1. Verifique se o arquivo `.env.local` existe na raiz
2. Confirme que as variáveis estão corretas:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
   ```
3. Reinicie o servidor de desenvolvimento: `pnpm dev`

### Tabelas não aparecem no Supabase

**Problema:** Após executar os scripts SQL, as tabelas não aparecem

**Solução:**
1. Verifique se você está no schema correto (geralmente `public`)
2. Execute os scripts na ordem correta (001 até 009)
3. Verifique os erros no console do SQL Editor
4. Se necessário, delete as tabelas e reexecute os scripts

### Erro de autenticação no login

**Problema:** "Credenciais inválidas" mesmo com `admin/admin123`

**Solução:**
1. Execute o script de setup do admin (se ainda não rodou):
   ```bash
   node scripts/setup-admin.js
   ```
2. Confirme que a tabela `dashboard_users` existe e foi populada (script `018_dashboard_users.sql` ou seed do projeto)
3. Verifique no Supabase (Table Editor) se há um usuário com o login que você está usando

### Layout quebrado ou estilos não carregam

**Problema:** A página aparece sem estilos ou com layout quebrado

**Solução:**
1. Limpe o cache do Next.js:
   ```bash
   rm -rf .next
   pnpm dev
   ```
2. Verifique se o Tailwind está configurado corretamente
3. Reinstale as dependências:
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

### Erro "Module not found"

**Problema:** Erro ao importar componentes do shadcn/ui

**Solução:**
1. Certifique-se de que o componente existe em `components/ui/`
2. Verifique o arquivo `components.json` para paths corretos
3. Reinstale o componente:
   ```bash
   npx shadcn@latest add [nome-do-componente]
   ```

### Performance lenta no desenvolvimento

**Problema:** O servidor de desenvolvimento está muito lento

**Solução:**
1. Use `pnpm` ao invés de `npm` (é mais rápido)
2. Limite a quantidade de arquivos sendo observados
3. Desabilite extensões desnecessárias do VS Code
4. Aumente a memória do Node:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" pnpm dev
   ```

---

## Deploy em Produção

O projeto pode ser implantado na **Vercel** com domínio próprio (ex.: `adm.xpresssolutions.com.br`). Para passo a passo completo (campos a preencher, subdomínio na Locaweb, variáveis de ambiente e como deixar o painel fora de buscas), consulte **[DEPLOY.md](./DEPLOY.md)**.

- Build: `pnpm build` (lockfile pnpm; login com `useSearchParams` envolvido em `Suspense`)
- O dashboard está configurado com `noindex/nofollow` e `robots.txt` para não ser indexado por buscadores

---

## Preview

### Tela de Login
- Design futurístico com partículas animadas em canvas
- Efeitos de glow e gradientes azul sky
- Animações suaves de entrada
- Toggle "Lembrar-me" com persistência

### Dashboard Home
- KPIs em cards: Clientes, Contratos, Produtos, Receita
- Gráfico de receita mensal (linha)
- Gráfico de distribuição de produtos (pizza)
- Cards de usuários ativos (Admin)
- Feed de atividades recentes

### Sidebar
- Menu por perfil (Admin / Comercial): Home, Produtos, Clientes, Financeiro, NF-e, Chat, Relatórios, Notificações, Atividades, Gastos da Empresa, Comissões, Configurações (Usuários, Sistemas)
- Botão recolher/expandir; área do usuário logado

---

## Tecnologias Utilizadas

| Tecnologia | Versão | Uso |
|---|:---:|---|
| **Next.js** | 15 | Framework React com App Router e Server Components |
| **React** | 19 | Biblioteca para interfaces de usuário |
| **TypeScript** | 5+ | Tipagem estática e segurança de código |
| **TailwindCSS** | 3+ | Framework CSS utilitário |
| **shadcn/ui** | Latest | Componentes UI acessíveis e customizáveis |
| **Supabase** | Latest | Backend-as-a-Service (PostgreSQL + Auth + Realtime) |
| **Recharts** | Latest | Biblioteca de gráficos interativos |
| **SWR** | Latest | Hook React para fetching e cache de dados |
| **Lucide React** | Latest | Biblioteca de ícones moderna |
| **date-fns** | Latest | Manipulação e formatação de datas |
| **Sonner** | Latest | Sistema de notificações toast estilosas |
| **React Hook Form** | Latest | Gerenciamento de formulários |
| **Zod** | Latest | Validação de schemas TypeScript-first |

---

## 📁 Estrutura do Projeto

```
xpress-dashboard/
├── app/
│   ├── page.tsx                  → Redirect para /dashboard ou /login
│   ├── layout.tsx                → Layout raiz com providers
│   ├── globals.css               → Estilos globais
│   ├── login/
│   │   ├── page.tsx              → Tela de login com link "Esqueci minha senha"
│   │   └── forgot-password/
│   │       └── page.tsx          → Esqueci minha senha (código por e-mail)
│   ├── setup/
│   │   └── page.tsx              → Setup inicial do sistema
│   ├── api/
│   │   ├── login/route.ts        → Endpoint de autenticação
│   │   ├── logout/route.ts       → Endpoint de logout
│   │   ├── setup-admin/route.ts  → Criação do admin inicial
│   │   ├── auth/
│   │   │   ├── forgot-password/route.ts → Solicitação de código de redefinição
│   │   │   └── reset-password/route.ts  → Redefinição de senha com código
│   │   ├── users/route.ts       → CRUD usuários do dashboard (GET/POST)
│   │   ├── users/[id]/route.ts  → Atualizar/remover usuário (PATCH/DELETE)
│   │   ├── activity/log/route.ts → Registro de atividades
│   │   ├── clients/search/route.ts   → Busca de clientes (autocomplete)
│   │   ├── contracts/register/route.ts → Cadastro de contrato (cliente + produto; origem_comercial)
│   │   ├── products/[slug]/route.ts   → Dados do produto
│   │   ├── products/[slug]/contracts/route.ts → Contratos do produto (filtro por comercial)
│   │   ├── nfe/documents/route.ts     → Listagem de NF-e
│   │   ├── nfe/documents/[id]/route.ts → Cancelar (PATCH) ou excluir (DELETE) NF-e
│   │   └── nfe/issue/route.ts    → Emissão de NF-e
│   └── dashboard/
│       ├── layout.tsx            → Layout do dashboard com sidebar
│       ├── page.tsx              → Home (KPIs, gráficos, usuários)
│       ├── produtos/page.tsx     → Listagem e gestão de produtos
│       ├── clientes/page.tsx     → Gerenciamento de clientes
│       ├── seguradoras/page.tsx  → Kanban de captação (Marketing)
│       ├── financeiro/page.tsx   → Visão financeira e receitas
│       ├── chat/page.tsx         → Chat interno da equipe
│       ├── relatorios/page.tsx   → Relatórios e exportação
│       ├── notificacoes/page.tsx → Central de notificações
│       ├── atividades/page.tsx   → Log de atividades
│       ├── gastos-empresa/page.tsx → Controle de despesas (Admin)
│       ├── comissoes/page.tsx    → Vendas por comercial no mês, % bônus e prêmio (Admin)
│       ├── nfe/page.tsx          → Emissão, cancelar e excluir NF-e
│       ├── senhas/page.tsx       → Sistemas: login, senha e link das ferramentas (Admin)
│       └── usuarios/page.tsx     → Gestão de usuários do dashboard (Admin)
├── components/
│   ├── theme-provider.tsx        → Provider de tema dark/light
│   ├── dashboard/
│   │   ├── app-sidebar.tsx       → Sidebar de navegação principal
│   │   ├── dashboard-shell.tsx   → Container do dashboard
│   │   ├── top-bar.tsx           → Barra superior com perfil
│   │   ├── user-cards.tsx        → Cards de usuários (Home)
│   │   ├── stat-card.tsx         → Cards de estatísticas (KPIs)
│   │   ├── revenue-chart.tsx     → Gráfico de receita mensal
│   │   ├── products-pie-chart.tsx → Gráfico de distribuição de produtos
│   │   └── recent-activity.tsx   → Lista de atividades recentes
│   └── ui/                       → Componentes shadcn/ui (50+ componentes)
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── table.tsx
│       └── ... (accordion, alert, badge, calendar, chart, etc.)
├── lib/
│   ├── auth-context.tsx          → Contexto de autenticação e permissões
│   ├── utils.ts                  → Funções utilitárias (cn, classNames)
│   ├── types.ts                  → Tipos TypeScript globais
│   ├── activity-log.ts           → Helper para registrar atividades
│   ├── send-email.ts             → Envio de e-mail (Resend) para redefinição de senha
│   ├── password-reset-email-map.ts → Mapeamento fallback de e-mails por username
│   └── supabase/
│       ├── client.ts             → Cliente Supabase para client components
│       ├── server.ts             → Cliente Supabase para server components
│       ├── middleware.ts         → Cliente para middleware
│       └── admin.ts              → Cliente com service role (APIs sensíveis)
├── hooks/
│   ├── use-mobile.ts             → Hook para detectar mobile
│   ├── use-toast.ts              → Hook para notificações toast
│   └── use-chat-unread.ts       → Contador de mensagens não lidas no chat
├── scripts/
│   ├── README.md                 → Ordem dos scripts e uso (Comissões, tabelas)
│   ├── 001_profiles.sql … 028_commission_bonus_optional.sql → Ver README e lista na seção "Criar tabelas"
│   └── setup-admin.js            → Script para criar admin inicial
├── public/
│   ├── icon.png                  → Favicon da aba (Xpress Solutions - Dashboard)
│   └── images/
│       └── logo.png              → Logo da Xpress Solutions
├── DEPLOY.md                     → Guia de deploy (Vercel, Locaweb, noindex)
├── middleware.ts                 → Middleware de proteção de rotas
├── components.json               → Configuração shadcn/ui
├── tailwind.config.ts            → Configuração Tailwind
├── tsconfig.json                 → Configuração TypeScript
└── package.json                  → Dependências do projeto
```

---

O que ainda falta implementar (Site ↔ Dashboard, Banco Inter, e-mail automático, etc.) está descrito no **[ROADMAP.md](./ROADMAP.md)**.

---

## 📝 Licença

Este é um projeto proprietário da **Xpress Solutions**.

---

## 👨‍💻 Desenvolvido Por

**Xpress Solutions** — Soluções em Tecnologia e Gestão

---

*Xpress Solutions © 2026 — Todos os direitos reservados*
