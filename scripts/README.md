# Scripts SQL — Ordem e uso

## Comissões (página /dashboard/comissoes)

- **Banco necessário:** nenhuma tabela nova. A página usa a tabela **contracts** com a coluna **origem_comercial**.
- **Script obrigatório:** `019_contracts_origem_comercial.sql` (adiciona `origem_comercial` em `contracts`).
- **Opcionais:**
  - `027_comissoes_docs.sql` — só adiciona comentário na coluna (documentação).
  - `028_commission_bonus_optional.sql` — cria a tabela `commission_bonus_rules` para guardar o % de bônus no banco (senão o % é só o valor digitado na tela).

## Ordem sugerida (criação do projeto)

1. **Base:** 001 (profiles) → 002 (products) → 003 (clients) → 004 (contracts) → 005 (seguradoras) → 006 (activity_log) → 007 (notifications) → 008 (chat_messages).
2. **Atualizações em tabelas existentes:** 011 (clients/products/contracts) → 012 (origem_captacao) → 013 (status_lead) → 014 e 015 (contracts status/payment) → 016 (products status) → 019 (contracts origem_comercial) → 022 (activity_log user_name) → 023 (chat channels).
3. **NF-e e usuários:** 010 (nfe_documents) → 017 (admin_credentials) → 018 (dashboard_users).
4. **Esqueci minha senha:** 024 (email em dashboard_users + password_reset_codes) → 025 (username na busca) → 026 (opcional, user_reset_emails).
5. **Comissões:** 027 (opcional, docs) → 028 (opcional, commission_bonus_rules).
6. **NF-e PDF (Visualizar):** 029 (coluna `pdf_storage_path` em `nfe_documents`). Também é necessário criar o **bucket de Storage** `nfe-pdfs` no Supabase (Armazenar → + Balde novo, nome: `nfe-pdfs`, privado).
7. **Seeds/dados:** 009 (seed), 020 (seed NF-e), 021 (fix cliente/plano).

## Tabelas usadas pelo app

| Tabela | Script(s) | Módulo |
|--------|-----------|--------|
| profiles | 001 | Seguradoras (atribuição) |
| products | 002, 011, 016 | Produtos, contratos, NF-e |
| clients | 003, 011, 012, 013 | Clientes, contratos, NF-e |
| contracts | 004, 011, 014, 015, 019 | Financeiro, Produtos, Comissões, NF-e |
| seguradoras | 005 | Marketing (Seguradoras) |
| activity_log | 006, 022 | Atividades |
| notifications | 007 | Notificações |
| chat_messages | 008, 023 | Chat |
| nfe_documents | 010, 029 | NF-e (029 = coluna pdf_storage_path para Visualizar PDF) |
| admin_credentials | 017 | Configurações (Sistemas/Senhas) |
| dashboard_users | 018, 024, 025, 026 | Login, Usuários, Esqueci minha senha |
| password_reset_codes | 024 | Esqueci minha senha |
| commission_bonus_rules | 028 (opcional) | Comissões (% persistido) |

Nenhuma outra tabela é referenciada pelo código; se todos os scripts acima forem aplicados conforme a ordem, não falta nada no banco para os módulos atuais.
