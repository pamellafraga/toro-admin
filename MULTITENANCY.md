# Multi-tenancy — Próximos passos

## 1. Criar um tenant de teste no banco da Dashboard

No **SQL Editor** do Supabase **desta** dashboard:

```sql
INSERT INTO tenants (nome, slug, ferramenta, ativo)
VALUES ('Empresa Teste', 'empresa-ativa', 'apolicer', true);
```

Depois pegue o `id` do tenant inserido e cadastre o banco:

```sql
INSERT INTO tenant_databases (tenant_id, supabase_url, supabase_anon)
VALUES (
  '<TENANT_ID_AQUI>',
  'https://SEU-PROJETO.supabase.co',
  'eyJhbGciOiJIUzI1NiI...'
);
```

- **Opção A (teste):** Use o mesmo projeto do dashboard — `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` do `.env.local` em `supabase_url` e `supabase_anon`.
- **Opção B:** Crie um novo projeto Supabase para o tenant e use a URL e a chave anon desse projeto.

---

## 2. Criar um usuário para login no Supabase do tenant

No projeto Supabase usado em `tenant_databases` (do dashboard ou do tenant):

- **Authentication → Users → Add user → Create new user**
- E-mail e senha (ex.: `pamella@teste.com` e uma senha forte)
- Esse usuário será usado para login na ferramenta Apolicer.

---

## 3. Testar a API (opcional)

No **Postman** (ou similar):

- **Método:** GET  
- **URL:** `http://localhost:3000/api/tenant-config/empresa-ativa`  
  (slug na **URL**; troque `empresa-ativa` por um slug que exista em `tenants`.)
- **Header:** `Authorization: Bearer SECRETA-API-APOLICER`  
  (o valor deve ser o mesmo de `CENTRAL_API_TOKEN` no `.env.local` da dashboard.)

**Resposta esperada (200):**  
`{ "tenantId", "slug", "supabaseUrl", "supabaseAnonKey" }`

**Se der 401:** confira se no `.env.local` está `CENTRAL_API_TOKEN=SECRETA-API-APOLICER` (com o `=` e sem aspas em volta do valor).

---

## 4. Testar login na ferramenta Apolicer

1. Abra `http://localhost:3001/login` (ou a URL em que a ferramenta roda).
2. **Código da empresa:** informe o **slug** do tenant (ex.: `empresa-ativa`).
3. **E-mail e senha:** o usuário criado no passo 2.
4. Clique em **ENTRAR**.

Se o tenant estiver ativo, `tenant_databases` preenchido e o token da ferramenta igual ao da dashboard, o login deve usar o Supabase do tenant e entrar na aplicação.

---

## Resumindo

Criar o tenant no banco → criar o usuário no Supabase do tenant → (opcional) testar a API em **GET /api/tenant-config/empresa-ativa** → testar o login na ferramenta com esse slug e usuário.
