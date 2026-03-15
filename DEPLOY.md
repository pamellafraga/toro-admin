# Como hospedar o dashboard (e mantê-lo invisível)

Este painel **não** deve aparecer no site público xpresssolutions.com.br nem em buscas. Segue como publicar para outro adm acessar, sem expor o link.

---

## Domínio na Locaweb + dashboard na Vercel

O **domínio** (xpresssolutions.com.br) continua na **Locaweb**. O **site público** também continua onde está hoje (Locaweb ou onde estiver). Só o **dashboard** é publicado na **Vercel**.

- **Locaweb:** você não mexe no que já existe (site principal, e-mail, etc.). Só vai **criar um registro DNS** para um subdomínio (ex.: `adm`) apontando para a Vercel.
- **Vercel:** hospeda apenas este projeto (o painel administrativo). Você faz o deploy do repositório do dashboard e, na Vercel, adiciona o domínio `adm.xpresssolutions.com.br`. A Vercel mostra para onde apontar o DNS.
- Quem acessa **xpresssolutions.com.br** vê o site normal. Quem acessa **adm.xpresssolutions.com.br** (só quem tiver o link) vê o painel.

Nada do que está na Locaweb hoje precisa ser migrado; só se adiciona um subdomínio novo que “aponta” para a Vercel.

---

## 1. Onde hospedar

Recomendado: **Vercel** (já usa Next.js e Analytics no projeto).

- Crie uma conta em [vercel.com](https://vercel.com) e conecte o repositório do dashboard.
- Ou faça deploy manual: na pasta do projeto, instale a CLI (`npm i -g vercel`) e rode `vercel`.

---

## 2. URL “invisível”: use um subdomínio

**Não** use o mesmo caminho do site principal. Use um **subdomínio** só para o painel, por exemplo:

- `adm.xpresssolutions.com.br`
- `painel.xpresssolutions.com.br`
- `dashboard.xpresssolutions.com.br`

Assim:

- O site público continua em **xpresssolutions.com.br** (sem link para o painel).
- O painel fica em **adm.xpresssolutions.com.br** (ou o nome que escolher).
- Quem não souber o endereço não encontra pelo domínio principal.

**Na Vercel:** em *Project Settings → Domains*, adicione o subdomínio (ex.: `adm.xpresssolutions.com.br`). A Vercel vai mostrar o valor do CNAME (geralmente `cname.vercel-dns.com`).

**Na Locaweb:** no painel de DNS do domínio xpresssolutions.com.br, crie **apenas** um registro **CNAME** para o subdomínio do painel, por exemplo:
- **Nome/host:** `adm` (ou `painel`, ou `dashboard`)
- **Destino/aponta para:** o valor que a Vercel indicar (ex.: `cname.vercel-dns.com`)

O site principal (www, raiz etc.) continua configurado como está; você só adiciona esse CNAME do subdomínio.

---

## 3. Variáveis de ambiente

No painel da Vercel: *Project → Settings → Environment Variables*. Use os mesmos nomes do `.env.example` (e do seu `.env.local`), por exemplo:

| Variável | Obrigatório | Observação |
|----------|-------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Chave anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role (secret) do Supabase |

Opcionais (conforme uso): `NFE_API_URL`, `NFE_API_KEY`, variáveis `NFSENACIONAL_*`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

Depois de salvar, faça um novo deploy para as variáveis valerem.

---

## 4. O que já deixa o painel “invisível” no código

- **robots meta:** Todas as páginas têm `noindex, nofollow` (incluindo Googlebot).
- **robots.txt:** O app expõe `/robots.txt` com `Disallow: /` para todos os user-agents.
- **Cabeçalho HTTP:** Todas as respostas levam `X-Robots-Tag: noindex, nofollow`.

Assim, mesmo que alguém ache o link, os buscadores não indexam.

---

## 5. O que você deve fazer fora do código

1. **Não** colocar link para o painel no site xpresssolutions.com.br (menu, rodapé, etc.).
2. **Não** cadastrar a URL do painel (ex.: adm.xpresssolutions.com.br) no Google Search Console (e nem em outras ferramentas de indexação).
3. Enviar o link do painel **só por canal seguro** (ex.: e-mail, WhatsApp) para os admins que precisam acessar.
4. No **Supabase** (se for usar o botão Visualizar PDF da NF-e): em *Armazenar* criar o bucket **nfe-pdfs** (privado) e rodar o script `029_nfe_documents_pdf_storage.sql`. Ver README.
5. (Opcional) Na Vercel: *Project Settings → Deployment Protection* pode ativar **Vercel Authentication** ou **Password** para mais uma camada antes da tela de login do próprio dashboard.

---

## 6. O que digitar em cada ponto (Vercel + Locaweb)

### Na tela “Novo projeto” da Vercel

| Onde | O que digitar / o que fazer |
|------|-----------------------------|
| **Importando do GitHub** | Deixe como está (repositório e branch **main**). Se o app Next.js estiver **dentro de uma pasta** no repositório (ex.: `xpress-dashboard`), clique em **Editar** ao lado do diretório raiz. |
| **Diretório raiz (Root Directory)** | Se o código do dashboard está na **raiz** do repositório: deixe **`./`**. Se está numa pasta (ex.: `xpress-dashboard`): coloque **`xpress-dashboard`** (só o nome da pasta). |
| **Nome do projeto** | Pode deixar **`dashboard-xpresssolutions`** ou usar **`xpress-dashboard`** — é só um nome interno. |
| **Framework** | Deixe **Next.js** (já vem assim). |
| **Comando de construção** | Deixe o padrão: **`npm run build`** ou **`next build`**. |
| **Diretório de saída** | Deixe **Padrão do Next.js**. |
| **Comando de instalação** | Deixe **`npm install`** (ou o que você usa: yarn/pnpm). |
| **Variáveis de ambiente** | **Apague** a variável de exemplo (EXEMPLO_NOME). Clique em **+ Adicionar mais** e crie **uma linha para cada** variável abaixo. Em **Chave** coloque o nome; em **Valor** coloque o valor (os mesmos do seu `.env.local`). |

**Variáveis que você deve adicionar (Chave = nome, Valor = o que está no seu .env.local):**

| Chave | Valor (exemplo – use os seus de verdade) |
|-------|----------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://seu-projeto.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a chave **anon** do Supabase (longa) |
| `SUPABASE_SERVICE_ROLE_KEY` | a chave **service_role** do Supabase (secret) |

Se usar NF-e/Resend, adicione também as chaves correspondentes (NFE_API_URL, NFE_API_KEY, RESEND_API_KEY, etc.).

Depois clique em **Implantar**.

---

### Depois do primeiro deploy: adicionar o domínio na Vercel

1. No projeto, vá em **Settings** → **Domains**.
2. Em **Domain**, digite: **`adm.xpresssolutions.com.br`** (ou `painel.xpresssolutions.com.br`).
3. Clique em **Add**.
4. A Vercel vai mostrar algo como: “Adicione um registro CNAME com o valor **`cname.vercel-dns.com`**” (o valor exato aparece na tela — anote).

---

### Na Locaweb (DNS do domínio)

1. Entre no painel da Locaweb e abra a **gestão de DNS** do domínio **xpresssolutions.com.br**.
2. Crie um **novo registro** do tipo **CNAME**.
3. Preencha assim:

| Campo (nome pode variar na Locaweb) | O que digitar |
|------------------------------------|----------------|
| **Nome / Host / Subdomínio**       | **`adm`** (só isso; não coloque .xpresssolutions.com.br) |
| **Destino / Aponta para / Valor**  | **`cname.vercel-dns.com`** (ou o valor que a Vercel mostrou em Domains) |
| **TTL** (se perguntar)             | Pode deixar o padrão (ex.: 3600). |

4. Salve. A propagação pode levar alguns minutos (até 1–2 horas em casos raros).

---

### Testar

Quando o DNS propagar, abra no navegador: **https://adm.xpresssolutions.com.br**  
Deve aparecer a tela de login do dashboard. Aí é só entrar com usuário e senha do painel.

---

## 7. Resumo rápido

1. Conectar o repositório na Vercel e fazer o primeiro deploy.
2. Configurar o subdomínio (ex.: `adm.xpresssolutions.com.br`) no DNS e na Vercel.
3. Preencher as variáveis de ambiente (Supabase e outras que usar).
4. Não divulgar a URL em lugar público e não indexar no Google.
5. Compartilhar o link apenas com quem precisa acessar o painel.

Com isso, o dashboard fica hospedado e utilizável por outro adm, sem ficar visível ou vinculado ao site público e sem aparecer em busca.
