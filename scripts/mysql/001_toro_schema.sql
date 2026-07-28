-- Toro Admin — MySQL 8+ (Locaweb DBaaS)
-- Banco: toro_xp @ toro_xp.mysql.dbaas.com.br

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Login do painel
CREATE TABLE IF NOT EXISTS dashboard_users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  role ENUM('admin', 'comercial') NOT NULL DEFAULT 'admin',
  display_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dashboard_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Produtos da loja
CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL DEFAULT 'shirt',
  slug VARCHAR(100) NULL,
  external_id VARCHAR(100) NULL,
  price DECIMAL(12,2) NULL,
  product_status VARCHAR(32) NOT NULL DEFAULT 'disponivel',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  metadata JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_products_slug (slug),
  UNIQUE KEY uq_products_external_id (external_id),
  KEY idx_products_status (product_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pedidos do site
CREATE TABLE IF NOT EXISTS toro_orders (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_number VARCHAR(64) NOT NULL,
  site_user_id VARCHAR(128) NULL,
  customer_name VARCHAR(255) NULL,
  customer_email VARCHAR(255) NULL,
  customer_phone VARCHAR(64) NULL,
  customer_cpf_cnpj VARCHAR(32) NULL,
  items JSON NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  shipping DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  coupon_code VARCHAR(64) NULL,
  address JSON NULL,
  payment_method VARCHAR(64) NULL,
  payment_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  order_status VARCHAR(32) NOT NULL DEFAULT 'pending_payment',
  tracking_code VARCHAR(128) NULL,
  status_history JSON NOT NULL,
  metadata JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_toro_orders_number (order_number),
  KEY idx_toro_orders_created (created_at),
  KEY idx_toro_orders_payment (payment_status),
  KEY idx_toro_orders_customer_email (customer_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Imagens enviadas pelo painel
CREATE TABLE IF NOT EXISTS toro_product_images (
  id CHAR(36) NOT NULL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  data MEDIUMBLOB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_toro_product_images_filename (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SAC / chamados
CREATE TABLE IF NOT EXISTS internal_support_tickets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  source_tool VARCHAR(64) NULL,
  client_identifier VARCHAR(255) NULL,
  client_email VARCHAR(255) NULL,
  subject VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(32) NOT NULL DEFAULT 'normal',
  external_user_id VARCHAR(128) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tickets_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Esqueci minha senha
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  username VARCHAR(100) NULL,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(16) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_reset_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log de atividades (opcional)
CREATE TABLE IF NOT EXISTS activity_log (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NULL,
  user_name VARCHAR(255) NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(64) NOT NULL DEFAULT '',
  entity_id CHAR(36) NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_activity_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Usuário admin Toro (senha: toro@101029)
INSERT INTO dashboard_users (id, username, password_hash, role, display_name, email)
VALUES (
  UUID(),
  'Toro',
  '8c5a17ecacc48131bdf1ba58a7fa974de370ed4c6d309f6509e831411736ceab',
  'admin',
  'Toro',
  NULL
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role = 'admin',
  display_name = 'Toro';
