-- Notificações: link para abrir tela relacionada (ex.: /dashboard/produtos/liticapro)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
