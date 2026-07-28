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

## Integração com o site Toro

| Sistema | URL |
|---------|-----|
| Loja online | https://toro-green.vercel.app |
| Painel admin | https://toro-admin.vercel.app |

### Fluxo

1. **Produtos** — catálogo espelhado do site (8 peças Elite Black)
2. **Compras** — feitas no site; no checkout o pedido é enviado ao painel via API
3. **Pedidos** — aparecem em `/dashboard/pedidos` com estoque atualizado

### Configurar integração

**No painel (Vercel → Environment Variables):**
```
SITE_API_KEY=seu-token-secreto
TORO_SITE_URL=https://toro-green.vercel.app
DATABASE_HOST=...
```

**No site (Vercel → Environment Variables):**
```
VITE_ADMIN_API_URL=https://toro-admin.vercel.app
VITE_SITE_API_KEY=seu-token-secreto   # mesmo valor do painel
```

Execute também o script SQL `scripts/036_toro_ecommerce.sql` no banco.

