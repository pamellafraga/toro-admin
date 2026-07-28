# Toro Admin

Painel administrativo da **Toro** — loja de moda fitness.

Projeto **independe** do dashboard Xpress Solutions. Alterações aqui não afetam o repositório original.

## Login padrão

| Campo | Valor |
|-------|-------|
| Usuário | `Toro` |
| Senha | `toro@101029` |

## Paleta de cores

| Nome | Hex |
|------|-----|
| Off white | `#FDFCF8` |
| Ivory | `#F3F0E9` |
| Nude | `#E3DBCC` |
| Obsidian | `#101010` |

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

Configure as variáveis em `.env` (veja `.env.example`).

## Banco de dados

Execute os scripts SQL em `scripts/` na ordem numérica. O usuário admin é criado em `018_dashboard_users.sql`.

## Deploy

Hospedagem recomendada: [Vercel](https://vercel.com). Repositório: `https://github.com/pamellafraga/toro-admin`
