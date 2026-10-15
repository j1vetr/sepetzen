import { storage } from './storage';
import { DEFAULT_ADMIN_PATH, ADMIN_PATH_SETTING_KEY, normalizeAdminPath } from '@shared/adminPath';

/** Ayarlanmış panel yolu (başında eğik çizgi olmadan). Ayar yok veya geçersizse varsayılan. */
export async function getAdminPath(): Promise<string> {
  try {
    const raw = await storage.getSiteSetting(ADMIN_PATH_SETTING_KEY);
    return normalizeAdminPath(raw) ?? DEFAULT_ADMIN_PATH;
  } catch {
    return DEFAULT_ADMIN_PATH;
  }
}
