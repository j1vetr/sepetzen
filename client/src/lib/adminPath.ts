import { DEFAULT_ADMIN_PATH } from '@shared/adminPath';

let base = `/${DEFAULT_ADMIN_PATH}`;

/** Uygulama açılmadan önce sunucudan panel yolunu okur. Başarısızsa varsayılan kalır. */
export async function loadAdminPath(): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch('/api/admin-path', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return;
    const data = (await res.json()) as { path?: string };
    if (data.path) base = `/${data.path}`;
  } catch {
    // varsayılan yol kullanılır
  }
}

export function adminBase(): string {
  return base;
}

/** adminUrl() -> /panel, adminUrl('/orders/1') -> /panel/orders/1, adminUrl('?tab=x') -> /panel?tab=x */
export function adminUrl(sub = ''): string {
  return `${base}${sub}`;
}

export function isAdminPath(location: string): boolean {
  return location === base || location.startsWith(`${base}/`) || location.startsWith(`${base}?`);
}
