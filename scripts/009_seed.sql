-- Seed products
insert into public.products (name, description, icon) values
  ('Gestao de Apolices de Garantias', 'Sistema web completo de gestao para empresas de garantias, com controle financeiro, contratos, relatorios, dashboards em tempo real, multiusuario, banco de dados na nuvem e assinatura mensal.', 'shield-check'),
  ('Gestao de Contratos', 'Plataforma completa para gerenciamento de contratos empresariais com alertas automaticos, controle de vencimentos, historico completo e integracoes avancadas.', 'file-text'),
  ('Xpress Chat', 'Chatbot inteligente para WhatsApp onde equipes podem administrar clientes, repassar contatos internamente com notas e acompanhar atendimentos em tempo real.', 'message-circle')
on conflict do nothing;
