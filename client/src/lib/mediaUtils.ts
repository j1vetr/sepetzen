/** Medya yardımcıları — video/görsel seçimi */

const VIDEO_RE = /\.(mp4|webm|mov)(\?.*)?$/i;

export function isVideoUrl(url: string): boolean {
  return VIDEO_RE.test(url);
}

/**
 * Küçük önizlemeler için en uygun medya URL'sini döndürür.
 * Öncelik: ilk fotoğraf → yoksa ilk video → yoksa undefined.
 */
export function pickThumbUrl(images: string[] | undefined | null): string | undefined {
  if (!images?.length) return undefined;
  return images.find((u) => !VIDEO_RE.test(u)) ?? images[0];
}
