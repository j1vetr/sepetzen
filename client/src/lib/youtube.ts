/** YouTube URL yardımcı fonksiyonları — sunucuya yük bindirmeden video gömme */

const YT_PATTERN = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/** YouTube URL'sinden video ID'sini çıkarır. Yoksa null döner. */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(YT_PATTERN);
  return m ? m[1] : null;
}

/** Verilen URL bir YouTube bağlantısı mı? */
export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

type ThumbQuality = 'default' | 'mq' | 'hq' | 'maxres';

/** YouTube CDN'inden thumbnail URL döner — sunucu yükü yok. */
export function getYouTubeThumbnail(url: string, quality: ThumbQuality = 'hq'): string {
  const id = extractYouTubeId(url);
  if (!id) return '';
  const q: Record<ThumbQuality, string> = {
    default: 'default',
    mq:      'mqdefault',
    hq:      'hqdefault',
    maxres:  'maxresdefault',
  };
  return `https://img.youtube.com/vi/${id}/${q[quality]}.jpg`;
}

/** YouTube embed URL'si (iframe için). Autoplay başlatmaz — kullanım yerinde &autoplay=1 ekleyin. */
export function getYouTubeEmbedUrl(url: string): string {
  const id = extractYouTubeId(url);
  if (!id) return '';
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}
