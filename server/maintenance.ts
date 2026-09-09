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

export interface MaintenanceContent {
  title: string;
  logoUrl: string;
  heading: string;
  description: string;
  instagramHandle: string;
}

const DEFAULT_CONTENT: MaintenanceContent = {
  title: "Bakım Modu - Sepetzen",
  logoUrl: "",
  heading: "Yakında yeni tasarımımız ile sizlerle birlikteyiz.",
  description: "Sitemiz şu anda bakımda. Daha iyi bir deneyim için çalışıyoruz, kısa süre içinde yeniden hizmetinizdeyiz.",
  instagramHandle: "",
};

export async function getMaintenanceContent(): Promise<MaintenanceContent> {
  try {
    const [title, logoUrl, heading, description, instagramHandle] = await Promise.all([
      storage.getSiteSetting("maintenance_title"),
      storage.getSiteSetting("maintenance_logo_url"),
      storage.getSiteSetting("maintenance_heading"),
      storage.getSiteSetting("maintenance_description"),
      storage.getSiteSetting("maintenance_instagram"),
    ]);
    return {
      title: title || DEFAULT_CONTENT.title,
      logoUrl: logoUrl || DEFAULT_CONTENT.logoUrl,
      heading: heading || DEFAULT_CONTENT.heading,
      description: description || DEFAULT_CONTENT.description,
      instagramHandle: instagramHandle || DEFAULT_CONTENT.instagramHandle,
    };
  } catch {
    return DEFAULT_CONTENT;
  }

}

export async function setMaintenanceContent(content: Partial<MaintenanceContent>): Promise<void> {
  const ops: Promise<void>[] = [];
  if (content.title !== undefined)           ops.push(storage.setSiteSetting("maintenance_title",       content.title));
  if (content.logoUrl !== undefined)         ops.push(storage.setSiteSetting("maintenance_logo_url",    content.logoUrl));
  if (content.heading !== undefined)         ops.push(storage.setSiteSetting("maintenance_heading",     content.heading));
  if (content.description !== undefined)     ops.push(storage.setSiteSetting("maintenance_description", content.description));
  if (content.instagramHandle !== undefined) ops.push(storage.setSiteSetting("maintenance_instagram",   content.instagramHandle));
  await Promise.all(ops);
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
    const content = await getMaintenanceContent();
    return res.send(renderMaintenancePage(content));
  };
}

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderMaintenancePage(c: MaintenanceContent): string {
  const igHandle = c.instagramHandle.replace(/^@/, "").trim();
  const igUrl = igHandle ? `https://www.instagram.com/${igHandle}` : "";
  const logoHtml = c.logoUrl
    ? `<img class="logo" src="${esc(c.logoUrl)}" alt="${esc(c.title)}" />`
    : "";
  const footerHtml = igHandle
    ? `<footer>
    <a class="ig" href="${esc(igUrl)}" target="_blank" rel="noopener noreferrer">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
      <span>@${esc(igHandle)}</span>
    </a>
  </footer>`
    : "";

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>${esc(c.title)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; padding: 0; }
  body {
    background: #0a0a0a;
    color: #f5f5f5;
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
    max-width: 200px;
    width: 100%;
    height: auto;
    margin-bottom: 48px;
    display: block;
  }
  h1 {
    font-size: clamp(20px, 3.5vw, 28px);
    font-weight: 500;
    letter-spacing: -0.01em;
    color: #f5f5f5;
    margin: 0 0 16px 0;
    line-height: 1.35;
    max-width: 640px;
  }
  p {
    font-size: clamp(14px, 2.2vw, 16px);
    color: rgba(255,255,255,0.45);
    max-width: 480px;
    margin: 0;
    line-height: 1.65;
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
    color: rgba(255,255,255,0.65);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    padding: 10px 18px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 999px;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .ig:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.22); }
  .ig svg { width: 18px; height: 18px; }
</style>
</head>
<body>
  <main>
    ${logoHtml}
    <h1>${esc(c.heading)}</h1>
    <p>${esc(c.description)}</p>
  </main>
  ${footerHtml}
</body>
</html>`;
}
