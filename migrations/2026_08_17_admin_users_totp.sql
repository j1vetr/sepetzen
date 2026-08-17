-- Admin girişi için iki adımlı doğrulama (TOTP / Google Authenticator)
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_secret text;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_backup_codes text;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_last_used_step integer;
