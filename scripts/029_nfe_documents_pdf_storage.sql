-- Caminho do PDF da NF-e no Storage (Supabase Storage bucket nfe-pdfs).
-- Criar o bucket "nfe-pdfs" em Armazenar > + Balde novo (privado).
-- O app faz upload do PDF na emissão (ou depois) e preenche esta coluna.

alter table public.nfe_documents
  add column if not exists pdf_storage_path text;

comment on column public.nfe_documents.pdf_storage_path is 'Caminho do arquivo PDF no bucket Storage nfe-pdfs (ex: {id}.pdf). Usado no botão Visualizar.';
