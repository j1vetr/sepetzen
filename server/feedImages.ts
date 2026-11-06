import sharp from "sharp";
import path from "path";
import fs from "fs";

/**
 * Google Merchant, 31 Ocak 2027'den itibaren 500x500 pikselden küçük ürün görsellerini reddeder.
 * Sitedeki görsellere dokunulmaz. Yalnızca beslemede, küçük yerel görseller için
 * kısa kenarı en az 500 piksel olan ayrı bir JPEG kopyası (/feed-image/...) sunulur.
 */

export const FEED_MIN_SIZE = 500;
const uploadsRoot = path.join(process.cwd(), "client", "public", "uploads");
const cacheDir = path.join(process.cwd(), ".cache", "feed-images");

const sizeCache = new Map<string, { mtime: number; ok: boolean }>();

function localUploadPath(urlPath: string): string | null {
  if (!urlPath.startsWith("/uploads/")) return null;
  const full = path.resolve(process.cwd(), "client", "public", "." + urlPath.split("?")[0]);
  if (!full.startsWith(uploadsRoot + path.sep)) return null;
  return fs.existsSync(full) ? full : null;
}

async function isBigEnough(full: string): Promise<boolean> {
  const mtime = fs.statSync(full).mtimeMs;
  const cached = sizeCache.get(full);
  if (cached && cached.mtime === mtime) return cached.ok;
  let ok = true;
  try {
    const meta = await sharp(full).metadata();
    ok = (meta.width ?? FEED_MIN_SIZE) >= FEED_MIN_SIZE && (meta.height ?? FEED_MIN_SIZE) >= FEED_MIN_SIZE;
  } catch {
    ok = true; // okunamayan dosyayı olduğu gibi bırak
  }
  sizeCache.set(full, { mtime, ok });
  return ok;
}

/** Besleme için güvenli görsel adresi: yeterince büyükse aynı adres, değilse büyütülmüş kopya adresi */
export async function feedSafeImageUrl(absoluteUrl: string, siteUrl: string): Promise<string> {
  if (!absoluteUrl) return absoluteUrl;
  let urlPath: string | null = null;
  if (absoluteUrl.startsWith(siteUrl + "/")) urlPath = absoluteUrl.slice(siteUrl.length);
  else if (absoluteUrl.startsWith("/")) urlPath = absoluteUrl;
  if (!urlPath) return absoluteUrl;
  const full = localUploadPath(urlPath);
  if (!full) return absoluteUrl;
  if (await isBigEnough(full)) return absoluteUrl;
  const rel = urlPath.split("?")[0].replace(/^\/uploads\//, "");
  return `${siteUrl}/feed-image/${rel}.jpg`;
}

/** /feed-image/<yol>.jpg isteği için dosya yolunu üretir (gerekirse oluşturur) */
export async function getFeedImageFile(relWithJpg: string): Promise<string | null> {
  if (!relWithJpg.endsWith(".jpg")) return null;
  const rel = relWithJpg.slice(0, -4);
  const source = localUploadPath("/uploads/" + rel);
  if (!source) return null;
  const outName = rel.replace(/[^A-Za-z0-9._-]/g, "_") + ".jpg";
  const out = path.join(cacheDir, outName);
  const srcMtime = fs.statSync(source).mtimeMs;
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= srcMtime) return out;
  fs.mkdirSync(cacheDir, { recursive: true });
  // Oranı koruyarak her iki kenar da en az 500 olacak şekilde büyüt, saydam alanı beyaza çevir
  await sharp(source)
    .flatten({ background: "#ffffff" })
    .resize({ width: FEED_MIN_SIZE, height: FEED_MIN_SIZE, fit: "outside", kernel: "lanczos3" })
    .jpeg({ quality: 92 })
    .toFile(out);
  return out;
}
