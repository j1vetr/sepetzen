-- Sepetzen admin kullanıcısı oluşturma / güncelleme
-- Kullanıcı adı: toov | Şifre: Toov1453@@

INSERT INTO admin_users (id, username, password, created_at)
VALUES (
  gen_random_uuid(),
  'toov',
  '$2b$12$HP9tFu2UMkLPTkzHs4EzsO45MhrvuMlrOO4J5Dpp7wE/gbI44cq5G',
  NOW()
)
ON CONFLICT (username)
DO UPDATE SET
  password = EXCLUDED.password;
