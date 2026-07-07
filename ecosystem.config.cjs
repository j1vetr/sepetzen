module.exports = {
  apps: [
    {
      name: 'sepetzen',
      script: 'dist/index.cjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 1983,

        // PostgreSQL
        DATABASE_URL: 'postgresql://sepetzen:SepetzenDB2024!@localhost:5432/sepetzen_db',

        // Güvenlik anahtarları (değiştirme)
        JWT_SECRET: '03bc8a930454d6e3feb286a9230f9654b57a3db0ab52e4d3cb1245ce286106ad8b29cb9f34c1d250c67ecbf3f6e027ad',
        SESSION_SECRET: '93e1106585c73adc4d5db7e17ae3cb45b030de505721c5564312744b4f3e6c663814fefb502d87d487c87caff5916878',
        MARKETPLACE_ENCRYPTION_KEY: '83d76f202ad070b1442c5636ab6dc0e2cf200c263c5b7c6c7f34fceca1e88c5b',

        // Site URL
        PUBLIC_BASE_URL: 'https://sepetzen.com',
        SITE_URL: 'https://sepetzen.com',

        // Aşağıdakiler opsiyonel — gerekirse doldur
        OPENAI_API_KEY: '',
        TURNSTILE_SITE_KEY: '',
        TURNSTILE_SECRET_KEY: '',
        TRENDYOL_SANDBOX_BASE_URL: '',
      },
    },
  ],
};
