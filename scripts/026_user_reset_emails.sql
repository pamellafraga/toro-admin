-- E-mail que recebe o código de redefinição de senha (configurável pelo admin no painel Usuários)
-- Valores iniciais designados; apenas admins podem alterar no painel.
update public.dashboard_users set email = 'rcf.fraga@gmail.com' where lower(trim(username)) = 'roberto';
update public.dashboard_users set email = 'ti.pamellafraga@gmail.com' where lower(trim(username)) = 'pamella';
update public.dashboard_users set email = 'rcf.fraga@gmail.com' where lower(trim(username)) = 'stefanie';
update public.dashboard_users set email = 'rcf.fraga@gmail.com' where lower(trim(username)) = 'lisete';
update public.dashboard_users set email = 'rcf.fraga@gmail.com' where lower(trim(username)) = 'admin';
