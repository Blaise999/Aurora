-- ADMIN LOGIN MIGRATION — Run if you already have schema.sql deployed
CREATE TABLE IF NOT EXISTS admin_users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username text NOT NULL UNIQUE, password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','superadmin','viewer')),
  is_active boolean DEFAULT true, last_login timestamptz,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_users_no_anon_read" ON admin_users FOR SELECT USING (false);
CREATE POLICY "admin_users_no_anon_write" ON admin_users FOR INSERT WITH CHECK (false);
INSERT INTO admin_users (username, password_hash, role, is_active)
VALUES ('admin', 'admin123', 'superadmin', true) ON CONFLICT (username) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('admin_password', 'admin123') ON CONFLICT (key) DO NOTHING;
