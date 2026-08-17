---
name: Admin 2FA (TOTP)
description: Admin girişindeki Google Authenticator 2FA'nın güvenlik kuralları ve otplib sürüm tuzağı
---

# Admin 2FA

- **otplib v13 API'yi tamamen değiştirdi** (`authenticator` export'u yok). Proje bilinen `authenticator` API'si için **otplib@12'ye sabitlendi** — sürüm yükseltirken login kırılır, dikkat.
- TOTP secret DB'de AES-256-GCM şifreli (aynı MARKETPLACE_ENCRYPTION_KEY altyapısı). Secret asla response/log'a düz yazılmaz (yalnız kurulum yanıtındaki manualKey).
- **Replay koruması**: kabul edilen TOTP zaman adımı `admin_users.totp_last_used_step`'e koşullu UPDATE ile yazılır; aynı/eski adım ikinci kez kabul edilmez. Kod doğrulaması her yerde "verify + consume" olmalı, çıplak verify kullanma.
- **Yedek kodlar**: bcrypt hash'li JSON; tüketim compare-and-swap'lı (`totp_backup_codes = beklenen` koşuluyla UPDATE) — eşzamanlı girişte aynı kod iki kez kullanılamaz.
- **Hız limiti** `auth_rate_limits` PostgreSQL tablosunda (key TEXT PK, failure_count, window_start, locked_until). Sunucu yeniden başlatmalarında ve çoklu-instance'ta sayaç korunur. `server/authRateLimit.ts` tüm fonksiyonları async — çağıran taraf `await` eklemek zorunda.
- Login akışı: şifre doğru + 2FA açık + kod yok → `{requiresTotp:true}` döner, cookie verilmez; istemci şifreyi state'te tutup kodla yeniden gönderir.
