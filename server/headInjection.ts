/**
 * Yönetici panelinden ayarlanan Google Tag kodunu ve özel CSS'i
 * index.html'in </head> etiketinden önce enjekte eder.
 *
 * 60 saniyelik bellek önbelleği — ayarlar kaydedilince otomatik sıfırlanır.
 */

import { storage } from "./storage";

let _cached: string | null = null;
let _cachedAt = 0;
const TTL_MS = 60_000;

/** Önbelleği sıfırla (ayarlar kaydedilince çağrılır). */
export function invalidateHeadInjectionCache() {
  _cachedAt = 0;
}

/** Enjekte edilecek ham HTML'i döner (boş olabilir). */
export async function getHeadInjection(): Promise<string> {
  const now = Date.now();
  if (_cached !== null && now - _cachedAt < TTL_MS) return _cached;

  const [rawTag, rawCss] = await Promise.all([
    storage.getSiteSetting("google_tag_code").catch(() => null),
    storage.getSiteSetting("custom_css").catch(() => null),
  ]);

  let html = "";

  const tag = rawTag?.trim();
  if (tag) {
    // Sadece ölçüm ID'si girilmişse (G-XXXXXXXX veya GTM-XXXXXXXX) standart snippet oluştur
    if (/^G-[A-Z0-9]+$/i.test(tag)) {
      html +=
        `<script async src="https://www.googletagmanager.com/gtag/js?id=${tag}"></script>\n` +
        `<script>window.dataLayer=window.dataLayer||[];` +
        `function gtag(){dataLayer.push(arguments)}` +
        `gtag('js',new Date());gtag('config','${tag}');</script>\n`;
    } else if (/^GTM-[A-Z0-9]+$/i.test(tag)) {
      html +=
        `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':` +
        `new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],` +
        `j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;` +
        `j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;` +
        `f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${tag}');</script>\n`;
    } else {
      // Tam snippet veya başka bir kod — olduğu gibi ekle
      html += tag + "\n";
    }
  }

  const css = rawCss?.trim();
  if (css) {
    html += `<style id="custom-site-css">\n${css}\n</style>\n`;
  }

  _cached = html;
  _cachedAt = now;
  return html;
}

/** Enjeksiyonu </head> kapanış etiketinden önce yerleştirir. */
export function injectIntoHead(template: string, injection: string): string {
  if (!injection) return template;
  return template.replace("</head>", `${injection}</head>`);
}
