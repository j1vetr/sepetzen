/**
 * Admin kaynakli HTML iceriklerini kaydetmeden once temizler.
 * Sayfa/blog gibi tum depolanan HTML icerikleri bu suzgecten gecmelidir.
 */
export function sanitizeStoredHtml(rawHtml: string): string {
  return rawHtml
    .replace(/<\s*(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form)\b[^>]*\/?\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src)\s*=\s*(["'])\s*(?:javascript|vbscript|data):[\s\S]*?\2/gi, '');
}
