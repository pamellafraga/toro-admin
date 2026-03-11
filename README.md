# 🚀 Xpress Solutions — Dashboard Administrativa

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3+-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Latest-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

</div>

Dashboard administrativa completa para gerenciamento de locações SaaS, construída com **Next.js 15**, **React 19**, **TypeScript**, **TailwindCSS**, **Supabase** e design futurístico com tema dark nas cores da Xpress Solutions.

## ✨ Características Principais

- 🎨 **Design Futurístico** — Interface dark mode com efeitos de glow, gradientes e animações suaves
- 🔐 **Autenticação Segura** — Login com Supabase Auth + middleware de proteção de rotas
- 👥 **Sistema de Permissões** — 5 perfis de acesso (Admin, Financeiro, Marketing, Suporte, Visualizador)
- 📊 **Dashboard Interativo** — KPIs em tempo real com gráficos e estatísticas
- 💬 **Chat em Tempo Real** — Comunicação interna da equipe
- 🔔 **Notificações** — Sistema de alertas e avisos
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
| **Gastos da Empresa** | Controle de despesas operacionais (Admin only) | 💳 |
| **Senhas** | Gerenciador de credenciais e acessos (Admin only) | 🔑 |
| **Usuários** | Gerenciamento de usuários e permissões (Admin only) | ⚙️ |

---

## 👥 Perfis de Acesso

| Perfil | Permissões |
|---|---|
| **Admin** 👑 | Acesso total: Home, Produtos, Clientes, Marketing, Financeiro, Chat, Relatórios, Notificações, Atividades, Gastos da Empresa, Senhas, Usuários |
| **Financeiro** 💰 | Home, Produtos, Clientes, Financeiro, Relatórios, Notificações, Atividades |
| **Marketing** 🎯 | Home, Clientes, Marketing (Seguradoras), Notificações, Atividades |
| **Suporte** 🛟 | Home, Produtos, Clientes, Chat, Notificações, Atividades |
| **Visualizador** 👁️ | Home, Relatórios, Notificações |

> ⚠️ **Importante:** Somente o **Admin** tem acesso aos módulos de Gastos da Empresa, Senhas e Usuários. O sistema verifica as permissões em tempo real através do contexto de autenticação.

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

### Tema Dark do Dashboard

- Paleta principal: `#020817` (fundo) + `#0ea5e9` (accent sky)
- Sidebar com logo redondo em destaque e efeito glow
- Cards com bordas sutis e sombras internas
- Hover states com translate e scale suaves
- Ícones em tamanho consistente (16px) com animações

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
3. Crie o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
```

### 3. Criar as tabelas no banco

Execute os scripts SQL em ordem no **SQL Editor** do Supabase:

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
```

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
- [x] Middleware de proteção de rotas
- [x] Sistema de permissões granular por perfil
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
- [x] Sistema de contratos vinculados
- [x] Log de atividades com rastreamento
- [x] Notificações em tempo real

### ✅ Interface e UX
- [x] Design futurístico com tema dark
- [x] Animações suaves e transições
- [x] Sidebar responsiva com navegação inteligente
- [x] Componentes shadcn/ui customizados
- [x] Toast notifications com Sonner
- [x] Loading states e skeleton loaders

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

1. No menu lateral, clique em **Usuários** (somente Admin)
2. Clique no botão **+ Adicionar Usuário**
3. Preencha os dados:
   - Nome completo
   - Login (único)
   - Email
   - Senha temporária
   - Perfil de acesso (Admin, Financeiro, Marketing, Suporte, Visualizador)
4. O novo usuário poderá fazer login com as credenciais criadas

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
1. Verifique se você executou o script `setup-admin.js`:
   ```bash
   node scripts/setup-admin.js
   ```
2. Confirme que a tabela `profiles` foi criada
3. Verifique no Supabase Table Editor se o usuário admin existe

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

### Vercel (recomendado)

1. Faça push do projeto para o GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**

---

## � Preview

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

### Sidebar de Navegação
- Logo em destaque com efeito glow
- Menu com permissões dinâmicas
- Hover states animados
- Indicador visual de página ativa

---

## �🛠️ Tecnologias Utilizadas

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
│   │   └── page.tsx              → Tela de login futurística com animações
│   ├── setup/
│   │   └── page.tsx              → Setup inicial do sistema
│   ├── api/
│   │   ├── login/route.ts        → Endpoint de autenticação
│   │   ├── logout/route.ts       → Endpoint de logout
│   │   └── setup-admin/route.ts  → Criação do admin inicial
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
│       ├── senhas/page.tsx       → Gerenciador de senhas (Admin)
│       └── usuarios/page.tsx     → Gestão de usuários (Admin)
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
│   └── supabase/
│       ├── client.ts             → Cliente Supabase para client components
│       ├── server.ts             → Cliente Supabase para server components
│       └── middleware.ts         → Cliente para middleware
├── hooks/
│   ├── use-mobile.ts             → Hook para detectar mobile
│   └── use-toast.ts              → Hook para notificações toast
├── scripts/
│   ├── 001_profiles.sql          → Tabela de perfis
│   ├── 002_products.sql          → Tabela de produtos
│   ├── 003_clients.sql           → Tabela de clientes
│   ├── 004_contracts.sql         → Tabela de contratos
│   ├── 005_seguradoras.sql       → Tabela de leads
│   ├── 006_activity_log.sql      → Tabela de log
│   ├── 007_notifications.sql     → Tabela de notificações
│   ├── 008_chat_messages.sql     → Tabela de mensagens
│   ├── 009_seed.sql              → Dados de exemplo
│   └── setup-admin.js            → Script para criar admin
├── public/
│   └── images/
│       └── logo.png              → Logo da Xpress Solutions
├── middleware.ts                 → Middleware de proteção de rotas
├── components.json               → Configuração shadcn/ui
├── tailwind.config.ts            → Configuração Tailwind
├── tsconfig.json                 → Configuração TypeScript
└── package.json                  → Dependências do projeto
```

---

## 🚀 Sugestões de Melhorias Futuras

Funcionalidades que podem ser implementadas para enriquecer o sistema:

### 📅 Gestão e Automação
1. **Renovação automática de contratos** — Alertas de vencimento com 30/15/7 dias de antecedência
2. **Cronograma de tarefas** — Sistema de tasks com lembretes e atribuição
3. **Templates de email** — Editor de templates para comunicação com clientes
4. **Workflow de aprovações** — Fluxo de aprovação para descontos e propostas especiais

### 💳 Financeiro e Pagamentos
5. **Integração com gateways** — Stripe, Asaas, PagSeguro para cobranças automáticas
6. **Emissão de boletos** — Geração automática de boletos bancários
7. **Reconciliação bancária** — Import de OFX/CSV para conciliação
8. **Controle de comissões** — Cálculo e gestão de comissões de vendas

### 📊 Analytics e Relatórios
9. **Dashboard avançado** — Churn rate, LTV, MRR/ARR, CAC com histórico
10. **Previsão de receita** — Análise preditiva baseada em histórico
11. **Heatmaps de uso** — Análise de comportamento dos usuários
12. **Relatórios agendados** — Envio automático de relatórios por email

### 📱 Integrações e Comunicação
13. **API REST completa** — Endpoints para integrações externas
14. **Webhooks** — Notificações em tempo real de eventos do sistema
15. **WhatsApp Business API** — Envio de boletos e lembretes via WhatsApp
16. **Integração com CRM** — Sincronização com HubSpot, Pipedrive, RD Station

### 🔧 Ferramentas e Produtividade
17. **Módulo de propostas** — Geração de PDF personalizado com logo e dados
18. **Sistema de tickets** — Abertura e acompanhamento de suporte
19. **Base de conhecimento** — Wiki interna para documentação
20. **Importação em massa** — Upload CSV para importar clientes/contratos

### 📱 Mobile e Experiência
21. **App mobile** — React Native para iOS/Android
22. **PWA** — Progressive Web App com notificações push
23. **Modo offline** — Sincronização quando reconectar
24. **Assinatura digital** — Contratos assinados digitalmente

### 🔒 Segurança e Compliance
25. **Auditoria completa** — Histórico detalhado de todas as alterações
26. **2FA/MFA** — Autenticação de dois fatores
27. **Backup automático** — Backups diários com retenção configurável
28. **LGPD Compliance** — Ferramentas para conformidade com LGPD

---

## 📝 Licença

Este é um projeto proprietário da **Xpress Solutions**.

---

## 👨‍💻 Desenvolvido Por

**Xpress Solutions** — Soluções em Tecnologia e Gestão

---

*Xpress Solutions © 2026 — Todos os direitos reservados*
