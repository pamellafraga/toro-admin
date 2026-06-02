# PostgreSQL Locaweb — Xpress Dashboard

## 1. Criar banco na Locaweb

No painel Locaweb, crie o banco PostgreSQL:

| Campo    | Valor            |
|----------|------------------|
| Banco    | `admxpress`      |
| Usuário  | `admxpress`      |
| Senha    | `Xpress@101029`  |
| Host     | *(informe quando tiver)* |
| Porta    | `5432` (padrão)  |

Libere o IP do servidor onde o Next.js roda (Vercel/Locaweb) nas regras de firewall do PostgreSQL.

## 2. Executar o schema

No **phpPgAdmin** ou **psql**, conecte ao banco `admxpress` e execute:

```
scripts/locaweb/001_schema.sql
```

Isso cria todas as tabelas e os usuários iniciais do login.

## 3. Configurar `.env.local`

```env
DATABASE_HOST=seu-servidor.locaweb.com.br
DATABASE_PORT=5432
DATABASE_NAME=admxpress
DATABASE_USER=admxpress
DATABASE_PASSWORD=Xpress@101029
DATABASE_SSL=false
```

Reinicie o servidor (`pnpm dev`) após salvar.

## 4. Testar login

- **Login:** `Pamella`
- **Senha:** `Xpress@101029`

## Estrutura da API (organizada)

Todas as rotas usam PostgreSQL via `lib/db/repositories/`. Mapa completo em `lib/api/routes.ts`.

| Grupo        | Rotas                          |
|--------------|--------------------------------|
| Auth         | `/api/login`, `/api/logout`, `/api/auth/*` |
| Usuários     | `/api/users`, `/api/users/:id` |
| Admin        | `/api/admin/credentials`       |
| Clientes     | `/api/clients/search`          |
| Contratos    | `/api/contracts/register`      |
| Produtos     | `/api/products/:slug/*`        |
| NF-e         | `/api/nfe/*`                   |
| Chamados     | `/api/chamados/*`              |
| Geo          | `/api/geo/*`                   |
| Tenant       | `/api/tenant-config/:slug`     |

## PDFs de NF-e

Armazenados localmente em `storage/nfe-pdfs/` (configurável via `NFE_PDF_DIR`).

## Próximo passo (telas do dashboard)

As páginas internas (`/dashboard/*`) ainda leem dados via Supabase client no browser.
Na fase seguinte, migraremos cada módulo para consumir as APIs PostgreSQL.
