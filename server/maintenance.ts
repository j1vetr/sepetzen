import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { verifyAccessToken } from "./jwt";

const SETTING_KEY = "maintenance_mode";
const CACHE_TTL_MS = 10_000;

let cachedValue: boolean | null = null;
let cachedAt = 0;

export async function getMaintenanceMode(): Promise<boolean> {
  const now = Date.now();
  if (cachedValue !== null && now - cachedAt < CACHE_TTL_MS) {
    return cachedValue;
  }
  try {
    const raw = await storage.getSiteSetting(SETTING_KEY);
    cachedValue = raw === "true";
    cachedAt = now;
    return cachedValue;
  } catch {
    return cachedValue ?? false;
  }
}

export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  await storage.setSiteSetting(SETTING_KEY, enabled ? "true" : "false");
  cachedValue = enabled;
  cachedAt = Date.now();
}

const ALLOW_PREFIXES = [
  "/admin",
  "/toov-admin",
  "/api/admin",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/uploads/",
  "/assets/",
  "/@vite",
  "/@react-refresh",
  "/@id",
  "/@fs",
  "/src/",
  "/node_modules/",
  "/__vite",
  "/favicon",
];

function isAllowed(path: string): boolean {
  for (const p of ALLOW_PREFIXES) {
    if (path === p || path.startsWith(p)) return true;
  }
  return false;
}

function hasValidAdminSession(req: Request): boolean {
  const token = (req as any).cookies?.access_token;
  if (!token) return false;
  const payload = verifyAccessToken(token);
  return Boolean(payload && payload.type === "admin" && payload.adminUserId);
}

export function maintenanceMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (isAllowed(req.path)) return next();
    if (hasValidAdminSession(req)) return next();

    const enabled = await getMaintenanceMode();
    if (!enabled) return next();

    res.status(503);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Retry-After", "3600");

    if (req.path.startsWith("/api/")) {
      return res.json({ maintenance: true, message: "Site bakımda" });
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(renderMaintenancePage());
  };
}

function renderMaintenancePage(): string {
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Bakım Modu - Polen Stone</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; padding: 0; }
  body {
    background: #ffffff;
    color: #111111;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    text-align: center;
  }
  .logo {
    max-width: 240px;
    width: 100%;
    height: auto;
    margin-bottom: 56px;
    display: block;
  }
  h1 {
    font-size: clamp(22px, 4vw, 30px);
    font-weight: 500;
    letter-spacing: -0.01em;
    color: #111111;
    margin: 0 0 16px 0;
    line-height: 1.35;
    max-width: 640px;
  }
  p {
    font-size: clamp(14px, 2.4vw, 16px);
    color: #6b7280;
    max-width: 520px;
    margin: 0;
    line-height: 1.6;
  }
  footer {
    padding: 32px 24px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .ig {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: #111111;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    padding: 10px 18px;
    border: 1px solid #e5e7eb;
    border-radius: 999px;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .ig:hover { background: #f9fafb; border-color: #d1d5db; }
  .ig svg { width: 18px; height: 18px; }
</style>
</head>
<body>
  <main>
    <img class="logo" src="/uploads/branding/polen-logo.png" alt="Polen Stone" />
    <h1>Yakında yeni tasarımımız ile sizlerle birlikteyiz.</h1>
    <p>Sitemiz şu anda bakımda. Daha iyi bir deneyim için çalışıyoruz, kısa süre içinde yeniden hizmetinizdeyiz.</p>
  </main>
  <footer>
    <a class="ig" href="https://www.instagram.com/polenstone" target="_blank" rel="noopener noreferrer">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
      <span>@polenstone</span>
    </a>
  </footer>
</body>
</html>`;
}
